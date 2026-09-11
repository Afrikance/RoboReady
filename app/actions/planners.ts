"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  property,
  wayfindingPlan,
  accessibilityAudit,
  evPlan,
  infrastructureAsset,
} from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext, type OrgContext } from "@/lib/tenancy"
import { runJob } from "@/lib/ai/orchestrator"
import type { WayfindingOutput, AccessibilityOutput, EvPlanOutput } from "@/lib/ai/schemas"
import { getIntake } from "@/app/actions/intake"
import { getLatestAssessment } from "@/app/actions/assessment"
import type { ActionResult } from "@/app/actions/properties"

/** Loads the shared property + intake + assessment context every planner needs. */
async function loadPropertyContext(ctx: OrgContext, propertyId: string) {
  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return null

  const [intake, assessment] = await Promise.all([getIntake(propertyId), getLatestAssessment(propertyId)])

  return {
    prop,
    context: {
      property: {
        name: prop.name,
        type: prop.propertyType,
        squareFootage: prop.squareFootage,
        floors: prop.floors,
        yearBuilt: prop.yearBuilt,
        location: [prop.city, prop.region, prop.country].filter(Boolean).join(", "),
      },
      intakeAnswers: (intake?.answers as Record<string, unknown>) ?? {},
      assessment: assessment
        ? { score: assessment.roboReadyScore, summary: assessment.summary, findings: assessment.findings }
        : null,
    },
  }
}

function guardMember(ctx: OrgContext, verb: string): { ok: false; error: string } | null {
  try {
    assertRole(ctx, "member")
    return null
  } catch {
    return { ok: false, error: `You do not have permission to ${verb}.` }
  }
}

// ---------------------------------------------------------------------------
// Wayfinding
// ---------------------------------------------------------------------------

export async function getWayfinding(propertyId: string) {
  const ctx = await requireOrgContext()
  const rows = await db
    .select()
    .from(wayfindingPlan)
    .where(and(eq(wayfindingPlan.propertyId, propertyId), eq(wayfindingPlan.organizationId, ctx.organizationId)))
    .orderBy(desc(wayfindingPlan.version))
    .limit(1)
  return rows[0] ?? null
}

export async function runWayfinding(propertyId: string): Promise<ActionResult<{ routes: number }>> {
  const ctx = await requireOrgContext()
  const denied = guardMember(ctx, "run the wayfinding planner")
  if (denied) return denied

  const loaded = await loadPropertyContext(ctx, propertyId)
  if (!loaded) return { ok: false, error: "Property not found." }

  try {
    const job = await runJob<typeof loaded.context, WayfindingOutput>({
      ctx,
      propertyId,
      employeeSlug: "wayfinding-planner",
      jobType: "wayfinding",
      input: loaded.context,
    })

    const prev = (await getWayfinding(propertyId))?.version ?? 0
    await db.insert(wayfindingPlan).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      aiJobId: job.jobId,
      summary: job.output.summary,
      routes: job.output.routes,
      signage: job.output.signage,
      passengerJourney: job.output.passengerJourney,
      boardingSignals: job.output.boardingSignals,
      version: prev + 1,
    })

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "wayfinding.completed",
      entityType: "wayfinding_plan",
      entityId: propertyId,
    })

    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath("/dashboard/activity")
    return { ok: true, data: { routes: job.output.routes.length } }
  } catch (err) {
    console.log("[v0] runWayfinding failed:", (err as Error).message)
    return { ok: false, error: "The wayfinding plan could not be generated. Please try again." }
  }
}

// ---------------------------------------------------------------------------
// Accessibility (requires professional verification)
// ---------------------------------------------------------------------------

export async function getAccessibility(propertyId: string) {
  const ctx = await requireOrgContext()
  const rows = await db
    .select()
    .from(accessibilityAudit)
    .where(
      and(eq(accessibilityAudit.propertyId, propertyId), eq(accessibilityAudit.organizationId, ctx.organizationId)),
    )
    .orderBy(desc(accessibilityAudit.version))
    .limit(1)
  return rows[0] ?? null
}

