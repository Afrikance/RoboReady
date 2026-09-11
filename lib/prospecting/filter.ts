// Pure, client-safe helpers for the prospecting/handover/verification queues:
// property-type vocabulary, haversine distance, and list filtering by city,
// state, and mileage radius. No server or DB imports so the UI and unit tests
// can use it directly.

export type PropertyTypeOption = { value: string; label: string }

/** The commercial property categories Scout prospects and humans classify. */
export const PROPERTY_TYPES: PropertyTypeOption[] = [
  { value: "hotel", label: "Hotel" },
  { value: "apartment", label: "Apartment complex" },
  { value: "school", label: "School" },
  { value: "business_park", label: "Business park" },
  { value: "shopping_center", label: "Shopping center" },
  { value: "hospital", label: "Hospital" },
  { value: "event_venue", label: "Event venue" },
  { value: "commercial", label: "Commercial (other)" },
]

export function propertyTypeLabel(value: string): string {
  return PROPERTY_TYPES.find((t) => t.value === value)?.label ?? value
}

export type GeoPoint = { latitude: number | null; longitude: number | null }

/** True when a point carries usable (non-zero) coordinates. */
export function hasCoords(p: GeoPoint): boolean {
  return (
    p.latitude != null &&
    p.longitude != null &&
    !(p.latitude === 0 && p.longitude === 0) &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude)
  )
}

const EARTH_RADIUS_MI = 3958.8

/** Great-circle distance between two lat/lng points, in miles. */
export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)))
}

export type FilterableProperty = GeoPoint & {
  city?: string | null
  region?: string | null
}

/** The serialized property fields the queue UIs render and filter on. */
export type ProspectRow = FilterableProperty & {
  id: string
  name: string
  propertyType: string
  addressLine1?: string | null
  postalCode?: string | null
  phone?: string | null
  status: string
  metadata?: unknown
  updatedAt?: string | Date | null
}

/** Reads the AI pre-fill summary (filled vs blank field ids) off a row's metadata. */
export function readPrefill(metadata: unknown): { filled: string[]; leftBlank: string[]; summary?: string } | null {
  if (metadata && typeof metadata === "object" && "pipeline" in metadata) {
    const p = (metadata as { pipeline?: { prefill?: { filled?: string[]; leftBlank?: string[]; summary?: string } } })
      .pipeline?.prefill
    if (p) return { filled: p.filled ?? [], leftBlank: p.leftBlank ?? [], summary: p.summary }
  }
  return null
}

/** Reads the current Field Work claim (who is working the property) off metadata. */
export function readClaim(metadata: unknown): { byUserId: string; byName: string; at: string } | null {
  if (metadata && typeof metadata === "object" && "pipeline" in metadata) {
    const c = (metadata as { pipeline?: { claim?: { byUserId?: string; byName?: string; at?: string } | null } })
      .pipeline?.claim
    if (c && c.byUserId) return { byUserId: c.byUserId, byName: c.byName ?? "Someone", at: c.at ?? "" }
  }
  return null
}

/** Reads Scout's unverified prospecting note off a row's metadata. */
export function readProspectNote(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "prospectNote" in metadata) {
    const n = (metadata as { prospectNote?: unknown }).prospectNote
    return typeof n === "string" ? n : null
  }
  return null
}

export type PropertyFilter = {
  city?: string
  region?: string
  radiusMi?: number | null
  ref?: { lat: number; lng: number } | null
}

/**
 * Filters properties by city and state (case-insensitive substring) and, when a
 * reference point + radius is supplied, by haversine distance. Properties
 * without coordinates are kept only when no radius filter is active — city/state
 * filtering always works even without coords.
 */
export function filterProperties<T extends FilterableProperty>(props: T[], filter: PropertyFilter): T[] {
  const city = filter.city?.trim().toLowerCase()
  const region = filter.region?.trim().toLowerCase()
  const radius = filter.radiusMi
  const ref = filter.ref

  return props.filter((p) => {
    if (city && !(p.city ?? "").toLowerCase().includes(city)) return false
    if (region && !(p.region ?? "").toLowerCase().includes(region)) return false
    if (radius != null && radius > 0 && ref) {
      if (!hasCoords(p)) return false
      const miles = haversineMiles(ref, { lat: p.latitude as number, lng: p.longitude as number })
      if (miles > radius) return false
    }
    return true
  })
}

/** Distance in miles from a reference point, or null when uncomputable. */
export function distanceFrom(p: GeoPoint, ref: { lat: number; lng: number } | null | undefined): number | null {
  if (!ref || !hasCoords(p)) return null
  return haversineMiles(ref, { lat: p.latitude as number, lng: p.longitude as number })
}
