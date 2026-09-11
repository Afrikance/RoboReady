"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { assessment, property, siteConcept, infrastructureAsset } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { runJob } from "@/lib/ai/orchestrator"
import type {
  AssessmentOutput,
  SiteConceptOutput,
  InfrastructurePlanOutput,
} from "@/lib/ai/schemas"
import { getIntake } from "@/app/actions/intake"
import type { ActionResult } from "@/app/actions/properties"

export async function getLatestAssessment(propertyId: string) {
  const ctx = await requireOrgContext()
  const rows = await db
    .select()
    .from(assessment)
    .where(and(eq(assessment.propertyId, propertyId), eq(assessment.organizationId, ctx.organizationId)))
    .orderBy(desc(assessment.version))
    .limit(1)
  return rows[0] ?? null
}

export async function getLatestConcept(propertyId: string) {
  const ctx = await requireOrgContext()
  const rows = await db
    .select()
    .from(siteConcept)
    .where(and(eq(siteConcept.propertyId, propertyId), eq(siteConcept.organizationId, ctx.organizationId)))
    .orderBy(desc(siteConcept.version))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Runs the full readiness pipeline for a property:
 *   Ada (analyst) → RoboReady Score + findings
 *   Vitra (designer) → site concept
 *   Cir (planner) → infrastructure plan (awaits approval)
 * Each step is a traceable ai_job. The score/concept are persisted; the plan's
 * proposed assets are written for later review on the map.
 */
export async function runAssessment(propertyId: string): Promise<ActionResult<{ score: number }>> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to run assessments." }
  }

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  const intake = await getIntake(propertyId)

  const context = {
    property: {
      name: prop.name,
      type: prop.propertyType,
      squareFootage: prop.squareFootage,
      floors: prop.floors,
      yearBuilt: prop.yearBuilt,
      location: [prop.city, prop.region, prop.country].filter(Boolean).join(", "),
    },
    intakeAnswers: (intake?.answers as Record<string, unknown>) ?? {},
  }

  try {
    // Step 1 — readiness assessment + score
    const assess = await runJob<typeof context, AssessmentOutput>({
      ctx,
      propertyId,
      employeeSlug: "readiness-analyst",
      jobType: "assessment",
      input: context,
    })

    const prevVersion = (await getLatestAssessment(propertyId))?.version ?? 0
    const assessmentId = crypto.randomUUID()
    await db.insert(assessment).values({
      id: assessmentId,
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      aiJobId: assess.jobId,
      status: "completed",
      roboReadyScore: assess.output.roboReadyScore,
      scoreBreakdown: assess.output.scoreBreakdown,
      findings: assess.output.findings,
      recommendations: assess.output.recommendations,
      summary: assess.output.summary,
      version: prevVersion + 1,
    })

    // Step 2 — site concept
    const concept = await runJob<Record<string, unknown>, SiteConceptOutput>({
      ctx,
      propertyId,
      employeeSlug: "site-designer",
      jobType: "site-concept",
      input: { ...context, assessment: assess.output },
    })

    const prevConceptVersion = (await getLatestConcept(propertyId))?.version ?? 0
    await db.insert(siteConcept).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      propertyId,
      assessmentId,
      createdByUserId: ctx.user.id,
      aiJobId: concept.jobId,
      title: concept.output.title,
      narrative: concept.output.narrative,
      zones: concept.output.zones,
      version: prevConceptVersion + 1,
      status: "draft",
    })

    // Step 3 — infrastructure plan (Cir requires approval; assets written as proposed)
    const plan = await runJob<Record<string, unknown>, InfrastructurePlanOutput>({
      ctx,
      propertyId,
      employeeSlug: "infrastructure-planner",
      jobType: "infrastructure-plan",
      input: { ...context, assessment: assess.output, concept: concept.output },
    })

    for (const a of plan.output.assets.slice(0, 30)) {
      await db.insert(infrastructureAsset).values({
        id: crypto.randomUUID(),
        organizationId: ctx.organizationId,
        propertyId,
        createdByUserId: ctx.user.id,
        assetType: a.assetType,
        label: a.label,
        status: "proposed",
        quantity: Math.max(1, Math.round(a.quantity)),
        unitCost: a.unitCost != null ? String(a.unitCost) : null,
        specs: { rationale: a.rationale },
      })
    }

    await db
      .update(property)
      .set({ status: "assessed", updatedAt: new Date() })
      .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "assessment.completed",
      entityType: "assessment",
      entityId: assessmentId,
      metadata: { score: assess.output.roboReadyScore },
    })

    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/activity")
    return { ok: true, data: { score: assess.output.roboReadyScore } }
  } catch (err) {
    console.log("[v0] runAssessment failed:", (err as Error).message)
    return { ok: false, error: "The assessment could not be completed. Please try again." }
  }
}
