"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { assessment, intakeSubmission, networkAvEvent, networkListing, property } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { isAdminRole } from "@/lib/access"
import { deriveAmenities, resolveAmenities, type AmenityId } from "@/lib/network/amenities"
import { isNetworkVisibility, type NetworkVisibility } from "@/lib/network/visibility"
import { getListingByProperty, refreshListingLiveStatus } from "@/lib/network/data"
import { isAvEventKind, teslaIntegrationStatus, type AvActivity, type AvEventKind } from "@/lib/tesla"
import type { ActionResult } from "@/app/actions/properties"

/** Admin-facing snapshot of a property's network listing (for the detail panel). */
export type NetworkAdminState = {
  listed: boolean
  visibility: NetworkVisibility
  headline: string | null
  blurb: string | null
  derivedAmenities: AmenityId[]
  resolvedAmenities: AmenityId[]
  overrides: { added: string[]; removed: string[] }
  roboReadyScore: number | null
  publishedAt: string | null
  liveStatus: AvActivity | null
  tesla: { connected: boolean; label: string }
}

async function requireAdmin() {
  const ctx = await requireOrgContext()
  assertRole(ctx, "admin")
  return ctx
}

async function latestIntakeAnswers(propertyId: string): Promise<Record<string, unknown>> {
  const [row] = await db
    .select({ answers: intakeSubmission.answers })
    .from(intakeSubmission)
    .where(eq(intakeSubmission.propertyId, propertyId))
    .orderBy(desc(intakeSubmission.updatedAt))
    .limit(1)
  return (row?.answers as Record<string, unknown>) ?? {}
}

async function latestScore(propertyId: string): Promise<number | null> {
  const [row] = await db
    .select({ score: assessment.roboReadyScore })
    .from(assessment)
    .where(eq(assessment.propertyId, propertyId))
    .orderBy(desc(assessment.version))
    .limit(1)
  return row?.score ?? null
}

/** Reads the admin panel state for a property, deriving amenities live so the
 * checklist reflects the newest intake even before the listing is published. */
export async function getNetworkAdminState(propertyId: string): Promise<NetworkAdminState | null> {
  const ctx = await requireOrgContext()
  if (!isAdminRole(ctx.role)) return null

  const [prop] = await db
    .select({ id: property.id })
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return null

  const listing = await getListingByProperty(propertyId)
  const answers = await latestIntakeAnswers(propertyId)
  const derived = deriveAmenities(answers)
  const overridesRaw = (listing?.amenityOverrides as { added?: string[]; removed?: string[] } | null) ?? {}
  const overrides = { added: overridesRaw.added ?? [], removed: overridesRaw.removed ?? [] }
  const tesla = teslaIntegrationStatus()

  return {
    listed: !!listing && listing.visibility !== "none",
    visibility: (listing?.visibility as NetworkVisibility) ?? "none",
    headline: listing?.headline ?? null,
    blurb: listing?.blurb ?? null,
    derivedAmenities: derived,
    resolvedAmenities: resolveAmenities(derived, overrides),
    overrides,
    roboReadyScore: listing?.roboReadyScore ?? (await latestScore(propertyId)),
    publishedAt: listing?.publishedAt ? listing.publishedAt.toISOString() : null,
    liveStatus: (listing?.liveStatus as AvActivity | null) ?? null,
    tesla: { connected: tesla.connected, label: tesla.label },
  }
}

export type PublishInput = {
  visibility: NetworkVisibility
  headline?: string
  blurb?: string
  overrides?: { added?: string[]; removed?: string[] }
}

/**
 * Creates or updates a property's network listing. Re-derives amenities from
 * the latest intake, applies admin overrides, snapshots score + coordinates,
 * and sets the visibility. Admin/owner only.
 */
