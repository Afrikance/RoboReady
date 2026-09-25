import "server-only"

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { aiJob } from "@/lib/db/schema"
import { recordAudit, type OrgContext } from "@/lib/tenancy"
import type { StaffGPTAdapter, DispatchResult } from "@/lib/ai/adapter"
import { LocalOrchestrator } from "@/lib/ai/local-orchestrator"
import { StaffGPTApiAdapter } from "@/lib/ai/staffgpt-adapter"
import { getEmployee, type EmployeeSlug } from "@/lib/ai/employees"

/** Chooses the real StaffGPT adapter when configured, else the local one. */
export function getAdapter(): StaffGPTAdapter {
  const url = process.env.STAFFGPT_API_URL
  const key = process.env.STAFFGPT_API_KEY
  if (url && key)
    return new StaffGPTApiAdapter(
      url,
      key,
      process.env.STAFFGPT_DEPARTMENT || "roboready",
      process.env.STAFFGPT_ROBOSEARCH_DEPARTMENT || "robosearch",
    )
  return new LocalOrchestrator()
}

export type RunJobArgs<TInput> = {
  ctx: OrgContext
  propertyId?: string | null
  employeeSlug: EmployeeSlug
  jobType: string
  input: TInput
}

export type RunJobResult<TOutput> = {
  jobId: string
  output: TOutput
  requiresApproval: boolean
  status: "completed" | "awaiting_approval" | "failed"
}

/**
 * Runs an AI job end to end with full traceability:
 *  1. creates a queued ai_job row (who, which employee, input)
 *  2. dispatches through the adapter
 *  3. persists output + raw response + reasoning
 *  4. if the employee requires approval, parks the job at awaiting_approval
 * Every branch writes an audit entry.
 */
export async function runJob<TInput, TOutput>(args: RunJobArgs<TInput>): Promise<RunJobResult<TOutput>> {
  const { ctx, propertyId, employeeSlug, jobType, input } = args
  const employee = getEmployee(employeeSlug)
  const adapter = getAdapter()
  const jobId = crypto.randomUUID()

  await db.insert(aiJob).values({
    id: jobId,
    organizationId: ctx.organizationId,
    propertyId: propertyId ?? null,
    createdByUserId: ctx.user.id,
    employeeSlug: employee.slug,
    employeeName: employee.name,
    jobType,
    status: "running",
    adapterKind: adapter.kind,
    input: input as Record<string, unknown>,
    requiresApproval: employee.requiresApproval,
    startedAt: new Date(),
  })

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "ai_job.started",
    entityType: "ai_job",
    entityId: jobId,
    metadata: { employeeSlug, jobType, adapter: adapter.kind },
  })

  let result: DispatchResult<TOutput>
  try {
    result = await adapter.dispatch<TInput, TOutput>({ employeeSlug, jobType, input })
  } catch (err) {
    const message = (err as Error).message
    console.log("[v0] AI job failed:", jobId, message)
    await db
      .update(aiJob)
      .set({ status: "failed", errorDetail: message, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(aiJob.id, jobId))
    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "ai_job.failed",
      entityType: "ai_job",
      entityId: jobId,
      metadata: { message },
    })
    throw new Error("The AI workforce could not complete this job. Please try again.")
  }

  const status = employee.requiresApproval ? "awaiting_approval" : "completed"

  await db
    .update(aiJob)
    .set({
      status,
      output: result.output as Record<string, unknown>,
      rawResponse: result.raw as Record<string, unknown>,
      reasoning: result.reasoning ?? null,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(aiJob.id, jobId))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: employee.requiresApproval ? "ai_job.awaiting_approval" : "ai_job.completed",
    entityType: "ai_job",
    entityId: jobId,
    metadata: { employeeSlug, jobType },
  })

  return {
    jobId,
    output: result.output,
    requiresApproval: employee.requiresApproval,
    status,
  }
}

/** Approves a parked AI job. Only admins/owners should call this (enforced by caller). */
export async function approveJob(ctx: OrgContext, jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(aiJob)
    .where(and(eq(aiJob.id, jobId), eq(aiJob.organizationId, ctx.organizationId)))
    .limit(1)
  if (!job) throw new Error("NOT_FOUND")
  if (job.status !== "awaiting_approval") return

  await db
    .update(aiJob)
    .set({ status: "completed", approvedByUserId: ctx.user.id, approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(aiJob.id, jobId), eq(aiJob.organizationId, ctx.organizationId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "ai_job.approved",
    entityType: "ai_job",
    entityId: jobId,
  })
}

/** Lists AI jobs for the org, newest first, for the AI Activity view. */
export async function listAiJobs(ctx: OrgContext, propertyId?: string) {
  const where = propertyId
    ? and(eq(aiJob.organizationId, ctx.organizationId), eq(aiJob.propertyId, propertyId))
    : eq(aiJob.organizationId, ctx.organizationId)
  return db.select().from(aiJob).where(where).orderBy(aiJob.createdAt)
}
