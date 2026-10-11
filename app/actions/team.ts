"use server"

import { createHash, randomBytes, randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import { and, desc, eq, gt, like, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { account, auditLog, invite, membership, propertyAssignment, user, verification } from "@/lib/db/schema"
import {
  ASSIGNABLE_ROLES,
  recordAudit,
  requireOrgContext,
  type Role,
  isSuperAdminEmail,
} from "@/lib/tenancy"
import { canManageTeam } from "@/lib/access"
import { consumeRateLimit } from "@/lib/rate-limit"
import type { ActionResult } from "@/app/actions/properties"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ACCOUNT_SETUP_PREFIX = "roboready-team-account-setup:"
const ACCOUNT_SETUP_TTL_MS = 24 * 60 * 60 * 1000
const PASSWORD_MIN_LENGTH = 12
const PASSWORD_MAX_LENGTH = 128

function hashSetupToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function canCreateTeamAccounts(ctx: Awaited<ReturnType<typeof requireOrgContext>>): boolean {
  return ctx.role === "owner" || isSuperAdminEmail(ctx.user.email)
}

export async function createTeamAccount(
  input: { name: string; email: string; role: string },
): Promise<ActionResult<{ setupToken: string }>> {
  const ctx = await requireOrgContext()
  if (!canCreateTeamAccounts(ctx)) {
    return { ok: false, error: "Only the workspace owner can create login accounts." }
  }
  if (!(await consumeRateLimit(`team-account-create:${ctx.user.id}`, 8))) {
    return { ok: false, error: "Too many account creations. Please try again shortly." }
  }

  const name = input.name.trim().replace(/\s+/g, " ")
  const normalizedEmail = input.email.trim().toLowerCase()
  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: "Enter a name between 2 and 120 characters." }
  }
  if (normalizedEmail.length > 254 || !EMAIL_RE.test(normalizedEmail)) {
    return { ok: false, error: "Enter a valid email address." }
  }
  if (!ASSIGNABLE_ROLES.includes(input.role as Role)) {
    return { ok: false, error: "Choose a valid role." }
  }

  const setupToken = randomBytes(32).toString("base64url")
  const userId = randomUUID()
  const now = new Date()
  const passwordHash = await hashPassword(randomBytes(48).toString("base64url"))

  try {
    await db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, normalizedEmail))
        .limit(1)
      if (existingUser) throw new Error("TEAM_ACCOUNT_EMAIL_EXISTS")

      await tx.insert(user).values({
        id: userId,
        name,
        email: normalizedEmail,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      })
      await tx.insert(membership).values({
        id: randomUUID(),
        organizationId: ctx.organizationId,
        userId,
        role: input.role,
        createdAt: now,
      })
      await tx.insert(verification).values({
        id: randomUUID(),
        identifier: `${ACCOUNT_SETUP_PREFIX}${userId}`,
        value: hashSetupToken(setupToken),
        expiresAt: new Date(now.getTime() + ACCOUNT_SETUP_TTL_MS),
        createdAt: now,
        updatedAt: now,
      })
      await tx
        .update(invite)
        .set({ status: "revoked" })
        .where(
          and(
            eq(invite.organizationId, ctx.organizationId),
            eq(invite.email, normalizedEmail),
            eq(invite.status, "pending"),
          ),
        )
      await tx.insert(auditLog).values({
        id: randomUUID(),
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "team.account_created",
        entityType: "user",
        entityId: userId,
        metadata: { email: normalizedEmail, role: input.role },
        createdAt: now,
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message === "TEAM_ACCOUNT_EMAIL_EXISTS") {
      return { ok: false, error: "An account already exists for that email address." }
    }
    if ((error as { code?: string })?.code === "23505") {
      return { ok: false, error: "An account already exists for that email address." }
    }
    console.error("[v0] Team account creation failed:", error)
    return { ok: false, error: "Could not create the account. Please try again." }
  }

  revalidatePath("/dashboard/team")
  return { ok: true, data: { setupToken } }
}

