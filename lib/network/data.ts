import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  assessment,
  intakeSubmission,
  networkAvEvent,
  networkListing,
  payment,
  property,
  serviceSubscription,
} from "@/lib/db/schema"
import { getOrgContext, getSessionUser } from "@/lib/tenancy"
import { isAdminRole } from "@/lib/access"
import { tierRank } from "@/lib/products"
import { deriveAmenities, resolveAmenities, type AmenityId } from "@/lib/network/amenities"
import {
  allowedVisibilitiesFor,
  type NetworkAudience,
  type NetworkVisibility,
} from "@/lib/network/visibility"
import { createTeslaAdapter, summarizeAvEvents, type AvActivity, type AvEventInput } from "@/lib/tesla"

export type NetworkListingRow = typeof networkListing.$inferSelect

/** A listing joined with its property, shaped for cards + map markers. */
export type NetworkListingView = {
  id: string
  propertyId: string
  visibility: NetworkVisibility
  name: string
  headline: string | null
  blurb: string | null
  propertyType: string
  address: string
  city: string | null
  region: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  roboReadyScore: number | null
  amenities: AmenityId[]
  liveStatus: AvActivity | null
  publishedAt: Date | null
}

export type NetworkFilter = {
  q?: string
  amenities?: string[]
  /** "and" = must have all selected; "or" = any. Defaults to "and". */
  match?: "and" | "or"
  center?: { lat: number; lng: number }
  radiusMiles?: number
}

function fullAddress(p: { addressLine1: string | null; city: string | null; region: string | null; country: string | null }): string {
  return [p.addressLine1, p.city, p.region, p.country].filter(Boolean).join(", ")
}

function parseLiveStatus(v: unknown): AvActivity | null {
  if (!v || typeof v !== "object") return null
  const o = v as Record<string, unknown>
  if (typeof o.at !== "string") return null
  return o as unknown as AvActivity
}

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** True if the user holds any active RoboArrival Care Plan subscription. */
export async function isCarePlanMember(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: serviceSubscription.id })
    .from(serviceSubscription)
    .where(and(eq(serviceSubscription.createdByUserId, userId), eq(serviceSubscription.status, "active")))
    .limit(1)
  return rows.length > 0
}

/**
 * RoboSearch (AI natural-language network search) is a premium feature that
 * unlocks at the "Quality Pro Report" tier and above. Access is an
 * organization-level entitlement: an org may use it once it owns at least one
 * property assessed at `pro` or `premium`. Admins always have access.
 *
 * Grounded in real paid tiers (the `payment` rows), never a client claim.
 * Returns false for anonymous visitors (no org). Never throws.
 */
export async function orgHasProNetworkAccess(): Promise<boolean> {
  const ctx = await getOrgContext()
  if (!ctx) return false
  if (isAdminRole(ctx.role)) return true

  const rows = await db
    .select({ tier: payment.tier })
    .from(payment)
    .where(
      and(
        eq(payment.organizationId, ctx.organizationId),
        eq(payment.kind, "assessment"),
        eq(payment.status, "paid"),
      ),
    )
  const proRank = tierRank("pro")
  return rows.some((r) => r.tier != null && tierRank(r.tier) >= proRank)
}

export type ResolvedAudience = {
  audience: NetworkAudience
  userId: string | null
  isAdmin: boolean
  isCarePlan: boolean
}

/** Determines what the current viewer is allowed to see. Never throws. */
export async function resolveNetworkAudience(): Promise<ResolvedAudience> {
  const user = await getSessionUser()
  if (!user) return { audience: "public", userId: null, isAdmin: false, isCarePlan: false }

  const ctx = await getOrgContext()
  const admin = ctx ? isAdminRole(ctx.role) : false
  if (admin) return { audience: "admin", userId: user.id, isAdmin: true, isCarePlan: true }

  const carePlan = await isCarePlanMember(user.id)
  if (carePlan) return { audience: "care_plan", userId: user.id, isAdmin: false, isCarePlan: true }

  return { audience: "signed_in", userId: user.id, isAdmin: false, isCarePlan: false }
}

