import "server-only"

import { and, desc, eq, isNull, lt, notInArray, or } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  assessment,
  assessmentRun,
  document,
  infrastructureAsset,
  intakeSubmission,
  property,
  siteConcept,
} from "@/lib/db/schema"
import { evaluateReferralEligibility } from "@/lib/cyber-fleet-server"
import { runJob } from "@/lib/ai/orchestrator"
import {
  computeRoboReadyScore,
  type AssessmentOutput,
  type SiteConceptOutput,
  type InfrastructurePlanOutput,
} from "@/lib/ai/schemas"
import { createNotification } from "@/lib/notifications"
import type { OrgContext } from "@/lib/tenancy"
import { STAGE_COPY, isTerminal, type AssessmentStage } from "@/lib/assessment/stages"

// A stalled run older than this is reclaimable by the next worker/poll.
const LOCK_MS = 3 * 60 * 1000

type Run = typeof assessmentRun.$inferSelect

/** Synthetic org context for background AI work (no session cookie available). */
function systemCtx(organizationId: string, userId: string): OrgContext {
  return {
    user: { id: userId, email: "system@roboready", name: "RoboReady" },
    organizationId,
    organizationName: "RoboReady",
    role: "owner",
    logoUrl: null,
  }
}

export async function getRun(runId: string): Promise<Run | null> {
  const rows = await db.select().from(assessmentRun).where(eq(assessmentRun.id, runId)).limit(1)
  return rows[0] ?? null
}

/** Latest run for a property (what the tracker reads). */
export async function getRunForProperty(organizationId: string, propertyId: string): Promise<Run | null> {
  const rows = await db
    .select()
    .from(assessmentRun)
    .where(and(eq(assessmentRun.organizationId, organizationId), eq(assessmentRun.propertyId, propertyId)))
    .orderBy(desc(assessmentRun.createdAt))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Creates a run for a paid assessment if one isn't already in flight. Idempotent
 * per property: an existing non-failed run is returned as-is so a retried
 * payment confirmation cannot double-queue.
 */
export async function startAssessmentRun(input: {
  organizationId: string
  propertyId: string
  userId: string
  tier: string
  paymentId?: string
}): Promise<Run> {
  const existing = await getRunForProperty(input.organizationId, input.propertyId)
  if (existing && existing.stage !== "failed") return existing

  const id = crypto.randomUUID()
  await db.insert(assessmentRun).values({
    id,
    organizationId: input.organizationId,
    propertyId: input.propertyId,
    createdByUserId: input.userId,
    paymentId: input.paymentId ?? null,
    tier: input.tier,
    stage: "queued",
    startedAt: new Date(),
  })

  await db
    .update(property)
    .set({ status: "assessing", updatedAt: new Date() })
    .where(and(eq(property.id, input.propertyId), eq(property.organizationId, input.organizationId)))

  const created = await getRun(id)
  return created as Run
}

/** Atomically claims a run for work, honoring the self-heal lock window. */
async function claimRun(runId: string): Promise<Run | null> {
  const cutoff = new Date(Date.now() - LOCK_MS)
  const rows = await db
    .update(assessmentRun)
    .set({ lockedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(assessmentRun.id, runId),
        notInArray(assessmentRun.stage, ["ready", "failed"]),
        or(isNull(assessmentRun.lockedAt), lt(assessmentRun.lockedAt, cutoff)),
      ),
    )
    .returning()
  return rows[0] ?? null
}

async function clearLock(runId: string): Promise<void> {
  await db.update(assessmentRun).set({ lockedAt: null, updatedAt: new Date() }).where(eq(assessmentRun.id, runId))
}

async function setStage(runId: string, stage: AssessmentStage): Promise<void> {
  await db.update(assessmentRun).set({ stage, updatedAt: new Date() }).where(eq(assessmentRun.id, runId))
}

// ---------------------------------------------------------------------------
// Context + per-stage work. Each step reads its prerequisites from the database
// so the pipeline can resume on any stage after an interruption.
// ---------------------------------------------------------------------------

async function buildContext(propertyId: string, organizationId: string) {
  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, organizationId)))
    .limit(1)
  if (!prop) throw new Error("Property not found")

  const [intake] = await db
    .select()
    .from(intakeSubmission)
    .where(and(eq(intakeSubmission.propertyId, propertyId), eq(intakeSubmission.organizationId, organizationId)))
    .orderBy(desc(intakeSubmission.updatedAt))
    .limit(1)

  // The owner-supplied knowledge base (freeform details captured on the add-
  // property form) and the manifest of documents/media they uploaded. The AI
  // can't read binary files, but knowing a floor plan / DXF / walkthrough video
  // exists — and its category — materially informs the assessment narrative.
  const kb = (prop.metadata as { knowledgeBase?: Record<string, string> } | null)?.knowledgeBase ?? null

  const docs = await db
    .select({ name: document.name, category: document.category, contentType: document.contentType })
    .from(document)
    .where(and(eq(document.propertyId, propertyId), eq(document.organizationId, organizationId)))
    .orderBy(desc(document.createdAt))

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
      ownerKnowledgeBase: kb ?? {},
      supportingDocuments: docs.map((d) => ({
        name: d.name,
        category: d.category,
        kind: d.contentType?.split("/")[0] ?? "file",
      })),
      intakeAnswers: (intake?.answers as Record<string, unknown>) ?? {},
    },
  }
}

