"use server"

import { and, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { assessment, cyberFleetReferral, membership, partnerSetting, property, user as userTable } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext, type OrgContext } from "@/lib/tenancy"
import { isAdminRole } from "@/lib/access"
import { createNotification } from "@/lib/notifications"
import { buildReferralCtaData, getPartnerSetting } from "@/lib/cyber-fleet-server"
import {
  ADMIN_ACTIONABLE_STATUSES,
  normalizeRange,
  PARTNER,
  REFERRAL_STATUSES,
  type ReferralStatus,
  type ScoreRange,
} from "@/lib/cyber-fleet"
import type { ActionResult } from "@/app/actions/properties"

export type ContactInput = {
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
}

/** Notifies every admin/owner in the org (best-effort). */
async function notifyAdmins(
  organizationId: string,
  payload: { title: string; body: string; href: string; propertyId?: string },
): Promise<void> {
  try {
    const admins = await db
      .select({ userId: membership.userId })
      .from(membership)
      .where(and(eq(membership.organizationId, organizationId), inArray(membership.role, ["owner", "admin"])))
    await Promise.all(
      admins.map((a) =>
        createNotification({
          organizationId,
          userId: a.userId,
          type: "cyber_fleet_eligible",
          title: payload.title,
          body: payload.body,
          href: payload.href,
          propertyId: payload.propertyId,
        }),
      ),
    )
  } catch (err) {
    console.log("[v0] notifyAdmins failed:", (err as Error).message)
  }
}

/** Owner-facing: the referral row for one of the caller's properties (or null). */
export async function getReferralForProperty(propertyId: string) {
  const ctx = await requireOrgContext()
  const [row] = await db
    .select()
    .from(cyberFleetReferral)
    .where(
      and(eq(cyberFleetReferral.propertyId, propertyId), eq(cyberFleetReferral.organizationId, ctx.organizationId)),
    )
    .limit(1)
  return row ?? null
}

/** Confirms the caller may act on a property: staff always, clients only if they own it. */
async function assertPropertyAccess(ctx: OrgContext, propertyId: string): Promise<{ ok: boolean; ownerUserId?: string; name?: string }> {
  const [prop] = await db
    .select({ createdByUserId: property.createdByUserId, name: property.name })
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false }
  if (!isAdminRole(ctx.role) && ctx.role !== "member" && prop.createdByUserId !== ctx.user.id) {
    return { ok: false }
  }
  return { ok: true, ownerUserId: prop.createdByUserId, name: prop.name }
}

/**
 * Owner requests the Cyber Fleet evaluation. Moves an eligible referral to
 * `requested`, stores their contact details, and pings the admins to hand it
 * off to the partner. Creates the row if the assessment predates the feature.
 */
