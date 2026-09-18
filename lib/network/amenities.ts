// Autonomous-ready amenity taxonomy for the RoboArrival network + the pure
// logic that auto-derives a property's amenities from its intake answers.
//
// This is the single source of truth for both the network filter UI and the
// server-side derivation. It is client-safe (no server-only imports) so the
// explorer, filter chips, and cards can all read the same definitions.

export type AmenityGroup = "arrival" | "charging" | "air" | "robotics" | "accessibility" | "delivery" | "energy"

export type NetworkAmenity = {
  id: string
  label: string
  /** Short label for compact badges. */
  short: string
  group: AmenityGroup
  /** lucide-react icon name; mapped to a component in the UI layer. */
  icon: string
}

export const AMENITY_GROUP_LABELS: Record<AmenityGroup, string> = {
  arrival: "Robotaxi & arrival",
  charging: "EV charging",
  air: "Air taxi & drone",
  robotics: "Robotics",
  accessibility: "Accessibility",
  delivery: "Delivery",
  energy: "Energy",
}

// Order here is the canonical display order for chips, badges, and filters.
export const NETWORK_AMENITIES: readonly NetworkAmenity[] = [
  { id: "cybercab-pickup", label: "CyberCab / robotaxi pickup", short: "CyberCab pickup", group: "arrival", icon: "Car" },
  { id: "av-staging", label: "Idle-AV staging & parking", short: "AV parking", group: "arrival", icon: "ParkingSquare" },
  { id: "robot-valet", label: "Robot valet parking (interested)", short: "Robot valet", group: "arrival", icon: "CarFront" },
  { id: "ada-compliant", label: "ADA-compliant loading", short: "ADA loading", group: "accessibility", icon: "Accessibility" },
  { id: "ev-l3", label: "EV Level 3 (DC fast charging)", short: "EV L3 fast", group: "charging", icon: "Zap" },
  { id: "ev-l2", label: "EV Level 2 charging", short: "EV L2", group: "charging", icon: "Plug" },
  { id: "charging-network-site", label: "EV charging network site", short: "Charging hub", group: "charging", icon: "BatteryCharging" },
  { id: "energy-storage", label: "On-site energy storage / solar", short: "Energy storage", group: "energy", icon: "SunMedium" },
  { id: "landing-pad", label: "Air-taxi / eVTOL landing pad", short: "Landing pad", group: "air", icon: "PlaneTakeoff" },
  { id: "rooftop-pad", label: "Rooftop vertiport candidate", short: "Rooftop pad", group: "air", icon: "Building2" },
  { id: "drone-ops", label: "Drone operations ready", short: "Drone ops", group: "air", icon: "Send" },
  { id: "humanoid-cleared", label: "Cleared for humanoid robots", short: "Humanoid-cleared", group: "robotics", icon: "Bot" },
  { id: "robotics-routes", label: "Step-free robot routes", short: "Robot routes", group: "robotics", icon: "Route" },
  { id: "bms-integrated", label: "Smart-building / BMS integration", short: "BMS integrated", group: "robotics", icon: "Cpu" },
  { id: "delivery-ready", label: "Autonomous delivery ready", short: "Delivery ready", group: "delivery", icon: "PackageCheck" },
  { id: "secure-access", label: "Security & access control", short: "Secure access", group: "delivery", icon: "ShieldCheck" },
] as const

export type AmenityId = (typeof NETWORK_AMENITIES)[number]["id"]

const AMENITY_IDS = new Set(NETWORK_AMENITIES.map((a) => a.id))
const AMENITY_ORDER = new Map(NETWORK_AMENITIES.map((a, i) => [a.id, i]))

export function isAmenityId(v: unknown): v is AmenityId {
  return typeof v === "string" && AMENITY_IDS.has(v)
}

export function getAmenity(id: string): NetworkAmenity | undefined {
  return NETWORK_AMENITIES.find((a) => a.id === id)
}

/** Sorts an arbitrary id list into canonical taxonomy order, dropping unknowns. */
export function sortAmenities(ids: Iterable<string>): AmenityId[] {
  return [...new Set([...ids])]
    .filter(isAmenityId)
    .sort((a, b) => (AMENITY_ORDER.get(a) ?? 0) - (AMENITY_ORDER.get(b) ?? 0)) as AmenityId[]
}

export type AmenityOverrides = { added?: string[]; removed?: string[] }

