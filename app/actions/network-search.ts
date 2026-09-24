"use server"

import { getOrgContext } from "@/lib/tenancy"
import { runJob } from "@/lib/ai/orchestrator"
import {
  orgHasProNetworkAccess,
  resolveNetworkAudience,
  searchNetwork,
  type NetworkListingView,
} from "@/lib/network/data"
import { NETWORK_AMENITIES } from "@/lib/network/amenities"
import type { NetworkSearchOutput } from "@/lib/ai/schemas"

/** One AI-ranked hit: the real listing plus why it matched. */
export type NetworkSearchHit = {
  listing: NetworkListingView
  reason: string
}

export type NetworkSearchResult =
  | { ok: true; interpretation: string; understoodAmenities: string[]; hits: NetworkSearchHit[] }
  | { ok: false; reason: "signin" | "upgrade" | "empty-query" | "error"; message: string }

// Bound token use: the AI only needs a compact view of the candidate set.
const MAX_CANDIDATES = 120
const MAX_QUERY_CHARS = 400

/**
 * RoboSearch: AI natural-language search over the RoboArrival network.
 * Gated at the Quality Pro tier (org-level entitlement). The AI only ever
 * ranks and annotates real, viewer-visible listings — it never invents one —
 * and every run is recorded as a traceable ai_job.
 */
export async function runNetworkSearch(query: string): Promise<NetworkSearchResult> {
  const trimmed = (query ?? "").trim().slice(0, MAX_QUERY_CHARS)
  if (trimmed.length < 2) {
    return { ok: false, reason: "empty-query", message: "Type what you're looking for." }
  }

  const ctx = await getOrgContext()
  if (!ctx) {
    return { ok: false, reason: "signin", message: "Sign in to use AI search." }
  }
  if (!(await orgHasProNetworkAccess())) {
    return {
      ok: false,
      reason: "upgrade",
      message: "AI search unlocks with the Quality Pro Report.",
    }
  }

  // Same visibility rules as browsing — the AI can only see what the viewer can.
  const { audience } = await resolveNetworkAudience()
  const listings = await searchNetwork({}, audience)
  if (listings.length === 0) {
    return { ok: true, interpretation: "No properties are in the network yet.", understoodAmenities: [], hits: [] }
  }

  const byId = new Map(listings.map((l) => [l.id, l]))
  const candidates = listings.slice(0, MAX_CANDIDATES).map((l) => ({
    id: l.id,
    name: l.name,
    propertyType: l.propertyType,
    city: l.city,
    region: l.region,
    roboReadyScore: l.roboReadyScore,
    amenities: l.amenities,
  }))
  const amenityCatalog = NETWORK_AMENITIES.map((a) => ({ id: a.id, label: a.label }))

  let output: NetworkSearchOutput
  try {
    const job = await runJob<
      { query: string; amenityCatalog: { id: string; label: string }[]; candidates: typeof candidates },
      NetworkSearchOutput
    >({
      ctx,
      employeeSlug: "network-navigator",
      jobType: "network-search",
      input: { query: trimmed, amenityCatalog, candidates },
    })
    output = job.output
  } catch (err) {
    console.log("[v0] runNetworkSearch failed:", (err as Error).message)
    return { ok: false, reason: "error", message: "AI search is unavailable right now. Please try again." }
  }

  // Map AI results back to real listings; drop any id the model didn't get from
  // the candidate set (it can't introduce a property this way).
  const seen = new Set<string>()
  const hits: NetworkSearchHit[] = []
  for (const r of output.results ?? []) {
    const listing = byId.get(r.id)
    if (!listing || seen.has(r.id)) continue
    seen.add(r.id)
    hits.push({ listing, reason: (r.reason ?? "").trim() || "Matches your search." })
  }

  const understood = (output.understoodAmenities ?? []).filter((id) => amenityCatalog.some((a) => a.id === id))

  return {
    ok: true,
    interpretation: (output.interpretation ?? "").trim() || `Results for “${trimmed}”.`,
    understoodAmenities: understood,
    hits,
  }
}