export async function requestCyberFleetEvaluation(
  propertyId: string,
  contact: ContactInput,
): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  const access = await assertPropertyAccess(ctx, propertyId)
  if (!access.ok) return { ok: false, error: "Property not found." }

  const existing = await getReferralForProperty(propertyId)
  const now = new Date()
  const values = {
    status: "requested" as ReferralStatus,
    contactName: contact.contactName?.trim() || null,
    contactEmail: contact.contactEmail?.trim() || null,
    contactPhone: contact.contactPhone?.trim() || null,
    notes: contact.notes?.trim() || null,
    requestedAt: now,
    updatedAt: now,
  }

  if (existing) {
    await db.update(cyberFleetReferral).set(values).where(eq(cyberFleetReferral.id, existing.id))
  } else {
    await db.insert(cyberFleetReferral).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      propertyId,
      ownerUserId: access.ownerUserId ?? ctx.user.id,
      createdByUserId: ctx.user.id,
      ...values,
    })
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "cyber_fleet.requested",
    entityType: "property",
    entityId: propertyId,
  })

  await notifyAdmins(ctx.organizationId, {
    title: `${PARTNER.name} evaluation requested`,
    body: `${access.name ?? "A property"} owner requested a ${PARTNER.name} evaluation. Review it in the partner console.`,
    href: "/dashboard/cyber-fleet",
    propertyId,
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath("/dashboard/cyber-fleet")
  return { ok: true, data: undefined }
}

/** Owner dismisses the offer so it stops surfacing on their report. */
export async function dismissCyberFleetReferral(propertyId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  const access = await assertPropertyAccess(ctx, propertyId)
  if (!access.ok) return { ok: false, error: "Property not found." }

  const existing = await getReferralForProperty(propertyId)
  if (existing && existing.status === "eligible") {
    await db
      .update(cyberFleetReferral)
      .set({ status: "dismissed", decidedAt: new Date(), updatedAt: new Date() })
      .where(eq(cyberFleetReferral.id, existing.id))
    revalidatePath(`/dashboard/properties/${propertyId}`)
  }
  return { ok: true, data: undefined }
}

/** CTA data for one property (client property view / ReadyState). */
export async function getCyberFleetCtaData(propertyId: string) {
  const ctx = await requireOrgContext()
  const [assess] = await db
    .select({ score: assessment.roboReadyScore })
    .from(assessment)
    .where(and(eq(assessment.propertyId, propertyId), eq(assessment.organizationId, ctx.organizationId)))
    .orderBy(desc(assessment.version))
    .limit(1)
  return buildReferralCtaData({
    organizationId: ctx.organizationId,
    propertyId,
    score: assess?.score ?? null,
    userName: ctx.user.name,
    userEmail: ctx.user.email,
  })
}

export type MyReferral = {
  propertyId: string
  propertyName: string | null
  status: ReferralStatus
  roboReadyScore: number | null
}

/** Owner-facing: referrals for properties the caller owns. */
export async function listMyReferrals(): Promise<MyReferral[]> {
  const ctx = await requireOrgContext()
  const rows = await db
    .select({
      propertyId: cyberFleetReferral.propertyId,
      propertyName: property.name,
      status: cyberFleetReferral.status,
      roboReadyScore: cyberFleetReferral.roboReadyScore,
    })
    .from(cyberFleetReferral)
    .innerJoin(property, eq(property.id, cyberFleetReferral.propertyId))
    .where(
      and(
        eq(cyberFleetReferral.organizationId, ctx.organizationId),
        eq(property.createdByUserId, ctx.user.id),
      ),
    )
    .orderBy(desc(cyberFleetReferral.updatedAt))
  return rows.map((r) => ({ ...r, status: r.status as ReferralStatus }))
}

// -------------------------------------------------------------------------
// Admin console
// -------------------------------------------------------------------------

export type ReferralRow = {
  id: string
  propertyId: string
  propertyName: string | null
  status: ReferralStatus
  roboReadyScore: number | null
  ownerName: string | null
  ownerEmail: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  notes: string | null
  requestedAt: Date | null
  lastReminderAt: Date | null
  updatedAt: Date
}

/** Admin/owner: every referral in the workspace, newest activity first. */
export async function listReferrals(): Promise<ReferralRow[]> {
  const ctx = await requireOrgContext()
  if (!isAdminRole(ctx.role)) return []

  const rows = await db
    .select({
      id: cyberFleetReferral.id,
      propertyId: cyberFleetReferral.propertyId,
      propertyName: property.name,
      status: cyberFleetReferral.status,
      roboReadyScore: cyberFleetReferral.roboReadyScore,
      ownerName: userTable.name,
      ownerEmail: userTable.email,
      contactName: cyberFleetReferral.contactName,
      contactEmail: cyberFleetReferral.contactEmail,
      contactPhone: cyberFleetReferral.contactPhone,
      notes: cyberFleetReferral.notes,
      requestedAt: cyberFleetReferral.requestedAt,
      lastReminderAt: cyberFleetReferral.lastReminderAt,
      updatedAt: cyberFleetReferral.updatedAt,
    })
    .from(cyberFleetReferral)
    .leftJoin(property, eq(property.id, cyberFleetReferral.propertyId))
    .leftJoin(userTable, eq(userTable.id, cyberFleetReferral.ownerUserId))
    .where(eq(cyberFleetReferral.organizationId, ctx.organizationId))
    .orderBy(desc(cyberFleetReferral.updatedAt))

  return rows.map((r) => ({ ...r, status: r.status as ReferralStatus }))
}

/** Admin/owner: move a referral through the partner handoff pipeline. */
export async function updateReferralStatus(id: string, status: ReferralStatus): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "admin")
  } catch {
    return { ok: false, error: "Only admins can manage referrals." }
  }
  if (!REFERRAL_STATUSES.includes(status) || !ADMIN_ACTIONABLE_STATUSES.includes(status)) {
    return { ok: false, error: "Unknown status." }
  }

  await db
    .update(cyberFleetReferral)
    .set({ status, decidedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(cyberFleetReferral.id, id), eq(cyberFleetReferral.organizationId, ctx.organizationId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "cyber_fleet.status_changed",
    entityType: "cyber_fleet_referral",
    entityId: id,
    metadata: { status },
  })

  revalidatePath("/dashboard/cyber-fleet")
  return { ok: true, data: undefined }
}

