"use server"

import { and, desc, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { invite, membership, user } from "@/lib/db/schema"
import {
  ASSIGNABLE_ROLES,
  recordAudit,
  requireOrgContext,
  type Role,
} from "@/lib/tenancy"
import { canManageTeam } from "@/lib/access"
import type { ActionResult } from "@/app/actions/properties"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function listMembers() {
  const ctx = await requireOrgContext()
  return db
    .select({
      userId: membership.userId,
      role: membership.role,
      name: user.name,
      email: user.email,
      joinedAt: membership.createdAt,
    })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(eq(membership.organizationId, ctx.organizationId))
    .orderBy(desc(membership.createdAt))
}

export async function listInvites() {
  const ctx = await requireOrgContext()
  return db
    .select({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      createdAt: invite.createdAt,
    })
    .from(invite)
    .where(and(eq(invite.organizationId, ctx.organizationId), eq(invite.status, "pending")))
    .orderBy(desc(invite.createdAt))
}

export async function inviteMember(email: string, role: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!canManageTeam(ctx.role)) return { ok: false, error: "You do not have permission to invite people." }

  const normalized = email.trim().toLowerCase()
  if (!EMAIL_RE.test(normalized)) return { ok: false, error: "Enter a valid email address." }
  if (!ASSIGNABLE_ROLES.includes(role as Role)) return { ok: false, error: "Choose a valid role." }

  // Already a member of this org?
  const existingMember = await db
    .select({ userId: membership.userId })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(and(eq(membership.organizationId, ctx.organizationId), eq(user.email, normalized)))
    .limit(1)
  if (existingMember[0]) return { ok: false, error: "That person is already on your team." }

  // Existing pending invite? Update its role rather than duplicating.
  const existingInvite = await db
    .select({ id: invite.id })
    .from(invite)
    .where(
      and(
        eq(invite.organizationId, ctx.organizationId),
        eq(invite.email, normalized),
        eq(invite.status, "pending"),
      ),
    )
    .limit(1)

  if (existingInvite[0]) {
    await db.update(invite).set({ role }).where(eq(invite.id, existingInvite[0].id))
  } else {
    await db.insert(invite).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      email: normalized,
      role,
      invitedByUserId: ctx.user.id,
    })
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "invite.sent",
    entityType: "invite",
    metadata: { email: normalized, role },
  })

  revalidatePath("/dashboard/team")
  return { ok: true, data: undefined }
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!canManageTeam(ctx.role)) return { ok: false, error: "You do not have permission to do that." }

  await db
    .update(invite)
    .set({ status: "revoked" })
    .where(and(eq(invite.id, inviteId), eq(invite.organizationId, ctx.organizationId)))

  revalidatePath("/dashboard/team")
  return { ok: true, data: undefined }
}

export async function changeMemberRole(userId: string, role: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!canManageTeam(ctx.role)) return { ok: false, error: "You do not have permission to change roles." }
  if (!ASSIGNABLE_ROLES.includes(role as Role)) return { ok: false, error: "Choose a valid role." }
  if (userId === ctx.user.id) return { ok: false, error: "You cannot change your own role." }

  // Never reassign the org owner's role, and never let a change target an owner.
  const target = await db
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.organizationId, ctx.organizationId), eq(membership.userId, userId)))
    .limit(1)
  if (!target[0]) return { ok: false, error: "That member was not found." }
  if (target[0].role === "owner") return { ok: false, error: "The workspace owner's role cannot be changed." }

  await db
    .update(membership)
    .set({ role })
    .where(and(eq(membership.organizationId, ctx.organizationId), eq(membership.userId, userId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "member.role_changed",
    entityType: "membership",
    entityId: userId,
    metadata: { role },
  })

  revalidatePath("/dashboard/team")
  return { ok: true, data: undefined }
}

export async function removeMember(userId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!canManageTeam(ctx.role)) return { ok: false, error: "You do not have permission to remove members." }
  if (userId === ctx.user.id) return { ok: false, error: "You cannot remove yourself." }

  const target = await db
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.organizationId, ctx.organizationId), eq(membership.userId, userId)))
    .limit(1)
  if (target[0]?.role === "owner") return { ok: false, error: "The workspace owner cannot be removed." }

  await db
    .delete(membership)
    .where(
      and(
        eq(membership.organizationId, ctx.organizationId),
        eq(membership.userId, userId),
        ne(membership.role, "owner"),
      ),
    )

  revalidatePath("/dashboard/team")
  return { ok: true, data: undefined }
}