export async function runAccessibility(propertyId: string): Promise<ActionResult<{ score: number }>> {
  const ctx = await requireOrgContext()
  const denied = guardMember(ctx, "run the accessibility audit")
  if (denied) return denied

  const loaded = await loadPropertyContext(ctx, propertyId)
  if (!loaded) return { ok: false, error: "Property not found." }

  try {
    const job = await runJob<typeof loaded.context, AccessibilityOutput>({
      ctx,
      propertyId,
      employeeSlug: "accessibility-auditor",
      jobType: "accessibility",
      input: loaded.context,
    })

    const prev = (await getAccessibility(propertyId))?.version ?? 0
    await db.insert(accessibilityAudit).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      aiJobId: job.jobId,
      score: job.output.score,
      summary: job.output.summary,
      findings: job.output.findings,
      requiresVerification: true,
      version: prev + 1,
    })

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "accessibility.completed",
      entityType: "accessibility_audit",
      entityId: propertyId,
      metadata: { score: job.output.score },
    })

    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath("/dashboard/activity")
    return { ok: true, data: { score: job.output.score } }
  } catch (err) {
    console.log("[v0] runAccessibility failed:", (err as Error).message)
    return { ok: false, error: "The accessibility audit could not be generated. Please try again." }
  }
}

/** Marks the latest accessibility audit as verified by a licensed professional. Admin+ only. */
export async function verifyAccessibility(propertyId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "admin")
  } catch {
    return { ok: false, error: "Only an admin or owner can record professional verification." }
  }

  const latest = await getAccessibility(propertyId)
  if (!latest) return { ok: false, error: "No accessibility audit to verify." }

  await db
    .update(accessibilityAudit)
    .set({ requiresVerification: false, verifiedByUserId: ctx.user.id, verifiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(accessibilityAudit.id, latest.id), eq(accessibilityAudit.organizationId, ctx.organizationId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "accessibility.verified",
    entityType: "accessibility_audit",
    entityId: latest.id,
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// EV / robot charging planner
// ---------------------------------------------------------------------------

export async function getEvPlan(propertyId: string) {
  const ctx = await requireOrgContext()
  const rows = await db
    .select()
    .from(evPlan)
    .where(and(eq(evPlan.propertyId, propertyId), eq(evPlan.organizationId, ctx.organizationId)))
    .orderBy(desc(evPlan.version))
    .limit(1)
  return rows[0] ?? null
}

export async function runEvPlan(propertyId: string): Promise<ActionResult<{ stations: number }>> {
  const ctx = await requireOrgContext()
  const denied = guardMember(ctx, "run the EV charging planner")
  if (denied) return denied

  const loaded = await loadPropertyContext(ctx, propertyId)
  if (!loaded) return { ok: false, error: "Property not found." }

  try {
    const job = await runJob<typeof loaded.context, EvPlanOutput>({
      ctx,
      propertyId,
      employeeSlug: "ev-planner",
      jobType: "ev-plan",
      input: loaded.context,
    })

    const totalCostCents = Math.round(
      job.output.stations.reduce((sum, s) => sum + s.count * s.unitCost, 0) * 100,
    )

    const prev = (await getEvPlan(propertyId))?.version ?? 0
    await db.insert(evPlan).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      aiJobId: job.jobId,
      summary: job.output.summary,
      stations: job.output.stations,
      loadSummary: job.output.loadSummary,
      totalCostCents,
      version: prev + 1,
    })

    // Also surface EV/robot chargers on the infrastructure map as proposed assets.
    for (const s of job.output.stations.slice(0, 20)) {
      await db.insert(infrastructureAsset).values({
        id: crypto.randomUUID(),
        organizationId: ctx.organizationId,
        propertyId,
        createdByUserId: ctx.user.id,
        assetType: s.kind === "robot-charger" ? "robot-charger" : "ev-charger",
        label: `${s.kind} x${s.count}`,
        status: "proposed",
        quantity: Math.max(1, Math.round(s.count)),
        unitCost: String(s.unitCost),
        specs: { powerKw: s.powerKw, rationale: s.rationale, source: "ev-plan" },
      })
    }

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "ev_plan.completed",
      entityType: "ev_plan",
      entityId: propertyId,
      metadata: { stations: job.output.stations.length },
    })

    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath("/dashboard/activity")
    return { ok: true, data: { stations: job.output.stations.length } }
  } catch (err) {
    console.log("[v0] runEvPlan failed:", (err as Error).message)
    return { ok: false, error: "The EV charging plan could not be generated. Please try again." }
  }
}
