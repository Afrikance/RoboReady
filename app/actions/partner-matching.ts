"use server"

import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { partnerReferral, solutionPartner } from "@/lib/db/schema"
import { isAdminRole } from "@/lib/access"
import { getOrgContext, recordAudit } from "@/lib/tenancy"
import {
  canSendReferral,
  canTransitionReferral,
  cleanCapabilityTags,
  matchPartner,
  normalizeCountryCode,
  normalizeOpportunityNeeds,
  normalizePartnerCoverage,
  safeTrim,
  validPartnerEmail,
  validConsentMethod,
} from "@/lib/partner-matching/core"
import {
  findPartnerForOrganization,
  findReferralForOrganization,
  getEligibleOpportunity,
  loadPartnerWorkspace,
  snapshotForProperty,
} from "@/lib/partner-matching/data"
import type { ConsentMethod, PartnerCategory, ReferralStatus } from "@/lib/partner-matching/types"

const partnerInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(["robotics", "charging", "both"]),
  capabilities: z.unknown(),
  coverage: z.unknown(),
  contactName: z.string().trim().max(120).optional().nullable(),
  contactEmail: z.string().trim().max(320).optional().nullable(),
  contactPhone: z.string().trim().max(60).optional().nullable(),
})

async function getAdminContext() {
  const ctx = await getOrgContext()
  return ctx && isAdminRole(ctx.role) ? ctx : null
}

function refreshPartnerWorkspace() {
  revalidatePath("/dashboard/partners")
}

export async function saveSolutionPartner(id: string | null, input: unknown) {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false as const, error: "You do not have permission to manage solution partners." }
  const parsed = partnerInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the partner details." }

  const capabilities = cleanCapabilityTags(parsed.data.capabilities)
  const coverage = normalizePartnerCoverage(parsed.data.coverage)
  const country = coverage?.country ? normalizeCountryCode(coverage.country) : null
  if (!capabilities || !coverage || (coverage.country && !country) || (coverage.nationwide && !country)) {
    return { ok: false as const, error: "Add a valid country code and at least one service area, or choose nationwide coverage." }
  }
  const contactEmail = parsed.data.contactEmail?.trim() || null
  if (!validPartnerEmail(contactEmail)) return { ok: false as const, error: "Enter a valid partner email address." }

  const partnerId = id || crypto.randomUUID()
  const existing = id ? await findPartnerForOrganization(id, ctx.organizationId) : null
  if (id && !existing) return { ok: false as const, error: "Partner not found." }
  const values = {
    name: parsed.data.name,
    category: parsed.data.category as PartnerCategory,
    capabilities,
    coverage: { ...coverage, country },
    contactName: parsed.data.contactName?.trim() || null,
    contactEmail,
    contactPhone: parsed.data.contactPhone?.trim() || null,
    updatedAt: new Date(),
  }

  if (existing) {
    await db.update(solutionPartner).set(values).where(and(
      eq(solutionPartner.id, partnerId),
      eq(solutionPartner.organizationId, ctx.organizationId),
    ))
  } else {
    await db.insert(solutionPartner).values({
      id: partnerId,
      organizationId: ctx.organizationId,
      ...values,
      active: true,
      createdByUserId: ctx.user.id,
    })
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: existing ? "solution_partner.updated" : "solution_partner.created",
    entityType: "solution_partner",
    entityId: partnerId,
    metadata: { name: values.name, category: values.category, active: existing?.active ?? true },
  })
  refreshPartnerWorkspace()
  return { ok: true as const }
}

export async function setSolutionPartnerActive(id: string, active: boolean) {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false as const, error: "You do not have permission to manage solution partners." }
  if (typeof id !== "string" || !id.trim() || id.length > 100 || typeof active !== "boolean") {
    return { ok: false as const, error: "Invalid partner update." }
  }
  const existing = await findPartnerForOrganization(id, ctx.organizationId)
  if (!existing) return { ok: false as const, error: "Partner not found." }
  await db.update(solutionPartner)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(solutionPartner.id, id), eq(solutionPartner.organizationId, ctx.organizationId)))
  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: active ? "solution_partner.activated" : "solution_partner.deactivated",
    entityType: "solution_partner",
    entityId: id,
    metadata: { name: existing.name, active },
  })
  refreshPartnerWorkspace()
  return { ok: true as const }
}

export async function createPartnerReferral(input: {
  partnerId: string
  propertyId: string
  leadId: string | null
  needs: unknown
  notes?: unknown
}) {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false as const, error: "You do not have permission to create referrals." }
  if (!input || typeof input.partnerId !== "string" || typeof input.propertyId !== "string") {
    return { ok: false as const, error: "Choose a valid partner and opportunity." }
  }

  const needs = normalizeOpportunityNeeds(input.needs)
  if (!needs) return { ok: false as const, error: "Select at least one solution need." }
  const [partner, opportunity, workspace] = await Promise.all([
    findPartnerForOrganization(input.partnerId, ctx.organizationId),
    getEligibleOpportunity(ctx, input.propertyId, input.leadId ?? null),
    loadPartnerWorkspace(ctx),
  ])
  if (!partner || !opportunity) return { ok: false as const, error: "The partner or qualified opportunity is no longer available." }

  const partnerProfile = workspace.partners.find((candidate) => candidate.id === partner.id)
  if (!partnerProfile || !partner.active) return { ok: false as const, error: "Only active partners can receive a referral draft." }
  const match = matchPartner({ ...opportunity, needs }, partnerProfile, needs)
  if (!match.matched) return { ok: false as const, error: "This partner does not meet the selected category and coverage criteria." }
  const propertySnapshot = await (async () => {
    const current = await import("@/lib/partner-matching/data").then(({ getOpportunityProperty }) => getOpportunityProperty(ctx, input.propertyId))
    return current ? snapshotForProperty(current) : null
  })()
  if (!propertySnapshot) return { ok: false as const, error: "The opportunity property is no longer available." }

  const notes = safeTrim(input.notes, 4000)
  const referralId = crypto.randomUUID()
  await db.insert(partnerReferral).values({
    id: referralId,
    organizationId: ctx.organizationId,
    partnerId: partner.id,
    propertyId: opportunity.propertyId,
    leadId: opportunity.leadId,
    propertySnapshot,
    matchReasons: match.reasons,
    status: "draft",
    notes,
    createdByUserId: ctx.user.id,
  })
  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "partner_referral.created",
    entityType: "partner_referral",
    entityId: referralId,
    metadata: { partnerId: partner.id, propertyId: opportunity.propertyId, needs, status: "draft" },
  })
  refreshPartnerWorkspace()
  return { ok: true as const }
}

