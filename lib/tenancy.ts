import "server-only"

import { and, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  auditLog,
  intakeSubmission,
  invite,
  membership,
  organization,
  property,
  propertyAssignment,
} from "@/lib/db/schema"
import { isFieldRole, roleGrantedByInvite, type Role } from "@/lib/roles"
import {
  canAccessProperty,
  fieldClaimBelongsToUser,
  fieldCompletedIntakeBelongsToUser,
  meetsRoleRequirement,
  type PropertyAccessPurpose,
} from "@/lib/property-access-policy"

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
 * Optional explicit Super Admin bootstrap. Without SUPER_ADMIN_EMAIL configured,
 * new signups cannot bootstrap an owner account; existing owner memberships remain authoritative.
 */
export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? ""

export function isSuperAdminEmail(email: string): boolean {
  return Boolean(SUPER_ADMIN_EMAIL) && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL
}

// Field roles collect and submit on-site intake work. They intentionally rank
// below full members so member-only AI, billing, and management actions reject
// them; the allowed intake, document, and field-work paths use explicit checks.
export type SessionUser = {
  id: string
  email: string
  name: string
  emailVerified: boolean
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
    emailVerified: session.user.emailVerified,
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
    .where(and(eq(membership.userId, user.id), eq(membership.organizationId, PLATFORM_ORG_ID)))
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

/** Returns a property only when the caller's role, ownership, and assignment allow this surface. */
export async function getAuthorizedProperty(
  ctx: OrgContext,
  propertyId: string,
  purpose: PropertyAccessPurpose = "read",
) {
  const [row] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!row) return null

  let isAssigned = false
  if (isFieldRole(ctx.role)) {
    const [assignment] = await db
      .select({ id: propertyAssignment.id })
      .from(propertyAssignment)
      .where(
        and(
          eq(propertyAssignment.organizationId, ctx.organizationId),
          eq(propertyAssignment.propertyId, propertyId),
          eq(propertyAssignment.userId, ctx.user.id),
        ),
      )
      .limit(1)
    const [submittedIntake] =
      row.status === "pending_verification"
        ? await db
            .select({ status: intakeSubmission.status, createdByUserId: intakeSubmission.createdByUserId })
            .from(intakeSubmission)
            .where(
              and(
                eq(intakeSubmission.organizationId, ctx.organizationId),
                eq(intakeSubmission.propertyId, propertyId),
                eq(intakeSubmission.status, "completed"),
              ),
            )
            .orderBy(desc(intakeSubmission.updatedAt))
            .limit(1)
        : []
    isAssigned =
      Boolean(assignment) ||
      fieldClaimBelongsToUser(row.metadata, ctx.user.id) ||
      fieldCompletedIntakeBelongsToUser(submittedIntake, ctx.user.id)
  }

  return canAccessProperty({
    role: ctx.role,
    purpose,
    isOwner: row.createdByUserId === ctx.user.id,
    isAssigned,
  })
    ? row
    : null
}

/** Throws a consistent not-found response when a property is outside the caller's scope. */
export async function requireAuthorizedProperty(
  ctx: OrgContext,
  propertyId: string,
  purpose: PropertyAccessPurpose = "read",
) {
  const row = await getAuthorizedProperty(ctx, propertyId, purpose)
  if (!row) throw new Error("NOT_FOUND")
  return row
}

/** Throws unless the current role is at least `minimum`. */
export function assertRole(ctx: OrgContext, minimum: Role): void {
  if (!meetsRoleRequirement(ctx.role, minimum)) {
    throw new Error("FORBIDDEN")
  }
}

