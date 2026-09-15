"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { assessment, property, siteConcept, infrastructureAsset } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { runJob } from "@/lib/ai/orchestrator"
import {
  computeRoboReadyScore,
  computePremiumScore,
  type AssessmentOutput,
  type PremiumAssessmentOutput,
  type SiteConceptOutput,
  type InfrastructurePlanOutput,
} from "@/lib/ai/schemas"
import { getIntake } from "@/app/actions/intake"
import { getPurchasedTier } from "@/app/actions/payments"
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

    // The platform owns the arithmetic: clamp each category to its cap and sum
    // to a deterministic 0-100 total, so the RoboReady Score always equals the
    // sum of its parts regardless of what the model reports for the overall.
    const { total, clamped } = computeRoboReadyScore(assess.output.scoreBreakdown ?? [])
    const capByCategory = new Map(clamped.map((c) => [c.category, c]))
    const persistedBreakdown = (assess.output.scoreBreakdown ?? []).map((b) => ({
      ...b,
      points: capByCategory.get(b.category)?.points ?? Math.round(Number(b.points) || 0),
      max: capByCategory.get(b.category)?.max ?? undefined,
    }))

    // Premium tier: layer the multi-domain roll-up on top of the canonical
    // robotaxi score. Domain 1 (arrival) is derived from `total`; domains 2-5
    // are graded by the premium-assessment job. A premium hiccup must not lose
    // the base assessment, so it is isolated and best-effort.
    const purchasedTier = await getPurchasedTier(propertyId)
    let premiumBreakdown: Record<string, unknown> | null = null
    if (purchasedTier === "premium") {
      try {
        const premium = await runJob<typeof context, PremiumAssessmentOutput>({
          ctx,
          propertyId,
          employeeSlug: "readiness-analyst",
          jobType: "premium-assessment",
          input: context,
        })
        const scores = premium.output.keyPointScores ?? []
        const rolled = computePremiumScore({
          arrivalScore100: total,
          keyPoints: scores.map((k) => ({ keyPointId: k.keyPointId, points: k.points })),
        })
        const textById = new Map(scores.map((k) => [k.keyPointId as string, k]))
        premiumBreakdown = {
          overall: rolled.overall,
          domains: rolled.domains,
          keyPoints: rolled.keyPoints.map((kp) => ({
            ...kp,
            explanation: textById.get(kp.keyPointId)?.explanation ?? "",
            evidence: textById.get(kp.keyPointId)?.evidence ?? [],
            confidence: textById.get(kp.keyPointId)?.confidence ?? "low",
            recommendations: textById.get(kp.keyPointId)?.recommendations ?? [],
          })),
          domainSummaries: premium.output.domainSummaries ?? [],
          summary: premium.output.summary ?? "",
          generatedAt: new Date().toISOString(),
        }
      } catch (err) {
        console.log("[v0] premium roll-up failed (base assessment kept):", (err as Error).message)
      }
    }

    const prevVersion = (await getLatestAssessment(propertyId))?.version ?? 0
    const assessmentId = crypto.randomUUID()
    await db.insert(assessment).values({
      id: assessmentId,
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      aiJobId: assess.jobId,
      status: "completed",
      roboReadyScore: total,
      scoreBreakdown: persistedBreakdown,
      premiumBreakdown,
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
      pickupZones: concept.output.pickupZones ?? [],
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
      metadata: { score: total },
    })

    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/activity")
    return { ok: true, data: { score: total } }
  } catch (err) {
    console.log("[v0] runAssessment failed:", (err as Error).message)
    return { ok: false, error: "The assessment could not be completed. Please try again." }
  }
}