export async function publishListing(propertyId: string, input: PublishInput): Promise<ActionResult> {
  const ctx = await requireAdmin()
  if (!isNetworkVisibility(input.visibility)) return { ok: false, error: "Invalid visibility." }

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  const answers = await latestIntakeAnswers(propertyId)
  const derived = deriveAmenities(answers)
  const overrides = { added: input.overrides?.added ?? [], removed: input.overrides?.removed ?? [] }
  const resolved = resolveAmenities(derived, overrides)
  const score = await latestScore(propertyId)
  const now = new Date()

  const existing = await getListingByProperty(propertyId)
  const values = {
    organizationId: ctx.organizationId,
    visibility: input.visibility,
    amenities: resolved,
    derivedAmenities: derived,
    amenityOverrides: overrides,
    headline: input.headline?.trim() || null,
    blurb: input.blurb?.trim() || null,
    latitude: prop.latitude,
    longitude: prop.longitude,
    city: prop.city,
    region: prop.region,
    country: prop.country,
    roboReadyScore: score,
    publishedAt: input.visibility === "none" ? existing?.publishedAt ?? null : now,
    publishedByUserId: ctx.user.id,
    updatedAt: now,
  }

  if (existing) {
    await db.update(networkListing).set(values).where(eq(networkListing.id, existing.id))
  } else {
    await db.insert(networkListing).values({ id: crypto.randomUUID(), propertyId, liveStatus: {}, ...values })
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "network.published",
    entityType: "property",
    entityId: propertyId,
    metadata: { visibility: input.visibility, amenityCount: resolved.length },
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath("/network")
  revalidatePath("/dashboard/network")
  return { ok: true, data: undefined }
}

/** Removes a property from the network (sets visibility to `none`). */
export async function unpublishListing(propertyId: string): Promise<ActionResult> {
  const ctx = await requireAdmin()
  const existing = await getListingByProperty(propertyId)
  if (!existing) return { ok: true, data: undefined }

  await db
    .update(networkListing)
    .set({ visibility: "none", updatedAt: new Date() })
    .where(and(eq(networkListing.id, existing.id), eq(networkListing.organizationId, ctx.organizationId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "network.unpublished",
    entityType: "property",
    entityId: propertyId,
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath("/network")
  revalidatePath("/dashboard/network")
  return { ok: true, data: undefined }
}

/**
 * Records a manual AV arrival/departure/idle event and refreshes the listing's
 * cached live status. This is the manual-use path until the Tesla API is wired.
 */
export async function recordAvEvent(
  propertyId: string,
  input: { kind: AvEventKind; vehicleRef: string; label?: string },
): Promise<ActionResult<{ liveStatus: AvActivity }>> {
  const ctx = await requireAdmin()
  if (!isAvEventKind(input.kind)) return { ok: false, error: "Unknown event type." }
  const vehicleRef = input.vehicleRef.trim()
  if (!vehicleRef) return { ok: false, error: "A vehicle reference is required." }

  const listing = await getListingByProperty(propertyId)
  if (!listing) return { ok: false, error: "Publish this property to the network first." }

  await db.insert(networkAvEvent).values({
    id: crypto.randomUUID(),
    listingId: listing.id,
    propertyId,
    kind: input.kind,
    vehicleRef,
    source: "manual",
    detail: input.label ? { label: input.label.trim() } : null,
    occurredAt: new Date(),
    createdByUserId: ctx.user.id,
  })

  const liveStatus = await refreshListingLiveStatus(listing.id)

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath("/dashboard/network")
  return { ok: true, data: { liveStatus } }
}

/** Recomputes a listing's live status from the active Tesla adapter. */
export async function refreshListingStatus(propertyId: string): Promise<ActionResult<{ liveStatus: AvActivity }>> {
  await requireAdmin()
  const listing = await getListingByProperty(propertyId)
  if (!listing) return { ok: false, error: "This property is not listed." }
  const liveStatus = await refreshListingLiveStatus(listing.id)
  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { ok: true, data: { liveStatus } }
}