export function hasRole(ctx: OrgContext, minimum: Role): boolean {
  return meetsRoleRequirement(ctx.role, minimum)
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
 * Guarantees the signed-in user is a member of the shared platform org. Called
 * after auth to lazily provision membership on first entry. Role resolution:
 * a verified, explicitly configured Super Admin email may bootstrap the owner;
 * otherwise a verified pending invite decides the role; otherwise the account
 * defaults to Client. Membership changes and invite consumption are atomic.
 */
export async function ensureOrganization(): Promise<OrgContext> {
  const user = await requireUser()
  await ensurePlatformOrg(user.id)

  try {
    const result = await db.transaction(async (tx) => {
      let acceptedInvite: { id: string; role: string; propertyId: string | null } | null = null
      let createdMembership = false
      const [existing] = await tx
        .select({
          organizationId: membership.organizationId,
          role: membership.role,
          organizationName: organization.name,
          logoUrl: organization.logoUrl,
        })
        .from(membership)
        .innerJoin(organization, eq(organization.id, membership.organizationId))
        .where(and(eq(membership.userId, user.id), eq(membership.organizationId, PLATFORM_ORG_ID)))
        .limit(1)

      let role: Role = existing ? (existing.role as Role) : "client"

      if (isSuperAdminEmail(user.email) && user.emailVerified && (!existing || role !== "owner")) {
        role = "owner"
      } else if (user.emailVerified && (!existing || role === "client")) {
        const [pending] = await tx
          .select()
          .from(invite)
          .where(
            and(
              eq(invite.organizationId, PLATFORM_ORG_ID),
              eq(invite.email, user.email.toLowerCase()),
              eq(invite.status, "pending"),
            ),
          )
          .orderBy(desc(invite.createdAt))
          .limit(1)

        const invitedRole = pending ? roleGrantedByInvite(pending.role) : null
        if (pending && invitedRole) {
          const [claimed] = await tx
            .update(invite)
            .set({ status: "accepted", acceptedByUserId: user.id, acceptedAt: new Date() })
            .where(
              and(
                eq(invite.id, pending.id),
                eq(invite.organizationId, PLATFORM_ORG_ID),
                eq(invite.email, user.email.toLowerCase()),
                eq(invite.status, "pending"),
              ),
            )
            .returning({ id: invite.id, role: invite.role, propertyId: invite.propertyId })

          if (claimed) {
            acceptedInvite = claimed
            role = invitedRole
            if (claimed.propertyId) {
              await tx
                .update(property)
                .set({ createdByUserId: user.id, updatedAt: new Date() })
                .where(
                  and(
                    eq(property.id, claimed.propertyId),
                    eq(property.organizationId, PLATFORM_ORG_ID),
                  ),
                )
            }
          }
        }
      }

      if (existing) {
        if (role !== existing.role) {
          await tx
            .update(membership)
            .set({ role })
            .where(
              and(
                eq(membership.organizationId, PLATFORM_ORG_ID),
                eq(membership.userId, user.id),
              ),
            )
        }
        return {
          context: {
            user,
            organizationId: existing.organizationId,
            organizationName: existing.organizationName,
            role,
            logoUrl: existing.logoUrl ?? null,
          } satisfies OrgContext,
          createdMembership,
          acceptedInvite,
        }
      }

      createdMembership = true
      await tx.insert(membership).values({
        id: crypto.randomUUID(),
        organizationId: PLATFORM_ORG_ID,
        userId: user.id,
        role,
      })

      return {
        context: {
          user,
          organizationId: PLATFORM_ORG_ID,
          organizationName: PLATFORM_ORG_NAME,
          role,
          logoUrl: null,
        } satisfies OrgContext,
        createdMembership,
        acceptedInvite,
      }
    })

    if (result.createdMembership) {
      await recordAudit({
        organizationId: PLATFORM_ORG_ID,
        userId: user.id,
        action: "membership.created",
        entityType: "membership",
        metadata: { role: result.context.role },
      })
    }
    if (result.acceptedInvite) {
      await recordAudit({
        organizationId: PLATFORM_ORG_ID,
        userId: user.id,
        action: "invite.accepted",
        entityType: "invite",
        entityId: result.acceptedInvite.id,
        metadata: {
          role: result.acceptedInvite.role,
          propertyId: result.acceptedInvite.propertyId ?? undefined,
        },
      })
    }

    return result.context
  } catch (err) {
    // A concurrent first request may win the unique membership insert. If so,
    // its committed role is authoritative and this request returns that result.
    const raced = await getOrgContext()
    if (raced) return raced
    throw err
  }
}