function mapView(
  l: NetworkListingRow,
  p: { name: string; addressLine1: string | null; city: string | null; region: string | null; country: string | null; propertyType: string },
): NetworkListingView {
  return {
    id: l.id,
    propertyId: l.propertyId,
    visibility: l.visibility as NetworkVisibility,
    name: p.name,
    headline: l.headline,
    blurb: l.blurb,
    propertyType: p.propertyType,
    address: fullAddress(p),
    city: l.city,
    region: l.region,
    country: l.country,
    latitude: l.latitude,
    longitude: l.longitude,
    roboReadyScore: l.roboReadyScore,
    amenities: (Array.isArray(l.amenities) ? (l.amenities as string[]) : []).filter(Boolean) as AmenityId[],
    liveStatus: parseLiveStatus(l.liveStatus),
    publishedAt: l.publishedAt,
  }
}

/**
 * Reads listings visible to `audience`, applying amenity / text / radius
 * filters. `none`-visibility listings are never returned to a browsing
 * audience (that is handled by the allowed-visibility set).
 */
export async function searchNetwork(filter: NetworkFilter, audience: NetworkAudience): Promise<NetworkListingView[]> {
  const allowed = allowedVisibilitiesFor(audience)
  if (allowed.length === 0) return []

  const rows = await db
    .select({
      listing: networkListing,
      name: property.name,
      addressLine1: property.addressLine1,
      city: property.city,
      region: property.region,
      country: property.country,
      propertyType: property.propertyType,
    })
    .from(networkListing)
    .innerJoin(property, eq(property.id, networkListing.propertyId))
    .where(inArray(networkListing.visibility, allowed))
    .orderBy(desc(networkListing.roboReadyScore), desc(networkListing.publishedAt))

  let views = rows.map((r) =>
    mapView(r.listing, {
      name: r.name,
      addressLine1: r.addressLine1,
      city: r.city,
      region: r.region,
      country: r.country,
      propertyType: r.propertyType,
    }),
  )

  const wanted = (filter.amenities ?? []).filter(Boolean)
  if (wanted.length > 0) {
    const mode = filter.match ?? "and"
    views = views.filter((v) => {
      const have = new Set(v.amenities)
      return mode === "and" ? wanted.every((a) => have.has(a as AmenityId)) : wanted.some((a) => have.has(a as AmenityId))
    })
  }

  const q = filter.q?.trim().toLowerCase()
  if (q) {
    views = views.filter((v) =>
      [v.name, v.address, v.headline, v.city, v.region].filter(Boolean).some((s) => s!.toLowerCase().includes(q)),
    )
  }

  if (filter.center && filter.radiusMiles && filter.radiusMiles > 0) {
    const c = filter.center
    views = views.filter(
      (v) => v.latitude != null && v.longitude != null && haversineMiles(c, { lat: v.latitude, lng: v.longitude }) <= filter.radiusMiles!,
    )
  }

  return views
}

export async function getListingByProperty(propertyId: string): Promise<NetworkListingRow | null> {
  const [row] = await db.select().from(networkListing).where(eq(networkListing.propertyId, propertyId)).limit(1)
  return row ?? null
}

/** Latest N recorded AV events for a listing, newest first. */
export async function recentAvEvents(listingId: string, limit = 50): Promise<AvEventInput[]> {
  const rows = await db
    .select()
    .from(networkAvEvent)
    .where(eq(networkAvEvent.listingId, listingId))
    .orderBy(desc(networkAvEvent.occurredAt))
    .limit(limit)
  return rows.map((r) => ({
    vehicleRef: r.vehicleRef,
    kind: r.kind as AvEventInput["kind"],
    occurredAt: r.occurredAt,
    source: r.source as AvEventInput["source"],
    label: (r.detail as { label?: string } | null)?.label,
  }))
}

/**
 * Computes and caches the live AV status for a listing via the active Tesla
 * adapter. With no Tesla connection the mock provider reduces the recorded
 * events; when connected, the live provider is used. Returns the snapshot.
 */
