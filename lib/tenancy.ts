import "server-only"

import { and, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { auditLog, membership, organization } from "@/lib/db/schema"

export type Role = "owner" | "admin" | "member" | "client"

const ROLE_RANK: Record<Role, number> = {
  client: 0,
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
 * Guarantees the signed-in user has an organization. Called after auth to
 * lazily provision a personal org on first entry. Idempotent.
 */
export async function ensureOrganization(name?: string): Promise<OrgContext> {
  const user = await requireUser()
  const existing = await getOrgContext()
  if (existing) return existing

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
  }
}
