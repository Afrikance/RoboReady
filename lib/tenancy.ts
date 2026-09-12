import "server-only"

import { and, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { auditLog, invite, membership, organization } from "@/lib/db/schema"
import { type Role } from "@/lib/roles"

// Re-export the client-safe role primitives so existing `@/lib/tenancy`
// importers keep working. The definitions live in lib/roles.ts (no server-only
// deps) so the client bundle can share them.
export { FIELD_ROLES, isFieldRole, ASSIGNABLE_ROLES, ROLE_LABELS, isClient } from "@/lib/roles"
export type { Role, FieldRole } from "@/lib/roles"

// RoboReady runs as a single shared platform organization rather than a
// personal workspace per account. Everyone joins this one org; visibility is
// controlled by role (see lib/access.ts) and per-user scoping (see the
// property actions), not by separate tenants.
export const PLATFORM_ORG_ID = "00000000-0000-4000-8000-000000000001"
const PLATFORM_ORG_SLUG = "roboready"
const PLATFORM_ORG_NAME = "RoboReady"

/**
 * The sole Super Admin (platform owner). Everyone else self-signing up becomes
 * a Client. Overridable via env so the owner account can change without a code
 * change; defaults to the designated launch owner.
 */
export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "snapptech101@gmail.com").toLowerCase()

export function isSuperAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL
}

// Field roles (operator, vendor, contractor) collect / build out on-site work.
// They share the "member" rank so existing `assertRole(ctx, "member")` gates
// (running intake/planners) keep working unchanged; the narrower per-surface
// gating uses explicit role checks in lib/access.ts, not this hierarchy.
const ROLE_RANK: Record<Role, number> = {
  client: 0,
  operator: 1,
  vendor: 1,
  contractor: 1,
  member: 1,
  admin: 2,
  owner: 3,
}

export type SessionUser = {
  id: string
  email: string
  name: string
}

export type OrgContext = {
  user: SessionUser
  organizationId: string
  organizationName: string
  role: Role
  logoUrl: string | null
}

/** Returns the signed-in user or null. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new Error("UNAUTHENTICATED")
  return user
}

/**
 * Resolves the user's primary organization + role. In MVP 1 a user belongs to
 * a single org (created at first sign-in via ensureOrganization). Returns null
 * if the user has no membership yet.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const user = await getSessionUser()
  if (!user) return null

  const rows = await db
    .select({
      organizationId: membership.organizationId,
      role: membership.role,
      organizationName: organization.name,
      logoUrl: organization.logoUrl,
    })
    .from(membership)
    .innerJoin(organization, eq(organization.id, membership.organizationId))
    .where(eq(membership.userId, user.id))
    .orderBy(desc(membership.createdAt))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    user,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    role: row.role as Role,
    logoUrl: row.logoUrl ?? null,
  }
}

export async function requireOrgContext(): Promise<OrgContext> {
  const ctx = await getOrgContext()
  if (!ctx) throw new Error("NO_ORGANIZATION")
  return ctx
}

/** Throws unless the current role is at least `minimum`. */
export function assertRole(ctx: OrgContext, minimum: Role): void {
  if (ROLE_RANK[ctx.role] < ROLE_RANK[minimum]) {
    throw new Error("FORBIDDEN")
  }
}

export function hasRole(ctx: OrgContext, minimum: Role): boolean {
  return ROLE_RANK[ctx.role] >= ROLE_RANK[minimum]
}

/** Append-only audit trail entry. Best-effort: never blocks the caller. */
export async function recordAudit(input: {
  organizationId: string | null
  userId: string | null
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const hdrs = await headers()
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
      ipAddress: hdrs.get("x-forwarded-for") ?? null,
    })
  } catch (err) {
    console.log("[v0] recordAudit failed:", (err as Error).message)
  }
}

/** Find-or-create the single shared platform organization. Idempotent. */
async function ensurePlatformOrg(createdByUserId: string): Promise<void> {
  const existing = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, PLATFORM_ORG_ID))
    .limit(1)
  if (existing[0]) return

  try {
    await db.insert(organization).values({
      id: PLATFORM_ORG_ID,
      name: PLATFORM_ORG_NAME,
      slug: PLATFORM_ORG_SLUG,
      createdByUserId,
    })
  } catch (err) {
    // A concurrent request created it first — fine.
    console.log("[v0] ensurePlatformOrg race:", (err as Error).message)
  }
}

/**
 * Consumes the oldest pending invite matching this user's email and returns the
 * role it grants. This is how a Client / Field Operator / Vendor / Contractor /
 * Sub-Admin is provisioned: a Super Admin or Sub-Admin invites their email, and
 * on first entry the invite decides their role in the shared org. An invite can
 * never mint the Super Admin (owner) — that is reserved for the one designated
 * account — so an "owner" invite is downgraded to Sub-Admin. Returns null when
 * there is no pending invite.
 */
async function consumePendingInviteRole(user: SessionUser): Promise<Role | null> {
  const pending = await db
    .select()
    .from(invite)
    .where(and(eq(invite.email, user.email.toLowerCase()), eq(invite.status, "pending")))
    .orderBy(desc(invite.createdAt))
    .limit(1)

  const row = pending[0]
  if (!row) return null

  await db
    .update(invite)
    .set({ status: "accepted", acceptedByUserId: user.id, acceptedAt: new Date() })
    .where(eq(invite.id, row.id))

  await recordAudit({
    organizationId: PLATFORM_ORG_ID,
    userId: user.id,
    action: "invite.accepted",
    entityType: "invite",
    entityId: row.id,
    metadata: { role: row.role },
  })

  return row.role === "owner" ? "admin" : (row.role as Role)
}

/**
 * Guarantees the signed-in user is a member of the shared platform org. Called
 * after auth to lazily provision membership on first entry. Role resolution:
 * the single Super Admin email always becomes owner; otherwise a pending invite
 * decides the role; otherwise the account defaults to Client. Idempotent, and
 * it keeps the Super Admin's membership correct if it predates this model.
 */
export async function ensureOrganization(): Promise<OrgContext> {
  const user = await requireUser()
  await ensurePlatformOrg(user.id)

  const existing = await getOrgContext()
  if (existing) {
    if (isSuperAdminEmail(user.email) && existing.role !== "owner") {
      await db.update(membership).set({ role: "owner" }).where(eq(membership.userId, user.id))
      return { ...existing, role: "owner" }
    }
    return existing
  }

  let role: Role = "client"
  if (isSuperAdminEmail(user.email)) {
    role = "owner"
  } else {
    const invitedRole = await consumePendingInviteRole(user)
    if (invitedRole) role = invitedRole
  }

  try {
    await db.insert(membership).values({
      id: crypto.randomUUID(),
      organizationId: PLATFORM_ORG_ID,
      userId: user.id,
      role,
    })

    await recordAudit({
      organizationId: PLATFORM_ORG_ID,
      userId: user.id,
      action: "membership.created",
      entityType: "membership",
      metadata: { role },
    })
  } catch (err) {
    // A concurrent request (page + layout render at the same time) may have
    // provisioned the membership first, tripping the unique constraint.
    // Re-read and return the winner rather than failing.
    console.log("[v0] ensureOrganization race, re-reading:", (err as Error).message)
    const raced = await getOrgContext()
    if (raced) return raced
    throw err
  }

  return {
    user,
    organizationId: PLATFORM_ORG_ID,
    organizationName: PLATFORM_ORG_NAME,
    role,
    logoUrl: null,
  }
}