/** Applies admin add/remove overrides on top of the auto-derived set. */
export function resolveAmenities(derived: string[], overrides: AmenityOverrides | null | undefined): AmenityId[] {
  const set = new Set(derived.filter(isAmenityId))
  for (const a of overrides?.added ?? []) if (isAmenityId(a)) set.add(a)
  for (const r of overrides?.removed ?? []) set.delete(r as AmenityId)
  return sortAmenities(set)
}

// ---------------------------------------------------------------------------
// Auto-derivation from intake answers. Thresholds map to the exact option
// strings in lib/intake/questions.ts. Pure and dependency-free.
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  return typeof v === "string" ? v : ""
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : []
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}
function isTrue(v: unknown): boolean {
  return v === true || v === "true" || v === "yes"
}

/**
 * Derives the amenity ids a property qualifies for from its intake answers.
 * Conservative: only tags an amenity when the answers clearly support it.
 */
export function deriveAmenities(answers: Record<string, unknown>): AmenityId[] {
  const a = answers ?? {}
  const out = new Set<AmenityId>()

  const useCases = arr(a.useCases)
  const fleets = arr(a.fleetPartners)

  // --- Robotaxi / arrival ---
  const curb = str(a.curbAccess)
  if (
    curb === "Dedicated PUDO lane or apron" ||
    curb === "Shared curb with signage" ||
    num(a.pudoPoints) > 0 ||
    fleets.includes("Tesla Cybercab") ||
    useCases.includes("Robotaxi / CyberCab (AV pick-up & drop-off)")
  ) {
    out.add("cybercab-pickup")
  }

  const staging = str(a.avStaging)
  if (staging === "Dedicated AV staging" || staging === "Shared lot with spare capacity") {
    out.add("av-staging")
  }

  // Robot Valet Parking — an interest signal, credible when the owner opted in
  // and there is real parking to automate. Admins can override before listing.
  const valetType = str(a.valetParkingType)
  if (isTrue(a.valetInterest) && ((valetType && valetType !== "None / not applicable") || num(a.valetSpacesAvailable) > 0)) {
    out.add("robot-valet")
  }

  // --- Accessibility ---
  if (isTrue(a.adaLoading)) out.add("ada-compliant")

  // --- EV / charging ---
  const evExisting = str(a.evServiceExisting)
  const avCharging = str(a.avCharging)
  const dcFeasible = str(a.dcFastFeasible)
  if (evExisting === "DC fast charging present" || avCharging === "Existing DC fast charging" || dcFeasible === "Existing") {
    out.add("ev-l3")
  }
  if (evExisting === "A few Level 2" || evExisting === "Networked Level 2") {
    out.add("ev-l2")
  }
  if (
    num(a.chargeNetworkTarget) >= 8 ||
    ((dcFeasible === "Existing" || dcFeasible === "Feasible with upgrades") && num(a.chargeStallsToday) > 0)
  ) {
    out.add("charging-network-site")
  }

  // --- Energy ---
  const storage = str(a.energyStorage)
  if (storage === "Battery + solar" || storage === "Solar only") out.add("energy-storage")

  // --- Air taxi / drone ---
  const pad = str(a.landingPadAvailable)
  if (pad && pad !== "None identified") out.add("landing-pad")
  const surfaces = arr(a.landingSurface)
  if (surfaces.includes("Rooftop") || surfaces.includes("Parking structure top deck")) out.add("rooftop-pad")
  if (useCases.includes("Drone operations")) out.add("drone-ops")

  // --- Robotics ---
  const routeContinuity = str(a.robotRouteContinuity)
  const docking = str(a.robotDockingSpace)
  if ((routeContinuity === "Fully continuous" || routeContinuity === "Mostly") && docking && docking !== "None") {
    out.add("humanoid-cleared")
  }
  if (routeContinuity === "Fully continuous" || routeContinuity === "Mostly" || str(a.floorTransitions) === "Mostly flush") {
    out.add("robotics-routes")
  }
  if (isTrue(a.hasBms) || isTrue(a.elevatorAutomation) || isTrue(a.energyMgmtSystem)) {
    out.add("bms-integrated")
  }

  // --- Delivery ---
  const deviceAccess = str(a.deviceAccess)
  const handoff = str(a.deliveryHandoff)
  if (
    (deviceAccess === "Direct & easy" || deviceAccess === "Some barriers") &&
    (handoff === "Dedicated bay / locker" || handoff === "Lobby desk")
  ) {
    out.add("delivery-ready")
  }
  const security = arr(a.securityPosture)
  if (security.some((s) => s === "Cameras" || s === "Access control" || s === "Guard")) {
    out.add("secure-access")
  }

  return sortAmenities(out)
}