/**
 * Admin/owner: nudge an owner who qualified but has not requested yet. Throttled
 * to once per 24h. This is the manual stand-in for a scheduled reminder job.
 */
export async function sendReferralReminder(id: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "admin")
  } catch {
    return { ok: false, error: "Only admins can send reminders." }
  }

  const [row] = await db
    .select()
    .from(cyberFleetReferral)
    .where(and(eq(cyberFleetReferral.id, id), eq(cyberFleetReferral.organizationId, ctx.organizationId)))
    .limit(1)
  if (!row) return { ok: false, error: "Referral not found." }
  if (row.status !== "eligible") return { ok: false, error: "Only eligible referrals can be reminded." }
  if (!row.ownerUserId) return { ok: false, error: "This referral has no owner to notify." }

  const DAY = 24 * 60 * 60 * 1000
  if (row.lastReminderAt && Date.now() - row.lastReminderAt.getTime() < DAY) {
    return { ok: false, error: "A reminder was already sent in the last 24 hours." }
  }

  const [prop] = await db
    .select({ name: property.name })
    .from(property)
    .where(eq(property.id, row.propertyId))
    .limit(1)

  await createNotification({
    organizationId: ctx.organizationId,
    userId: row.ownerUserId,
    type: "cyber_fleet_eligible",
    title: `Reminder: ${prop?.name ?? "your property"} qualifies for ${PARTNER.name}`,
    body: `Your site is a strong fit for autonomous security and robotics operations. Request your ${PARTNER.name} evaluation whenever you are ready.`,
    href: `/dashboard/properties/${row.propertyId}`,
    propertyId: row.propertyId,
  })

  await db
    .update(cyberFleetReferral)
    .set({ lastReminderAt: new Date(), updatedAt: new Date() })
    .where(eq(cyberFleetReferral.id, id))

  revalidatePath("/dashboard/cyber-fleet")
  return { ok: true, data: undefined }
}

// -------------------------------------------------------------------------
// Partner settings
// -------------------------------------------------------------------------

export async function getPartnerSettings(): Promise<ScoreRange> {
  const ctx = await requireOrgContext()
  return getPartnerSetting(ctx.organizationId)
}

/** Admin/owner: adjust the qualifying score band and enable/disable the offer. */
export async function updatePartnerSettings(input: {
  min: number
  max: number
  enabled: boolean
}): Promise<ActionResult<ScoreRange>> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "admin")
  } catch {
    return { ok: false, error: "Only admins can change partner settings." }
  }

  const range = normalizeRange(input.min, input.max, input.enabled)
  const now = new Date()

  const [existing] = await db
    .select({ id: partnerSetting.id })
    .from(partnerSetting)
    .where(eq(partnerSetting.organizationId, ctx.organizationId))
    .limit(1)

  if (existing) {
    await db
      .update(partnerSetting)
      .set({ cyberFleetEnabled: range.enabled, qualifyMinScore: range.min, qualifyMaxScore: range.max, updatedAt: now })
      .where(eq(partnerSetting.id, existing.id))
  } else {
    await db.insert(partnerSetting).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      cyberFleetEnabled: range.enabled,
      qualifyMinScore: range.min,
      qualifyMaxScore: range.max,
    })
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "cyber_fleet.settings_changed",
    entityType: "partner_setting",
    metadata: { ...range },
  })

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard/cyber-fleet")
  return { ok: true, data: range }
}
