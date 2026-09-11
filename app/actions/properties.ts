"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { assessment, property } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext } from "@/lib/tenancy"

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
  return db
    .select()
    .from(property)
    .where(eq(property.organizationId, ctx.organizationId))
    .orderBy(desc(property.updatedAt))
}

/** Latest assessment score per property, for list/overview badges. */
export async function listPropertiesWithScores() {
  const ctx = await requireOrgContext()
  const props = await listProperties()

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

export async function getProperty(id: string) {
  const ctx = await requireOrgContext()
  const rows = await db
    .select()
    .from(property)
    .where(and(eq(property.id, id), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  return rows[0] ?? null
}

export async function createProperty(input: PropertyInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to add properties." }
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
