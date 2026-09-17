// Who can see a network listing. Pure + client-safe so the admin visibility
// selector and the server-side search filter share one definition.

export const NETWORK_VISIBILITIES = ["none", "care_plan", "signed_in", "public"] as const
export type NetworkVisibility = (typeof NETWORK_VISIBILITIES)[number]

/** The kind of viewer asking to browse the network. */
export type NetworkAudience = "public" | "signed_in" | "care_plan" | "admin"

export function isNetworkVisibility(v: unknown): v is NetworkVisibility {
  return typeof v === "string" && (NETWORK_VISIBILITIES as readonly string[]).includes(v)
}

export const VISIBILITY_LABELS: Record<NetworkVisibility, string> = {
  none: "Not listed",
  care_plan: "RoboArrival Care Plan only",
  signed_in: "Signed-in users",
  public: "Public (anyone)",
}

export const VISIBILITY_HELP: Record<NetworkVisibility, string> = {
  none: "Hidden from the network entirely.",
  care_plan: "Only RoboArrival Care Plan subscribers can find this property.",
  signed_in: "Any signed-in RoboReady account can find this property.",
  public: "Anyone can find this property, no account required.",
}

/**
 * The set of listing visibilities a given audience is allowed to see. `none` is
 * never returned to a browsing audience — it means the listing is unpublished.
 * Higher-trust audiences inherit everything a lower one can see.
 */
export function allowedVisibilitiesFor(audience: NetworkAudience): NetworkVisibility[] {
  switch (audience) {
    case "public":
      return ["public"]
    case "signed_in":
      return ["public", "signed_in"]
    case "care_plan":
    case "admin":
      return ["public", "signed_in", "care_plan"]
  }
}

/** Whether a listing at `visibility` is viewable by `audience`. */
export function canViewListing(audience: NetworkAudience, visibility: NetworkVisibility): boolean {
  return allowedVisibilitiesFor(audience).includes(visibility)
}