async function latestAssessment(organizationId: string, propertyId: string) {
  const rows = await db
    .select()
    .from(assessment)
    .where(and(eq(assessment.propertyId, propertyId), eq(assessment.organizationId, organizationId)))
    .orderBy(desc(assessment.version))
    .limit(1)
  return rows[0] ?? null
}

async function latestConcept(organizationId: string, propertyId: string) {
  const rows = await db
    .select()
    .from(siteConcept)
    .where(and(eq(siteConcept.propertyId, propertyId), eq(siteConcept.organizationId, organizationId)))
    .orderBy(desc(siteConcept.version))
    .limit(1)
  return rows[0] ?? null
}

async function stepAnalyze(run: Run): Promise<void> {
  const ctx = systemCtx(run.organizationId, run.createdByUserId)
  const { context } = await buildContext(run.propertyId, run.organizationId)

  const assess = await runJob<typeof context, AssessmentOutput>({
    ctx,
    propertyId: run.propertyId,
    employeeSlug: "readiness-analyst",
    jobType: "assessment",
    input: context,
  })

  const { total, clamped } = computeRoboReadyScore(assess.output.scoreBreakdown ?? [])
  const capByCategory = new Map(clamped.map((c) => [c.category, c]))
  const persistedBreakdown = (assess.output.scoreBreakdown ?? []).map((b) => ({
    ...b,
    points: capByCategory.get(b.category)?.points ?? Math.round(Number(b.points) || 0),
    max: capByCategory.get(b.category)?.max ?? undefined,
  }))

  const prevVersion = (await latestAssessment(run.organizationId, run.propertyId))?.version ?? 0
  const assessmentId = crypto.randomUUID()
  await db.insert(assessment).values({
    id: assessmentId,
    organizationId: run.organizationId,
    propertyId: run.propertyId,
    createdByUserId: run.createdByUserId,
    aiJobId: assess.jobId,
    status: "completed",
    roboReadyScore: total,
    scoreBreakdown: persistedBreakdown,
    findings: assess.output.findings,
    recommendations: assess.output.recommendations,
    summary: assess.output.summary,
    version: prevVersion + 1,
  })

  await db
    .update(assessmentRun)
    .set({ assessmentId, updatedAt: new Date() })
    .where(eq(assessmentRun.id, run.id))
}

async function stepDesign(run: Run): Promise<void> {
  const ctx = systemCtx(run.organizationId, run.createdByUserId)
  const { context } = await buildContext(run.propertyId, run.organizationId)
  const assess = await latestAssessment(run.organizationId, run.propertyId)
  const assessmentId = run.assessmentId ?? assess?.id ?? null

  const concept = await runJob<Record<string, unknown>, SiteConceptOutput>({
    ctx,
    propertyId: run.propertyId,
    employeeSlug: "site-designer",
    jobType: "site-concept",
    input: {
      ...context,
      assessment: {
        summary: assess?.summary,
        findings: assess?.findings,
        recommendations: assess?.recommendations,
        roboReadyScore: assess?.roboReadyScore,
      },
    },
  })

  const prevConceptVersion = (await latestConcept(run.organizationId, run.propertyId))?.version ?? 0
  await db.insert(siteConcept).values({
    id: crypto.randomUUID(),
    organizationId: run.organizationId,
    propertyId: run.propertyId,
    assessmentId,
    createdByUserId: run.createdByUserId,
    aiJobId: concept.jobId,
    title: concept.output.title,
    narrative: concept.output.narrative,
    zones: concept.output.zones,
    pickupZones: concept.output.pickupZones ?? [],
    version: prevConceptVersion + 1,
    status: "draft",
  })
}

async function stepPlan(run: Run): Promise<void> {
  const ctx = systemCtx(run.organizationId, run.createdByUserId)
  const { context } = await buildContext(run.propertyId, run.organizationId)
  const assess = await latestAssessment(run.organizationId, run.propertyId)
  const concept = await latestConcept(run.organizationId, run.propertyId)

  const plan = await runJob<Record<string, unknown>, InfrastructurePlanOutput>({
    ctx,
    propertyId: run.propertyId,
    employeeSlug: "infrastructure-planner",
    jobType: "infrastructure-plan",
    input: {
      ...context,
      assessment: { summary: assess?.summary, roboReadyScore: assess?.roboReadyScore },
      concept: { title: concept?.title, narrative: concept?.narrative, zones: concept?.zones },
    },
  })

  for (const a of plan.output.assets.slice(0, 30)) {
    await db.insert(infrastructureAsset).values({
      id: crypto.randomUUID(),
      organizationId: run.organizationId,
      propertyId: run.propertyId,
      createdByUserId: run.createdByUserId,
      assetType: a.assetType,
      label: a.label,
      status: "proposed",
      quantity: Math.max(1, Math.round(a.quantity)),
      unitCost: a.unitCost != null ? String(a.unitCost) : null,
      specs: { rationale: a.rationale },
    })
  }
}

