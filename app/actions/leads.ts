"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { lead } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { runJob } from "@/lib/ai/orchestrator"
import type { LeadQualificationOutput } from "@/lib/ai/schemas"
import type { ActionResult } from "@/app/actions/properties"
import { LEAD_STAGES, type LeadStage, type LeadInput } from "@/lib/leads/types"

export async function listLeads() {
  const ctx = await requireOrgContext()
  const scope = [eq(lead.organizationId, ctx.organizationId)]
  // Field Operators only see the leads they own.
  if (ctx.role === "operator") scope.push(eq(lead.ownerUserId, ctx.user.id))
  return db
    .select()
    .from(lead)
    .where(and(...scope))
    .orderBy(desc(lead.updatedAt))
}

export async function getLead(id: string) {
  const ctx = await requireOrgContext()
  const scope = [eq(lead.id, id), eq(lead.organizationId, ctx.organizationId)]
  if (ctx.role === "operator") scope.push(eq(lead.ownerUserId, ctx.user.id))
  const rows = await db
    .select()
    .from(lead)
    .where(and(...scope))
    .limit(1)
  return rows[0] ?? null
}

export async function createLead(input: LeadInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to add leads." }
  }

  const company = input.company?.trim()
  if (!company || company.length < 2) {
    return { ok: false, error: "Company name is required." }
  }

  const id = crypto.randomUUID()
  await db.insert(lead).values({
    id,
    organizationId: ctx.organizationId,
    createdByUserId: ctx.user.id,
    ownerUserId: ctx.user.id,
    company,
    contactName: input.contactName?.trim() || null,
    contactEmail: input.contactEmail?.trim() || null,
    contactPhone: input.contactPhone?.trim() || null,
    source: input.source?.trim() || "manual",
    stage: "new",
    estimatedValue: input.estimatedValue != null ? String(input.estimatedValue) : null,
    notes: input.notes?.trim() || null,
  })

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "lead.created",
    entityType: "lead",
    entityId: id,
    metadata: { company },
  })

  revalidatePath("/dashboard/leads")
  return { ok: true, data: { id } }
}

export async function updateLeadStage(id: string, stage: LeadStage): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!LEAD_STAGES.includes(stage)) return { ok: false, error: "Unknown stage." }

  const scope = [eq(lead.id, id), eq(lead.organizationId, ctx.organizationId)]
  if (ctx.role === "operator") scope.push(eq(lead.ownerUserId, ctx.user.id))
  await db
    .update(lead)
    .set({ stage, updatedAt: new Date() })
    .where(and(...scope))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "lead.stage_changed",
    entityType: "lead",
    entityId: id,
    metadata: { stage },
  })

  revalidatePath("/dashboard/leads")
  revalidatePath(`/dashboard/leads/${id}`)
  return { ok: true, data: undefined }
}

export async function updateLead(id: string, patch: Partial<LeadInput>): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to edit leads." }
  }

  const scope = [eq(lead.id, id), eq(lead.organizationId, ctx.organizationId)]
  if (ctx.role === "operator") scope.push(eq(lead.ownerUserId, ctx.user.id))
  await db
    .update(lead)
    .set({
      company: patch.company?.trim() || undefined,
      contactName: patch.contactName?.trim() ?? undefined,
      contactEmail: patch.contactEmail?.trim() ?? undefined,
      contactPhone: patch.contactPhone?.trim() ?? undefined,
      source: patch.source?.trim() || undefined,
      estimatedValue: patch.estimatedValue != null ? String(patch.estimatedValue) : undefined,
      notes: patch.notes ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(...scope))

  revalidatePath(`/dashboard/leads/${id}`)
  revalidatePath("/dashboard/leads")
  return { ok: true, data: undefined }
}

/** Runs Mercer (Sales Qualifier) on a lead and stores the qualification. */
export async function qualifyLead(id: string): Promise<ActionResult<{ fitScore: number }>> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to qualify leads." }
  }

  const row = await getLead(id)
  if (!row) return { ok: false, error: "Lead not found." }

  const context = {
    company: row.company,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    source: row.source,
    estimatedValue: row.estimatedValue,
    notes: row.notes,
    services: "Autonomous-readiness assessments, site concepts, infrastructure (EV/robot charging, drone pads), proposals.",
  }

  try {
    const job = await runJob<typeof context, LeadQualificationOutput>({
      ctx,
      propertyId: null,
      employeeSlug: "sales-qualifier",
      jobType: "lead-qualification",
      input: context,
    })

    // Move to "qualifying" on first pass unless already further along.
    const nextStage = row.stage === "new" ? "qualifying" : row.stage

    await db
      .update(lead)
      .set({
        qualification: job.output,
        qualificationJobId: job.jobId,
        stage: nextStage,
        updatedAt: new Date(),
      })
      .where(and(eq(lead.id, id), eq(lead.organizationId, ctx.organizationId)))

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "lead.qualified",
      entityType: "lead",
      entityId: id,
      metadata: { fitScore: job.output.fitScore, rating: job.output.rating },
    })

    revalidatePath(`/dashboard/leads/${id}`)
    revalidatePath("/dashboard/leads")
    revalidatePath("/dashboard/activity")
    return { ok: true, data: { fitScore: job.output.fitScore } }
  } catch (err) {
    console.log("[v0] qualifyLead failed:", (err as Error).message)
    return { ok: false, error: "The lead could not be qualified. Please try again." }
  }
}