export async function recordReferralConsent(input: {
  referralId: string
  method: unknown
  obtainedOn: unknown
  reference?: unknown
}) {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false as const, error: "You do not have permission to record consent." }
  if (!input || typeof input.referralId !== "string" || !validConsentMethod(input.method)) {
    return { ok: false as const, error: "Choose a valid consent method." }
  }
  const obtainedOn = safeTrim(input.obtainedOn, 10)
  if (!obtainedOn || !/^\d{4}-\d{2}-\d{2}$/.test(obtainedOn)) {
    return { ok: false as const, error: "Enter the date owner consent was obtained." }
  }
  const consentDate = new Date(`${obtainedOn}T12:00:00.000Z`)
  if (!Number.isFinite(consentDate.getTime()) || consentDate.toISOString().slice(0, 10) !== obtainedOn) {
    return { ok: false as const, error: "Enter a valid consent date." }
  }
  const referral = await findReferralForOrganization(input.referralId, ctx.organizationId)
  if (!referral) return { ok: false as const, error: "Referral not found." }
  if (referral.status !== "draft" && referral.status !== "under_review") {
    return { ok: false as const, error: "Consent can only be recorded before a referral is sent." }
  }

  const reference = safeTrim(input.reference, 240)
  await db.update(partnerReferral).set({
    consentObtainedAt: consentDate,
    consentObtainedByUserId: ctx.user.id,
    consentMethod: input.method as ConsentMethod,
    consentReference: reference,
    updatedAt: new Date(),
  }).where(and(
    eq(partnerReferral.id, referral.id),
    eq(partnerReferral.organizationId, ctx.organizationId),
    inArray(partnerReferral.status, ["draft", "under_review"]),
  ))
  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "partner_referral.owner_consent_recorded",
    entityType: "partner_referral",
    entityId: referral.id,
    metadata: { method: input.method, obtainedOn, referenceRecorded: Boolean(reference) },
  })
  refreshPartnerWorkspace()
  return { ok: true as const }
}

export async function updatePartnerReferral(input: {
  referralId: string
  status?: unknown
  notes?: unknown
}) {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false as const, error: "You do not have permission to update referrals." }
  if (!input || typeof input.referralId !== "string" || !input.referralId.trim()) {
    return { ok: false as const, error: "Invalid referral." }
  }
  const referral = await findReferralForOrganization(input.referralId, ctx.organizationId)
  if (!referral) return { ok: false as const, error: "Referral not found." }

  const nextStatus = input.status === undefined ? referral.status as ReferralStatus : input.status
  if (typeof nextStatus !== "string" || (nextStatus !== referral.status && !canTransitionReferral(referral.status, nextStatus))) {
    return { ok: false as const, error: "That referral stage transition is not allowed." }
  }
  if (nextStatus === "sent" && !canSendReferral(referral.consentObtainedAt, referral.consentObtainedByUserId, referral.consentMethod)) {
    return { ok: false as const, error: "Record owner consent before marking the referral sent." }
  }
  const notes = input.notes === undefined ? referral.notes : safeTrim(input.notes, 4000)
  const now = new Date()
  const timestampFields: { sentAt?: Date; respondedAt?: Date; closedAt?: Date } = {}
  if (nextStatus === "sent" && referral.status !== "sent") timestampFields.sentAt = now
  if ((nextStatus === "accepted" || nextStatus === "declined") && referral.status !== nextStatus) timestampFields.respondedAt = now
  if (["won", "lost", "declined", "withdrawn"].includes(nextStatus) && referral.status !== nextStatus) timestampFields.closedAt = now

  const [updated] = await db.update(partnerReferral).set({
    status: nextStatus,
    notes,
    updatedAt: now,
    ...timestampFields,
  }).where(and(
    eq(partnerReferral.id, referral.id),
    eq(partnerReferral.organizationId, ctx.organizationId),
    eq(partnerReferral.status, referral.status),
  )).returning({ id: partnerReferral.id })
  if (!updated) return { ok: false as const, error: "This referral changed in another session. Refresh and try again." }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: nextStatus === referral.status ? "partner_referral.notes_updated" : "partner_referral.stage_changed",
    entityType: "partner_referral",
    entityId: referral.id,
    metadata: { from: referral.status, to: nextStatus },
  })
  refreshPartnerWorkspace()
  return { ok: true as const }
}

export async function getPartnerWorkspaceForAdmin() {
  const ctx = await getAdminContext()
  if (!ctx) return null
  return loadPartnerWorkspace(ctx)
}
