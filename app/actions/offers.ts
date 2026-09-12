"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { invite, membership, property, user } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { getAssessmentTier, type AssessmentTierId } from "@/lib/products"
import { createNotification } from "@/lib/notifications"
import type { ActionResult } from "@/app/actions/properties"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Solicited flow: staff pre-identify a property and invite its owner to buy an
 * assessment. The invite carries the property + offered tier so that when the
 * client signs in the property is handed to them (see consumePendingInviteRole)
 * and their tracker opens straight on the purchase step for that tier.
 *
 * If the invited email already belongs to a user, the handover + notification
 * happen immediately; otherwise it waits for them to sign up.
 */
export async function offerAssessment(
  propertyId: string,
  email: string,
  tierId: AssessmentTierId,
): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to offer assessments." }
  }

  const normalized = email.trim().toLowerCase()
  if (!EMAIL_RE.test(normalized)) return { ok: false, error: "Enter a valid email address." }
  if (!getAssessmentTier(tierId)) return { ok: false, error: "Choose a valid assessment tier." }

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  // Does this email already belong to a user we can hand the property to now?
  const [existingUser] = await db.select().from(user).where(eq(user.email, normalized)).limit(1)

  if (existingUser) {
    // Hand the property to the existing client and notify them immediately.
    await db
      .update(property)
      .set({ createdByUserId: existingUser.id, updatedAt: new Date() })
      .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))

    // Make sure they are at least a client member of the org.
    const [member] = await db
      .select({ userId: membership.userId })
      .from(membership)
      .where(and(eq(membership.organizationId, ctx.organizationId), eq(membership.userId, existingUser.id)))
      .limit(1)
    if (!member) {
      await db.insert(membership).values({
        id: crypto.randomUUID(),
        organizationId: ctx.organizationId,
        userId: existingUser.id,
        role: "client",
      })
    }

    await db.insert(invite).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      email: normalized,
      role: "client",
      status: "accepted",
      invitedByUserId: ctx.user.id,
      acceptedByUserId: existingUser.id,
      acceptedAt: new Date(),
      propertyId,
      offeredTier: tierId,
    })

    await createNotification({
      organizationId: ctx.organizationId,
      userId: existingUser.id,
      type: "assessment_offer",
      title: `You've been invited to assess ${prop.name}`,
      body: "A RoboReady assessment has been set up for your property. Choose your package to get started.",
      href: `/dashboard/properties/${propertyId}`,
      propertyId,
    })
  } else {
    // Reuse a pending offer for the same email+property, else create one.
    const [pending] = await db
      .select({ id: invite.id })
      .from(invite)
      .where(
        and(
          eq(invite.organizationId, ctx.organizationId),
          eq(invite.email, normalized),
          eq(invite.propertyId, propertyId),
          eq(invite.status, "pending"),
        ),
      )
      .limit(1)

    if (pending) {
      await db.update(invite).set({ offeredTier: tierId, role: "client" }).where(eq(invite.id, pending.id))
    } else {
      await db.insert(invite).values({
        id: crypto.randomUUID(),
        organizationId: ctx.organizationId,
        email: normalized,
        role: "client",
        status: "pending",
        invitedByUserId: ctx.user.id,
        propertyId,
        offeredTier: tierId,
      })
    }
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "assessment.offered",
    entityType: "property",
    entityId: propertyId,
    metadata: { email: normalized, tier: tierId, existingUser: Boolean(existingUser) },
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { ok: true, data: undefined }
}