export async function completeAccountSetup(
  token: string,
  password: string,
): Promise<ActionResult<{ email: string }>> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return { ok: false, error: "This setup link is invalid or has expired. Ask your team owner for a new link." }
  }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: `Choose a password between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.` }
  }

  const tokenHash = hashSetupToken(token)
  if (!(await consumeRateLimit(`team-account-setup:${tokenHash.slice(0, 16)}`, 8))) {
    return { ok: false, error: "Too many attempts. Ask your team owner for a new setup link." }
  }
  const passwordHash = await hashPassword(password)
  const now = new Date()

  const result = await db.transaction(async (tx) => {
    const [setup] = await tx
      .select({ id: verification.id, identifier: verification.identifier })
      .from(verification)
      .where(
        and(
          eq(verification.value, tokenHash),
          like(verification.identifier, `${ACCOUNT_SETUP_PREFIX}%`),
          gt(verification.expiresAt, now),
        ),
      )
      .limit(1)
      .for("update")
    if (!setup) return null

    const userId = setup.identifier.slice(ACCOUNT_SETUP_PREFIX.length)
    const [setupUser] = await tx
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    if (!setupUser) return null

    const [credential] = await tx
      .update(account)
      .set({ password: passwordHash, updatedAt: now })
      .where(
        and(
          eq(account.userId, userId),
          eq(account.accountId, userId),
          eq(account.providerId, "credential"),
        ),
      )
      .returning({ id: account.id })
    if (!credential) return null

    await tx.update(user).set({ emailVerified: true, updatedAt: now }).where(eq(user.id, userId))
    await tx.delete(verification).where(eq(verification.id, setup.id))
    return { email: setupUser.email }
  })

  if (!result) {
    return { ok: false, error: "This setup link is invalid or has expired. Ask your team owner for a new link." }
  }
  return { ok: true, data: result }
}

export async function listMembers() {
  const ctx = await requireOrgContext()
  if (!canManageTeam(ctx.role)) return []
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
  if (!canManageTeam(ctx.role)) return []
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
  if (!(await consumeRateLimit(`team-invite:${ctx.user.id}`, 8))) {
    return { ok: false, error: "Too many invitations. Please try again shortly." }
  }

  const normalized = email.trim().toLowerCase()
  if (!EMAIL_RE.test(normalized)) return { ok: false, error: "Enter a valid email address." }
  if (!ASSIGNABLE_ROLES.includes(role as Role)) return { ok: false, error: "Choose a valid role." }
  if (ctx.role === "admin" && role === "admin") {
    return { ok: false, error: "Only the workspace owner can invite another admin." }
  }

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
  if (ctx.role === "admin" && (target[0].role === "admin" || role === "admin")) {
    return { ok: false, error: "Only the workspace owner can manage admin roles." }
  }

  await db
    .update(membership)
    .set({ role })
    .where(and(eq(membership.organizationId, ctx.organizationId), eq(membership.userId, userId)))

  if (["operator", "vendor", "contractor"].includes(role)) {
    await db
      .update(propertyAssignment)
      .set({ role })
      .where(and(eq(propertyAssignment.organizationId, ctx.organizationId), eq(propertyAssignment.userId, userId)))
  } else {
    await db
      .delete(propertyAssignment)
      .where(and(eq(propertyAssignment.organizationId, ctx.organizationId), eq(propertyAssignment.userId, userId)))
  }

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
  if (!target[0]) return { ok: false, error: "That member was not found." }
  if (target[0].role === "owner") return { ok: false, error: "The workspace owner cannot be removed." }
  if (ctx.role === "admin" && target[0].role === "admin") {
    return { ok: false, error: "Only the workspace owner can remove an admin." }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(propertyAssignment)
      .where(and(eq(propertyAssignment.organizationId, ctx.organizationId), eq(propertyAssignment.userId, userId)))

    await tx
      .delete(membership)
      .where(
        and(
          eq(membership.organizationId, ctx.organizationId),
          eq(membership.userId, userId),
          ne(membership.role, "owner"),
        ),
      )
  })

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "member.removed",
    entityType: "membership",
    entityId: userId,
  })

  revalidatePath("/dashboard/team")
  return { ok: true, data: undefined }
}
