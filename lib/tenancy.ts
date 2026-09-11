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
export { FIELD_ROLES, isFieldRole, ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/roles"
export type { Role, FieldRole } from "@/lib/roles"

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

/**
 * Consumes the oldest pending invite matching this user's email, joining them
 * to that org with the invited role. This is how a Client / Field Operator /
 * Vendor / Contractor "logs in": an owner/admin invites their email, and on
 * first entry the invite becomes their membership instead of a personal org.
 * Returns the resulting OrgContext, or null when there is no pending invite.
 */
async function acceptPendingInviteFor(user: SessionUser): Promise<OrgContext | null> {
  const pending = await db
    .select()
    .from(invite)
    .where(and(eq(invite.email, user.email.toLowerCase()), eq(invite.status, "pending")))
    .orderBy(desc(invite.createdAt))
    .limit(1)

  const row = pending[0]
  if (!row) return null

  try {
    await db.insert(membership).values({
      id: crypto.randomUUID(),
      organizationId: row.organizationId,
      userId: user.id,
      role: row.role,
    })
  } catch (err) {
    // Already a member (unique orgUser) — fine, just mark the invite accepted.
    console.log("[v0] invite membership existed:", (err as Error).message)
  }

  await db
    .update(invite)
    .set({ status: "accepted", acceptedByUserId: user.id, acceptedAt: new Date() })
    .where(eq(invite.id, row.id))

  await recordAudit({
    organizationId: row.organizationId,
    userId: user.id,
    action: "invite.accepted",
    entityType: "invite",
    entityId: row.id,
    metadata: { role: row.role },
  })

  return getOrgContext()
}

/**
 * Guarantees the signed-in user has an organization. Called after auth to
 * lazily provision membership on first entry. Prefers accepting a pending
 * invite (joining an existing org with the invited role); only when there is
 * none does it provision a personal org owned by the user. Idempotent.
 */
export async function ensureOrganization(name?: string): Promise<OrgContext> {
  const user = await requireUser()
  const existing = await getOrgContext()
  if (existing) return existing

  const invited = await acceptPendingInviteFor(user)
  if (invited) return invited

  const orgId = crypto.randomUUID()
  const orgName = name?.trim() || `${user.name.split(" ")[0]}'s Workspace`
  const slug = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${orgId.slice(0, 6)}`

  try {
    await db.insert(organization).values({
      id: orgId,
      name: orgName,
      slug,
      createdByUserId: user.id,
    })

    await db.insert(membership).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: user.id,
      role: "owner",
    })

    await recordAudit({
      organizationId: orgId,
      userId: user.id,
      action: "organization.created",
      entityType: "organization",
      entityId: orgId,
    })
  } catch (err) {
    // A concurrent request (page + layout render at the same time) may have
    // provisioned the org first, tripping the membership unique constraint.
    // Re-read and return the winner rather than failing.
    console.log("[v0] ensureOrganization race, re-reading:", (err as Error).message)
    const raced = await getOrgContext()
    if (raced) return raced
    throw err
  }

  return {
    user,
    organizationId: orgId,
    organizationName: orgName,
    role: "owner",
    logoUrl: null,
  }
}