export async function refreshListingLiveStatus(listingId: string): Promise<AvActivity> {
  const adapter = createTeslaAdapter()
  const events = await recentAvEvents(listingId)
  let activity: AvActivity
  try {
    activity = await adapter.getSiteActivity({ listingId, events })
  } catch {
    // Live provider not ready — fall back to the recorded (manual) events so
    // the panel still shows something truthful, flagged as non-live.
    activity = summarizeAvEvents(listingId, events, { source: "manual", live: false })
  }
  await db
    .update(networkListing)
    .set({ liveStatus: activity, updatedAt: new Date() })
    .where(eq(networkListing.id, listingId))
  return activity
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

/**
 * The visibility every property is auto-listed at when it first enters the
 * network. Signed-in users (and above) can discover it immediately; anonymous
 * visitors on the public /network page cannot — that avoids broadcasting a
 * client's name + street address on the open internet. An admin can promote a
 * listing to `public` or hide it (`none`) from the property's network panel.
 */
const AUTO_LIST_DEFAULT_VISIBILITY: NetworkVisibility = "signed_in"

/** True if the property has at least one assessment (any RoboReady score). */
async function hasAnyAssessment(propertyId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: assessment.id })
    .from(assessment)
    .where(eq(assessment.propertyId, propertyId))
    .limit(1)
  return !!row
}

/**
 * Ensures a property is represented in the RoboArrival network and keeps its
 * listing current.
 *
 * Auto-entry policy: every assessed property — regardless of RoboReady score —
 * and every property with at least one amenity enters the network
 * automatically, visible to signed-in users immediately. Re-derives amenities
 * and re-snapshots score + coordinates from the property's latest
 * assessment/intake, so a listed property stays up to date "from time to time"
 * (called on every assessment finalize and intake save).
 *
 * An existing listing's admin-controlled fields (visibility, headline, blurb,
 * amenity overrides) are always preserved — an admin who hid a listing (`none`)
 * or promoted it to `public` is never overridden here. Best-effort; callers
 * invoke it inside try/catch so it never blocks their primary work.
 */
export async function syncListingFromAssessment(propertyId: string): Promise<void> {
  const [answers, score, assessed, prop, listing] = await Promise.all([
    latestIntakeAnswers(propertyId),
    latestScore(propertyId),
    hasAnyAssessment(propertyId),
    db.select().from(property).where(eq(property.id, propertyId)).limit(1).then((r) => r[0] ?? null),
    getListingByProperty(propertyId),
  ])

  const derived = deriveAmenities(answers)

  if (listing) {
    // Existing listing → refresh derived data, preserve admin choices.
    const overrides = (listing.amenityOverrides as { added?: string[]; removed?: string[] } | null) ?? {}
    const resolved = resolveAmenities(derived, overrides)
    await db
      .update(networkListing)
      .set({
        derivedAmenities: derived,
        amenities: resolved,
        roboReadyScore: score,
        latitude: prop?.latitude ?? listing.latitude,
        longitude: prop?.longitude ?? listing.longitude,
        city: prop?.city ?? listing.city,
        region: prop?.region ?? listing.region,
        country: prop?.country ?? listing.country,
        updatedAt: new Date(),
      })
      .where(eq(networkListing.id, listing.id))
    return
  }

  // No listing yet → auto-create when the property qualifies: it has been
  // assessed (any score) or it has at least one amenity. Nothing to list for a
  // bare prospect with no assessment and no amenities.
  if (!prop) return
  if (!assessed && derived.length === 0) return

  const now = new Date()
  await db
    .insert(networkListing)
    .values({
      id: crypto.randomUUID(),
      propertyId,
      organizationId: prop.organizationId,
      visibility: AUTO_LIST_DEFAULT_VISIBILITY,
      amenities: derived,
      derivedAmenities: derived,
      amenityOverrides: {},
      headline: null,
      blurb: null,
      latitude: prop.latitude,
      longitude: prop.longitude,
      city: prop.city,
      region: prop.region,
      country: prop.country,
      roboReadyScore: score,
      liveStatus: {},
      publishedAt: now,
      publishedByUserId: null,
      updatedAt: now,
    })
    // A concurrent finalize + intake save could both try to create the row;
    // the one-listing-per-property unique index makes the loser a no-op.
    .onConflictDoNothing({ target: networkListing.propertyId })
}