async function stepFinalize(run: Run): Promise<void> {
  await db
    .update(property)
    .set({ status: "assessed", updatedAt: new Date() })
    .where(and(eq(property.id, run.propertyId), eq(property.organizationId, run.organizationId)))

  // Partner monetization: if the finalized score qualifies, open a Cyber Fleet
  // referral and notify the owner. Best-effort — never blocks finalize.
  await evaluateReferralEligibility({
    organizationId: run.organizationId,
    propertyId: run.propertyId,
    ownerUserId: run.createdByUserId,
  })
}

/** Existence-based resume: decides the next action from persisted artifacts. */
async function deriveNext(
  run: Run,
): Promise<{ done: true } | { done: false; stage: Exclude<AssessmentStage, "queued" | "ready" | "failed">; work: () => Promise<void> }> {
  const assess = await latestAssessment(run.organizationId, run.propertyId)
  if (!assess) return { done: false, stage: "analyzing", work: () => stepAnalyze(run) }

  const concept = await latestConcept(run.organizationId, run.propertyId)
  if (!concept) return { done: false, stage: "designing", work: () => stepDesign(run) }

  const assets = await db
    .select({ id: infrastructureAsset.id })
    .from(infrastructureAsset)
    .where(
      and(
        eq(infrastructureAsset.propertyId, run.propertyId),
        eq(infrastructureAsset.organizationId, run.organizationId),
      ),
    )
    .limit(1)
  if (assets.length === 0) return { done: false, stage: "planning", work: () => stepPlan(run) }

  const [prop] = await db
    .select({ status: property.status })
    .from(property)
    .where(eq(property.id, run.propertyId))
    .limit(1)
  if (prop?.status !== "assessed") return { done: false, stage: "reporting", work: () => stepFinalize(run) }

  return { done: true }
}

async function notifyStage(run: Run, stage: AssessmentStage): Promise<void> {
  const copy = STAGE_COPY[stage]
  await createNotification({
    organizationId: run.organizationId,
    userId: run.createdByUserId,
    type: stage === "ready" ? "assessment_ready" : "assessment_stage",
    title: stage === "ready" ? "Your AI assessment is ready" : `Assessment update: ${copy.label}`,
    body: copy.description,
    href: `/dashboard/properties/${run.propertyId}`,
    propertyId: run.propertyId,
  })
}

/**
 * Advances a run by exactly one step. Claims the self-heal lock, runs the next
 * unfinished stage, records progress, and notifies the client on transitions.
 * Safe to call concurrently: only the lock holder does work.
 */
export async function advanceAssessmentRun(runId: string): Promise<{ stage: AssessmentStage; done: boolean }> {
  const claimed = await claimRun(runId)
  if (!claimed) {
    const cur = await getRun(runId)
    return { stage: (cur?.stage as AssessmentStage) ?? "failed", done: cur ? isTerminal(cur.stage as AssessmentStage) : true }
  }

  try {
    const next = await deriveNext(claimed)
    if (next.done) {
      await db
        .update(assessmentRun)
        .set({ stage: "ready", readyAt: new Date(), lockedAt: null, updatedAt: new Date() })
        .where(eq(assessmentRun.id, runId))
      await notifyStage(claimed, "ready")
      return { stage: "ready", done: true }
    }

    if (claimed.stage !== next.stage) {
      await setStage(runId, next.stage)
      await notifyStage(claimed, next.stage)
    }
    await next.work()
    await clearLock(runId)
    return { stage: next.stage, done: false }
  } catch (err) {
    const message = (err as Error).message
    console.log("[v0] advanceAssessmentRun failed:", runId, message)
    await db
      .update(assessmentRun)
      .set({ stage: "failed", error: message, lockedAt: null, updatedAt: new Date() })
      .where(eq(assessmentRun.id, runId))
    await createNotification({
      organizationId: claimed.organizationId,
      userId: claimed.createdByUserId,
      type: "assessment_failed",
      title: "Your assessment needs attention",
      body: "Something interrupted your AI assessment. Our team has been notified and will resolve it shortly.",
      href: `/dashboard/properties/${claimed.propertyId}`,
      propertyId: claimed.propertyId,
    })
    return { stage: "failed", done: true }
  }
}

/**
 * Drives a run to completion, one step per iteration. Used as the background
 * worker kicked off after payment. The per-step lock means a duplicate kickoff
 * or a tracker poll calling advance in parallel cannot double-run a stage.
 */
export async function runAssessmentToCompletion(runId: string): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const { done } = await advanceAssessmentRun(runId)
    if (done) return
  }
}
