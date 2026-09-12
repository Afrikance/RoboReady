"use server"

import { and, desc, eq, inArray, type SQL } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { assessment, payment, property, propertyAssignment } from "@/lib/db/schema"
import { isFieldRole, recordAudit, requireOrgContext, type OrgContext } from "@/lib/tenancy"
import { canCreateProspect } from "@/lib/access"
import { tierRank, type AssessmentTierId } from "@/lib/products"

/**
 * Resolves how the current user's property queries should be narrowed within
 * the shared org:
 *  - Admins / Super Admin (and legacy members): see everything → no extra filter.
 *  - Clients (property owners): see only the properties they created.
 *  - Field roles (operator/vendor/contractor): see only assigned properties;
 *    with zero assignments they are `blocked` and see nothing.
 */
async function propertyScope(ctx: OrgContext): Promise<{ blocked: boolean; extra?: SQL }> {
  if (isFieldRole(ctx.role)) {
    const rows = await db
      .select({ propertyId: propertyAssignment.propertyId })
      .from(propertyAssignment)
      .where(
        and(
          eq(propertyAssignment.organizationId, ctx.organizationId),
          eq(propertyAssignment.userId, ctx.user.id),
        ),
      )
    const ids = rows.map((r) => r.propertyId)
    if (ids.length === 0) return { blocked: true }
    return { blocked: false, extra: inArray(property.id, ids) }
  }
  if (ctx.role === "client") {
    return { blocked: false, extra: eq(property.createdByUserId, ctx.user.id) }
  }
  return { blocked: false }
}

export type PropertyInput = {
  name: string
  propertyType: string
  addressLine1?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
  phone?: string
  latitude?: number | null
  longitude?: number | null
  squareFootage?: number | null
  floors?: number | null
  yearBuilt?: number | null
  /** When true, the property enters the prospect database instead of the direct intake flow. */
  asProspect?: boolean
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function listProperties() {
  const ctx = await requireOrgContext()
  const scope = await propertyScope(ctx)
  if (scope.blocked) return []

  return db
    .select()
    .from(property)
    .where(
      scope.extra
        ? and(eq(property.organizationId, ctx.organizationId), scope.extra)
        : eq(property.organizationId, ctx.organizationId),
    )
    .orderBy(desc(property.updatedAt))
}

// Statuses that are still in the prospecting funnel (not yet real properties).
// They live in the Prospect DB / Field Work / Verification queues and only
// surface on the Properties page once an admin verifies them.
const FUNNEL_ONLY_STATUSES = new Set(["prospect", "handover", "pending_verification"])

/** Latest assessment score per property, for list/overview badges. */
export async function listPropertiesWithScores() {
  const ctx = await requireOrgContext()
  const props = (await listProperties()).filter((p) => !FUNNEL_ONLY_STATUSES.has(p.status))

  const scores = await db
    .select({
      propertyId: assessment.propertyId,
      score: assessment.roboReadyScore,
      version: assessment.version,
    })
    .from(assessment)
    .where(eq(assessment.organizationId, ctx.organizationId))
    .orderBy(desc(assessment.version))

  const latest = new Map<string, number | null>()
  for (const s of scores) {
    if (!latest.has(s.propertyId)) latest.set(s.propertyId, s.score)
  }

  return props.map((p) => ({ ...p, latestScore: latest.get(p.id) ?? null }))
}

export type PropertyTableRow = {
  id: string
  name: string
  city: string | null
  region: string | null
  propertyType: string
  status: string
  latestScore: number | null
  purchasedTier: AssessmentTierId | null
  hasReport: boolean
}

/**
 * Flattened property rows for the list/table view: score, best paid assessment
 * tier, and whether a report has been generated. Reuses the same funnel and
 * field-role scoping as the card grid via listPropertiesWithScores.
 */
export async function listPropertiesForTable(): Promise<PropertyTableRow[]> {
  const ctx = await requireOrgContext()
  const props = await listPropertiesWithScores()

  // Best paid assessment tier per property, in one org-scoped query.
  const paid = await db
    .select({ propertyId: payment.propertyId, tier: payment.tier })
    .from(payment)
    .where(
      and(
        eq(payment.organizationId, ctx.organizationId),
        eq(payment.kind, "assessment"),
        eq(payment.status, "paid"),
      ),
    )
  const bestTier = new Map<string, AssessmentTierId>()
  for (const r of paid) {
    if (!r.propertyId || !r.tier) continue
    const current = bestTier.get(r.propertyId) ?? null
    if (tierRank(r.tier as AssessmentTierId) > tierRank(current)) {
      bestTier.set(r.propertyId, r.tier as AssessmentTierId)
    }
  }

  return props.map((p) => ({
    id: p.id,
    name: p.name,
    city: p.city,
    region: p.region,
    propertyType: p.propertyType,
    status: p.status,
    latestScore: p.latestScore,
    purchasedTier: bestTier.get(p.id) ?? null,
    hasReport: (p.metadata as { report?: unknown } | null)?.report != null,
  }))
}

export async function getProperty(id: string) {
  const ctx = await requireOrgContext()
  const scope = await propertyScope(ctx)
  if (scope.blocked) return null

  const rows = await db
    .select()
    .from(property)
    .where(
      scope.extra
        ? and(eq(property.id, id), eq(property.organizationId, ctx.organizationId), scope.extra)
        : and(eq(property.id, id), eq(property.organizationId, ctx.organizationId)),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function createProperty(input: PropertyInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrgContext()
  // Any member of the org can add a property they own — Clients onboard their
  // own buildings this way. Sending a property into the prospect database is a
  // staff-only action, so gate that path separately.
  if (input.asProspect && !canCreateProspect(ctx.role)) {
    return { ok: false, error: "You do not have permission to add prospects." }
  }

  const name = input.name?.trim()
  if (!name || name.length < 2) {
    return { ok: false, error: "Property name is required." }
  }

  const id = crypto.randomUUID()
  await db.insert(property).values({
    id,
    organizationId: ctx.organizationId,
    createdByUserId: ctx.user.id,
    name,
    propertyType: input.propertyType || "commercial",
    addressLine1: input.addressLine1 || null,
    city: input.city || null,
    region: input.region || null,
    postalCode: input.postalCode || null,
    country: input.country || null,
    phone: input.phone || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    squareFootage: input.squareFootage ?? null,
    floors: input.floors ?? null,
    yearBuilt: input.yearBuilt ?? null,
    status: input.asProspect ? "prospect" : "intake",
    metadata: input.asProspect ? { pipeline: { source: "manual" } } : null,
  })

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: input.asProspect ? "prospect.created" : "property.created",
    entityType: "property",
    entityId: id,
    metadata: { name },
  })

  revalidatePath("/dashboard/properties")
  revalidatePath("/dashboard/properties/database")
  revalidatePath("/dashboard")
  return { ok: true, data: { id } }
}

export async function updatePropertyStatus(id: string, status: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  await db
    .update(property)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(property.id, id), eq(property.organizationId, ctx.organizationId)))
  revalidatePath(`/dashboard/properties/${id}`)
  return { ok: true, data: undefined }
}
