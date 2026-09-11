"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { property, proposal, infrastructureAsset } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { runJob } from "@/lib/ai/orchestrator"
import type { ProposalOutput } from "@/lib/ai/schemas"
import { DEFAULT_DEPOSIT_RATE } from "@/lib/products"
import { getLatestAssessment, getLatestConcept } from "@/app/actions/assessment"
import { getEvPlan } from "@/app/actions/planners"
import type { ActionResult } from "@/app/actions/properties"

export type ProposalLineItem = { name: string; description: string; quantity: number; unitPrice: number }

export async function getLatestProposal(propertyId: string) {
  const ctx = await requireOrgContext()
  const rows = await db
    .select()
    .from(proposal)
    .where(and(eq(proposal.propertyId, propertyId), eq(proposal.organizationId, ctx.organizationId)))
    .orderBy(desc(proposal.version))
    .limit(1)
  return rows[0] ?? null
}

/** Sums line items to a whole-cent subtotal and derives the deposit. */
function priceProposal(items: ProposalLineItem[], depositRate: number) {
  const subtotalCents = items.reduce(
    (sum, i) => sum + Math.round(Math.max(0, i.unitPrice) * 100) * Math.max(1, Math.round(i.quantity)),
    0,
  )
  const depositCents = Math.round(subtotalCents * depositRate)
  return { subtotalCents, depositCents }
}

export async function generateProposal(propertyId: string): Promise<ActionResult<{ subtotalCents: number }>> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to generate proposals." }
  }

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  const [assessment, concept, ev, assets] = await Promise.all([
    getLatestAssessment(propertyId),
    getLatestConcept(propertyId),
    getEvPlan(propertyId),
    db
      .select()
      .from(infrastructureAsset)
      .where(
        and(eq(infrastructureAsset.propertyId, propertyId), eq(infrastructureAsset.organizationId, ctx.organizationId)),
      ),
  ])

  if (!assessment) {
    return { ok: false, error: "Run an assessment before generating a proposal." }
  }

  const context = {
    property: { name: prop.name, type: prop.propertyType, location: [prop.city, prop.region].filter(Boolean).join(", ") },
    assessment: { score: assessment.roboReadyScore, summary: assessment.summary, recommendations: assessment.recommendations },
    concept: concept ? { title: concept.title, narrative: concept.narrative } : null,
    evPlan: ev ? { summary: ev.summary, stations: ev.stations } : null,
    infrastructure: assets.map((a) => ({ type: a.assetType, label: a.label, quantity: a.quantity, unitCost: a.unitCost })),
  }

  try {
    const job = await runJob<typeof context, ProposalOutput>({
      ctx,
      propertyId,
      employeeSlug: "proposal-writer",
      jobType: "proposal",
      input: context,
    })

    const items: ProposalLineItem[] = job.output.lineItems.map((i) => ({
      name: i.name,
      description: i.description,
      quantity: Math.max(1, Math.round(i.quantity)),
      unitPrice: Math.max(0, i.unitPrice),
    }))
    const { subtotalCents, depositCents } = priceProposal(items, DEFAULT_DEPOSIT_RATE)
    const prev = (await getLatestProposal(propertyId))?.version ?? 0

    await db.insert(proposal).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      title: job.output.title,
      summary: job.output.summary,
      lineItems: items,
      subtotalCents,
      depositRate: String(DEFAULT_DEPOSIT_RATE),
      depositCents,
      currency: "usd",
      status: "draft",
      aiJobId: job.jobId,
      version: prev + 1,
    })

    await db
      .update(property)
      .set({ status: "proposal", updatedAt: new Date() })
      .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "proposal.generated",
      entityType: "proposal",
      entityId: propertyId,
      metadata: { subtotalCents },
    })

    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath("/dashboard/activity")
    return { ok: true, data: { subtotalCents } }
  } catch (err) {
    console.log("[v0] generateProposal failed:", (err as Error).message)
    return { ok: false, error: "The proposal could not be generated. Please try again." }
  }
}

/** Updates the deposit rate on the latest proposal and recomputes the deposit. */
export async function setDepositRate(proposalId: string, rate: number): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to edit proposals." }
  }
  const clamped = Math.min(0.5, Math.max(0, rate))

  const [row] = await db
    .select()
    .from(proposal)
    .where(and(eq(proposal.id, proposalId), eq(proposal.organizationId, ctx.organizationId)))
    .limit(1)
  if (!row) return { ok: false, error: "Proposal not found." }

  await db
    .update(proposal)
    .set({
      depositRate: String(clamped),
      depositCents: Math.round(row.subtotalCents * clamped),
      updatedAt: new Date(),
    })
    .where(and(eq(proposal.id, proposalId), eq(proposal.organizationId, ctx.organizationId)))

  revalidatePath(`/dashboard/properties/${row.propertyId}`)
  return { ok: true, data: undefined }
}

/** Marks a proposal as sent to the client (no payment yet). */
export async function markProposalSent(proposalId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  const [row] = await db
    .select()
    .from(proposal)
    .where(and(eq(proposal.id, proposalId), eq(proposal.organizationId, ctx.organizationId)))
    .limit(1)
  if (!row) return { ok: false, error: "Proposal not found." }
  if (row.status === "draft") {
    await db
      .update(proposal)
      .set({ status: "sent", updatedAt: new Date() })
      .where(and(eq(proposal.id, proposalId), eq(proposal.organizationId, ctx.organizationId)))
    revalidatePath(`/dashboard/properties/${row.propertyId}`)
  }
  return { ok: true, data: undefined }
}
