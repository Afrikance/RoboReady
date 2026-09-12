"use server"

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { assessmentRun, property } from "@/lib/db/schema"
import { isClient, requireOrgContext } from "@/lib/tenancy"
import { advanceAssessmentRun, getRunForProperty } from "@/lib/assessment/lifecycle"
import { isTerminal, type AssessmentStage } from "@/lib/assessment/stages"

export type AssessmentRunState = {
  exists: boolean
  stage: AssessmentStage
  tier: string
  error: string | null
  startedAt: string | null
  readyAt: string | null
  done: boolean
}

const EMPTY: AssessmentRunState = {
  exists: false,
  stage: "queued",
  tier: "basic",
  error: null,
  startedAt: null,
  readyAt: null,
  done: false,
}

/** Confirms the caller may see this property's run (owner client or staff). */
async function assertPropertyAccess(propertyId: string) {
  const ctx = await requireOrgContext()
  const [prop] = await db
    .select({ id: property.id, createdByUserId: property.createdByUserId })
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) throw new Error("NOT_FOUND")
  if (isClient(ctx.role) && prop.createdByUserId !== ctx.user.id) throw new Error("FORBIDDEN")
  return ctx
}

export async function getAssessmentRunState(propertyId: string): Promise<AssessmentRunState> {
  const ctx = await assertPropertyAccess(propertyId)
  const run = await getRunForProperty(ctx.organizationId, propertyId)
  if (!run) return EMPTY
  const stage = run.stage as AssessmentStage
  return {
    exists: true,
    stage,
    tier: run.tier,
    error: run.error ?? null,
    startedAt: run.startedAt?.toISOString() ?? null,
    readyAt: run.readyAt?.toISOString() ?? null,
    done: isTerminal(stage),
  }
}

/**
 * Advances the run by one step and returns the new state. The client tracker
 * polls this so the pipeline keeps moving (and self-heals a stalled run) even
 * if the background worker was dropped. The per-step lock makes it safe to call
 * alongside the background runner.
 */
export async function tickAssessmentRun(propertyId: string): Promise<AssessmentRunState> {
  const ctx = await assertPropertyAccess(propertyId)
  const run = await getRunForProperty(ctx.organizationId, propertyId)
  if (!run) return EMPTY
  if (!isTerminal(run.stage as AssessmentStage)) {
    await advanceAssessmentRun(run.id)
  }
  return getAssessmentRunState(propertyId)
}

/**
 * Resumes a failed run. Clears the error and lock and resets the stage to
 * queued; deriveNext then picks up from the last persisted artifact, so no
 * completed work is repeated. Advances one step before returning.
 */
export async function resumeAssessmentRun(propertyId: string): Promise<AssessmentRunState> {
  const ctx = await assertPropertyAccess(propertyId)
  const run = await getRunForProperty(ctx.organizationId, propertyId)
  if (!run) return EMPTY
  if (run.stage === "failed") {
    await db
      .update(assessmentRun)
      .set({ stage: "queued", error: null, lockedAt: null, updatedAt: new Date() })
      .where(eq(assessmentRun.id, run.id))
  }
  await advanceAssessmentRun(run.id)
  return getAssessmentRunState(propertyId)
}
