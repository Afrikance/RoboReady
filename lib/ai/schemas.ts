import { z } from "zod"

// Note (per project memory): avoid array .max() bounds with Gemini structured
// output — clamp lengths in code instead.

// ---------------------------------------------------------------------------
// RoboSearch — AI natural-language search over the RoboArrival network.
// The navigator receives the user's plain-English query, the amenity catalog,
// and the set of listings the viewer is allowed to see, then returns a concise
// interpretation, the amenity ids it understood, and the best-matching
// candidates ranked most-relevant-first. It must only ever reference candidate
// ids that were provided — it cannot invent a property or an attribute.
// ---------------------------------------------------------------------------

export const networkSearchSchema = z.object({
  interpretation: z
    .string()
    .describe("One concise sentence restating what the user is looking for, in plain language."),
  understoodAmenities: z
    .array(z.string())
    .describe("Amenity ids (only from the provided amenityCatalog) that the query implies. Empty if none."),
  results: z
    .array(
      z.object({
        id: z.string().describe("A candidate listing id, copied EXACTLY from the provided candidates."),
        reason: z
          .string()
          .describe("One short sentence on why this property matches, citing the candidate's real attributes."),
      }),
    )
    .describe("Genuinely relevant candidates only, most relevant first. Omit poor matches; empty array if none match."),
})

export type NetworkSearchOutput = z.infer<typeof networkSearchSchema>

// ---------------------------------------------------------------------------
// RoboReady Readiness Score — canonical robotaxi/autonomous-arrival model
// (master spec §5). A 100-point scale across 8 fixed-weight categories, built
// entirely around the primary use case: autonomous robotaxi/CyberCab arrival.
// Every category records its own points, explanation, evidence, and confidence
// — the spec forbids a score without recorded reasoning inputs.
// ---------------------------------------------------------------------------

export const SCORE_CATEGORY_DEFS = [
  { id: "curb", label: "Curb Readiness", max: 20 },
  { id: "wayfinding", label: "Wayfinding", max: 15 },
  { id: "accessibility", label: "Accessibility", max: 15 },
  { id: "passenger", label: "Passenger Experience", max: 15 },
  { id: "signage", label: "Signage", max: 10 },
  { id: "infrastructure", label: "Infrastructure", max: 10 },
  { id: "traffic", label: "Traffic / Pedestrian Flow", max: 10 },
  { id: "future", label: "Future Expansion", max: 5 },
] as const

export const SCORE_CATEGORIES = [
  "curb",
  "wayfinding",
  "accessibility",
  "passenger",
  "signage",
  "infrastructure",
  "traffic",
  "future",
] as const
export type ScoreCategory = (typeof SCORE_CATEGORIES)[number]

const CATEGORY_MAX: Record<ScoreCategory, number> = SCORE_CATEGORY_DEFS.reduce(
  (acc, d) => ({ ...acc, [d.id]: d.max }),
  {} as Record<ScoreCategory, number>,
)

/** The maximum points a category can contribute to the 100-point total. */
export function scoreCategoryMax(id: string): number {
  return CATEGORY_MAX[id as ScoreCategory] ?? 0
}

export function scoreCategoryLabel(id: string): string {
  return SCORE_CATEGORY_DEFS.find((d) => d.id === id)?.label ?? id
}

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const

export const assessmentSchema = z.object({
  roboReadyScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Overall 0-100 readiness score. Must equal the sum of the category points."),
  scoreBreakdown: z
    .array(
      z.object({
        category: z.enum(SCORE_CATEGORIES),
        points: z
          .number()
          .min(0)
          .max(20)
          .describe(
            "Points awarded within this category's cap: Curb 20, Wayfinding 15, Accessibility 15, Passenger 15, Signage 10, Infrastructure 10, Traffic 10, Future 5.",
          ),
        explanation: z.string().describe("Why this many points — the reasoning for the robotaxi-arrival readiness of this category."),
        evidence: z
          .array(z.string())
          .describe(
            "The specific property inputs/observations this score is derived from. Never fabricate; if a fact is unknown, state that it is unknown.",
          ),
        confidence: z.enum(CONFIDENCE_LEVELS).describe("Confidence in this category score given the available evidence."),
        recommendations: z.array(z.string()).describe("Concrete improvements that would raise this category's readiness."),
      }),
    )
    .describe("Exactly one entry per category — all 8 categories, in order."),
  findings: z
    .array(
      z.object({
        title: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        detail: z.string(),
        category: z.enum(SCORE_CATEGORIES),
      }),
    )
    .describe("Concrete observations, most important first."),
  recommendations: z
    .array(
      z.object({
        title: z.string(),
        priority: z.enum(["now", "next", "later"]),
        detail: z.string(),
        estimatedImpact: z.string(),
      }),
    )
    .describe("Prioritized, actionable improvements to the property's robotaxi-arrival readiness."),
  summary: z.string().describe("2-3 sentence executive summary of the autonomous-arrival readiness."),
})
export type AssessmentOutput = z.infer<typeof assessmentSchema>

/**
 * Deterministically computes the 0-100 RoboReady Score by clamping each
 * category to its cap and summing. The model proposes points; the platform
 * owns the arithmetic so the total is always exactly the sum of its parts.
 */
export function computeRoboReadyScore(
  breakdown: Array<{ category: string; points: number }>,
): { total: number; clamped: Array<{ category: string; points: number; max: number }> } {
  const seen = new Set<string>()
  const clamped: Array<{ category: string; points: number; max: number }> = []
  for (const b of breakdown) {
    if (seen.has(b.category)) continue
    seen.add(b.category)
    const max = scoreCategoryMax(b.category)
    if (max === 0) continue
    const points = Math.max(0, Math.min(max, Math.round(Number(b.points) || 0)))
    clamped.push({ category: b.category, points, max })
  }
  const total = clamped.reduce((sum, c) => sum + c.points, 0)
  return { total: Math.max(0, Math.min(100, total)), clamped }
}

// ---------------------------------------------------------------------------
// Premium Assessment — multi-domain readiness roll-up (100 points, 6 domains)
// ---------------------------------------------------------------------------
// Premium is the top tier. It PRESERVES the canonical 8-category robotaxi score
// above and nests it as Domain 1 ("Autonomous Arrival"), rescaled to a 25-pt
// weight. Domains 2-6 (EV, Robotics, Delivery, Air Taxi, AI-Ops) are scored by
// the AI as individual graded key points. The platform owns the arithmetic
// exactly like computeRoboReadyScore: the model proposes per-key-point points,
// the platform clamps each to its cap and sums into domain subtotals and the
// overall. Each domain's key-point caps sum to that domain's max.

export const PREMIUM_DOMAIN_DEFS = [
  { id: "arrival", label: "Autonomous Arrival (Robotaxi / CyberCab)", max: 25, derived: true },
  { id: "ev", label: "EV & Charging Network Infrastructure", max: 20, derived: false },
  { id: "robotics", label: "Physical AI & Robotics Readiness", max: 15, derived: false },
  { id: "delivery", label: "Autonomous Delivery Readiness", max: 15, derived: false },
  { id: "airtaxi", label: "Air Taxi / eVTOL Readiness", max: 20, derived: false },
  { id: "aiops", label: "AI-Enabled Operations & Building Automation", max: 5, derived: false },
] as const
export type PremiumDomainId = (typeof PREMIUM_DOMAIN_DEFS)[number]["id"]

// Every graded key point in domains 2-6, with its point cap. Domain 1's detail
// is the existing 8-category robotaxi breakdown, so it isn't re-listed here.
export const PREMIUM_KEYPOINT_DEFS = [
  // Domain 2 — EV & Charging Network (20)
  { id: "ev-electrical", domain: "ev", label: "Electrical service & spare capacity", max: 5 },
  { id: "ev-stalls", domain: "ev", label: "Existing charging stalls", max: 3 },
  { id: "ev-dcfast", domain: "ev", label: "DC fast-charging feasibility", max: 4 },
  { id: "ev-network", domain: "ev", label: "Charging network site suitability", max: 3 },
  { id: "ev-storage", domain: "ev", label: "Energy storage / solar / resilience", max: 3 },
  { id: "ev-grid", domain: "ev", label: "Grid-upgrade & expansion path", max: 2 },
  // Domain 3 — Physical AI & Robotics (15)
  { id: "rob-workflows", domain: "robotics", label: "Repetitive / automatable workflows", max: 3 },
  { id: "rob-environment", domain: "robotics", label: "Operating environment", max: 3 },
  { id: "rob-routes", domain: "robotics", label: "Internal access & route continuity", max: 3 },
  { id: "rob-staffing", domain: "robotics", label: "Staffing patterns & human-robot handoff", max: 2 },
  { id: "rob-docking", domain: "robotics", label: "Robot charging / storage / docking", max: 2 },
  { id: "rob-connectivity", domain: "robotics", label: "Connectivity & positioning for robots", max: 2 },
  // Domain 4 — Autonomous Delivery (15)
  { id: "del-access", domain: "delivery", label: "Site access (device / van)", max: 2 },
  { id: "del-routes", domain: "delivery", label: "Sidewalks / routes / pedestrian environment", max: 3 },
  { id: "del-handoff", domain: "delivery", label: "Delivery handoff", max: 2 },
  { id: "del-loading", domain: "delivery", label: "Loading areas", max: 2 },
  { id: "del-building", domain: "delivery", label: "Building access", max: 2 },
  { id: "del-security", domain: "delivery", label: "Security", max: 2 },
  { id: "del-ops", domain: "delivery", label: "Operational workflows & storage", max: 2 },
  // Domain 5 — Air Taxi / eVTOL (20)
  { id: "air-pad", domain: "airtaxi", label: "Landing pad / touchdown area (incl. rooftop)", max: 5 },
  { id: "air-clearance", domain: "airtaxi", label: "Power-line & tall-tree clearance", max: 4 },
  { id: "air-approach", domain: "airtaxi", label: "Approach / departure path obstructions", max: 3 },
  { id: "air-siting", domain: "airtaxi", label: "Separation from traffic & crowds", max: 3 },
  { id: "air-beacon", domain: "airtaxi", label: "High-elevation guide-beacon mounting", max: 3 },
  { id: "air-access", domain: "airtaxi", label: "Airspace & pad-to-building access", max: 2 },
  // Domain 6 — AI-Enabled Operations & Building Automation (5)
  { id: "ops-bms", domain: "aiops", label: "BMS / building-automation integration", max: 2 },
  { id: "ops-telemetry", domain: "aiops", label: "Data / telemetry & operational readiness", max: 2 },
  { id: "ops-governance", domain: "aiops", label: "Governance / staffing for AI ops", max: 1 },
] as const
export type PremiumKeyPointId = (typeof PREMIUM_KEYPOINT_DEFS)[number]["id"]

// The key points the AI scores (all of them — Domain 1 is derived, not scored).
export const PREMIUM_SCORED_KEYPOINT_IDS = PREMIUM_KEYPOINT_DEFS.map((k) => k.id) as [
  PremiumKeyPointId,
  ...PremiumKeyPointId[],
]

const PREMIUM_KEYPOINT_BY_ID = new Map(PREMIUM_KEYPOINT_DEFS.map((k) => [k.id as string, k]))
const PREMIUM_DOMAIN_BY_ID = new Map(PREMIUM_DOMAIN_DEFS.map((d) => [d.id as string, d]))

export function premiumKeypointMax(id: string): number {
  return PREMIUM_KEYPOINT_BY_ID.get(id)?.max ?? 0
}
export function premiumKeypointLabel(id: string): string {
  return PREMIUM_KEYPOINT_BY_ID.get(id)?.label ?? id
}
export function premiumDomainLabel(id: string): string {
  return PREMIUM_DOMAIN_BY_ID.get(id)?.label ?? id
}
export function premiumDomainMax(id: string): number {
  return PREMIUM_DOMAIN_BY_ID.get(id)?.max ?? 0
}

export type LetterGrade = "A" | "B" | "C" | "D" | "F"

/** Letter grade for points as a percent of a cap: A≥90 B≥80 C≥70 D≥60 F<60. */
export function gradeFor(points: number, max: number): LetterGrade {
  if (max <= 0) return "F"
  const pct = (points / max) * 100
  if (pct >= 90) return "A"
  if (pct >= 80) return "B"
  if (pct >= 70) return "C"
  if (pct >= 60) return "D"
  return "F"
}

export const premiumAssessmentSchema = z.object({
  keyPointScores: z
    .array(
      z.object({
        keyPointId: z.enum(PREMIUM_SCORED_KEYPOINT_IDS).describe("Which premium key point this scores."),
        points: z
          .number()
          .min(0)
          .max(10)
          .describe("Points awarded within this key point's cap (caps range 1-6; the platform clamps to the real cap)."),
        explanation: z.string().describe("Why this many points, grounded in the property/intake evidence."),
        evidence: z
          .array(z.string())
          .describe("Specific intake/property facts used. Never fabricate; state when a fact is unknown."),
        confidence: z.enum(CONFIDENCE_LEVELS),
        recommendations: z.array(z.string()).describe("Concrete improvements that would raise this key point."),
      }),
    )
    .describe("One entry per scored key point across the EV, Robotics, Delivery, Air Taxi and AI-Ops domains."),
  domainSummaries: z
    .array(
      z.object({
        domain: z.enum(["ev", "robotics", "delivery", "airtaxi", "aiops"]),
        summary: z.string().describe("2-3 sentence readiness summary for this domain."),
      }),
    )
    .describe("One summary per non-arrival domain."),
  summary: z.string().describe("2-3 sentence executive summary across all six premium domains."),
})
export type PremiumAssessmentOutput = z.infer<typeof premiumAssessmentSchema>

export type PremiumScoredKeyPoint = {
  keyPointId: string
  domain: PremiumDomainId
  label: string
  points: number
  max: number
  grade: LetterGrade
}

export type PremiumDomainScore = {
  id: PremiumDomainId
  label: string
  points: number
  max: number
  pct: number
  grade: LetterGrade
  derived: boolean
}

/**
 * Deterministically rolls up the Premium score. Domain 1 (arrival) is derived
 * from the canonical 0-100 robotaxi score, rescaled to its 30-pt cap. Domains
 * 2-5 sum their clamped key points. The platform — not the model — owns every
 * total, so the overall always equals the sum of the domain subtotals.
 */
export function computePremiumScore(args: {
  arrivalScore100: number
  keyPoints: Array<{ keyPointId: string; points: number }>
}): {
  overall: number
  domains: PremiumDomainScore[]
  keyPoints: PremiumScoredKeyPoint[]
} {
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
  const arrivalMax = premiumDomainMax("arrival")
  const arrivalPoints = Math.round((clamp(Number(args.arrivalScore100) || 0, 0, 100) / 100) * arrivalMax)

  const seen = new Set<string>()
  const keyPoints: PremiumScoredKeyPoint[] = []
  for (const kp of args.keyPoints ?? []) {
    const def = PREMIUM_KEYPOINT_BY_ID.get(kp.keyPointId)
    if (!def || seen.has(kp.keyPointId)) continue
    seen.add(kp.keyPointId)
    const points = clamp(Math.round(Number(kp.points) || 0), 0, def.max)
    keyPoints.push({
      keyPointId: def.id,
      domain: def.domain as PremiumDomainId,
      label: def.label,
      points,
      max: def.max,
      grade: gradeFor(points, def.max),
    })
  }

  const domains: PremiumDomainScore[] = PREMIUM_DOMAIN_DEFS.map((d) => {
    const points =
      d.id === "arrival"
        ? arrivalPoints
        : keyPoints.filter((k) => k.domain === d.id).reduce((s, k) => s + k.points, 0)
    const pct = d.max > 0 ? Math.round((points / d.max) * 100) : 0
    return { id: d.id, label: d.label, points, max: d.max, pct, grade: gradeFor(points, d.max), derived: d.derived }
  })

  const overall = clamp(
    domains.reduce((s, d) => s + d.points, 0),
    0,
    100,
  )
  return { overall, domains, keyPoints }
}

export const siteConceptSchema = z.object({
  title: z.string(),
  narrative: z.string().describe("A few paragraphs describing the autonomous-arrival concept for this property."),
  pickupZones: z
    .array(
      z.object({
        role: z
          .enum(["primary", "overflow", "accessible"])
          .describe("primary = main robotaxi/CyberCab pickup & drop-off; overflow = secondary/surge zone; accessible = wheelchair-accessible boarding."),
        name: z.string().describe("e.g. 'LandingPad 01 — Primary Robotaxi Pickup'."),
        location: z.string().describe("Where on the property, relative to the main entrance, curb, and parking."),
        rationale: z.string().describe("Why this location suits autonomous vehicle pickup/drop-off."),
        conflicts: z
          .string()
          .describe("Potential conflicts with vehicle traffic, pedestrian flow, existing rideshare zones, loading, or emergency access."),
      }),
    )
    .describe("Recommended robotaxi arrival zones. Always include a primary pickup zone and an accessible boarding zone."),
  zones: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      automation: z.string().describe("What autonomous systems operate in this zone."),
    }),
  ),
})
export type SiteConceptOutput = z.infer<typeof siteConceptSchema>

// ---------------------------------------------------------------------------
// Floor plan (interior) + Site plan (exterior) schematics
// ---------------------------------------------------------------------------
// The model lays out abstract diagram data on a normalized 0-100 grid (x,y =
// top-left corner, w,h = size). The platform renders it as a clean 2D SVG
// schematic AND generates an illustrative raster from the accompanying image
// prompts. This is layout data, not cartographic/geographic data.

const FLOOR_SPACE_KINDS = [
  "room",
  "corridor",
  "lobby",
  "elevator",
  "stair",
  "entrance",
  "exit",
  "amenity",
  "service",
] as const

const SITE_ELEMENT_KINDS = [
  "building",
  "drive",
  "curb",
  "parking",
  "pickup",
  "accessible",
  "entrance",
  "overflow",
  "landscape",
] as const

const gridRect = {
  x: z.number().min(0).max(100).describe("Left edge on a 0-100 grid."),
  y: z.number().min(0).max(100).describe("Top edge on a 0-100 grid."),
  w: z.number().min(1).max(100).describe("Width on the 0-100 grid."),
  h: z.number().min(1).max(100).describe("Height on the 0-100 grid."),
}

export const sitePlanDesignSchema = z.object({
  floorPlan: z
    .object({
      level: z.string().describe("Which level this interior plan depicts, e.g. 'Guest room floor' or 'Ground floor'."),
      summary: z.string().describe("1-2 sentence description of the interior route from the passenger's start to the pickup exit."),
      spaces: z
        .array(
          z.object({
            name: z.string().describe("Label for this space, e.g. 'Lobby', 'Elevator bank', 'East exit'."),
            kind: z.enum(FLOOR_SPACE_KINDS),
            ...gridRect,
          }),
        )
        .describe("Rectangular interior spaces laid out on the grid. Do not overlap heavily; leave corridors between rooms."),
      path: z
        .array(z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }))
        .describe("Ordered points tracing the passenger's walking route from the start space to the exit toward the pickup zone."),
      markers: z
        .array(
          z.object({
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
            label: z.string(),
            kind: z.enum(["start", "elevator", "turn", "exit"]).describe("start = journey origin; exit = door to the outdoor pickup."),
          }),
        )
        .describe("Key annotations along the interior route."),
    })
    .describe("Interior floor plan grounded in the interior survey (guest path, elevators, doors, landmarks)."),
  sitePlan: z
    .object({
      summary: z.string().describe("1-2 sentence description of the exterior arrival layout."),
      elements: z
        .array(
          z.object({
            name: z.string().describe("Label, e.g. 'Main building', 'Arrival drive', 'Primary pickup pad', 'Parking'."),
            kind: z.enum(SITE_ELEMENT_KINDS),
            ...gridRect,
          }),
        )
        .describe("Exterior elements laid out on the grid: the building footprint, drive lanes, curb, pickup pads, parking, landscaping."),
      markers: z
        .array(
          z.object({
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
            label: z.string(),
            role: z.enum(["primary", "overflow", "accessible", "entrance"]).describe("Arrival-zone role for this marker."),
          }),
        )
        .describe("Robotaxi arrival markers positioned on the site."),
    })
    .describe("Exterior site plan showing where autonomous arrival infrastructure sits relative to the building."),
  floorPlanImagePrompt: z
    .string()
    .describe("A detailed text-to-image prompt for a clean, top-down architectural INTERIOR floor plan illustration of this level, grounded in the survey. Describe rooms, corridors, elevators, doors, and the marked passenger route."),
  sitePlanImagePrompt: z
    .string()
    .describe("A detailed text-to-image prompt for a top-down / bird's-eye EXTERIOR site plan illustration showing the building, arrival drive, curb, robotaxi pickup pads, parking, and landscaping."),
})
export type SitePlanDesignOutput = z.infer<typeof sitePlanDesignSchema>

export const infrastructurePlanSchema = z.object({
  assets: z.array(
    z.object({
      assetType: z
        .enum(["robotaxi-stand", "pudo-zone", "ev-charger", "robot-charger", "landing-pad", "drone-pad", "sensor", "beacon"])
        .describe("The kind of physical asset. robotaxi-stand and pudo-zone support the primary robotaxi/CyberCab use case."),
      label: z.string(),
      quantity: z.number().int().min(1),
      unitCost: z.number().min(0).describe("Indicative cost per unit in USD."),
      rationale: z.string(),
    }),
  ),
  notes: z.string(),
})
export type InfrastructurePlanOutput = z.infer<typeof infrastructurePlanSchema>

export const reportSchema = z.object({
  headline: z.string(),
  executiveSummary: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string(),
    }),
  ),
  nextSteps: z.array(z.string()),
})
export type ReportOutput = z.infer<typeof reportSchema>

// --- MVP 2 specialists ---

export const leadQualificationSchema = z.object({
  fitScore: z.number().int().min(0).max(100).describe("How strong a fit this lead is, 0-100."),
  rating: z.enum(["hot", "warm", "cold"]),
  budgetBand: z.enum(["unknown", "low", "medium", "high"]),
  likelyNeeds: z.array(z.string()).describe("Services/infrastructure this lead probably needs."),
  rationale: z.string().describe("Why this score — grounded in the lead details."),
  recommendedActions: z.array(z.string()).describe("Concrete next steps for the sales team."),
})
export type LeadQualificationOutput = z.infer<typeof leadQualificationSchema>

// Canonical passenger boarding-signal system (master spec §6 LandingPad
// states). The UI always renders this legend; the model may echo or refine it
// via the wayfinding output's `boardingSignals`.
export const BOARDING_SIGNAL_LEGEND = [
  { signal: "blue" as const, meaning: "Vehicle reserved and en route to the pickup point.", guestAction: "Begin walking to the LandingPad." },
  { signal: "amber" as const, meaning: "Vehicle is arriving and positioning at the pad.", guestAction: "Get ready at the boarding line; do not step onto the pad yet." },
  { signal: "green" as const, meaning: "Green flashing: doors open, safe to board now.", guestAction: "Board the vehicle." },
  { signal: "red" as const, meaning: "Do not approach — vehicle maneuvering or emergency.", guestAction: "Stay clear of the pad and wait for staff or the next signal." },
]

export const wayfindingSchema = z.object({
  summary: z.string(),
  routes: z.array(
    z.object({
      name: z.string(),
      from: z.string(),
      to: z.string(),
      mode: z.enum(["robotaxi", "robot", "drone", "shared"]),
      clearance: z.string().describe("Turning/width/clearance requirement. For robotaxi, curb-to-entrance passenger handoff paths."),
      notes: z.string(),
    }),
  ),
  passengerJourney: z
    .array(
      z.object({
        step: z.number().int().min(1).describe("1-based order of this step in the room-to-LandingPad journey."),
        location: z.string().describe("Where the guest is at this step, e.g. 'Guest room floor', 'Lobby', 'East exit'."),
        instruction: z.string().describe("Plain-language direction a hotel guest can follow."),
        landmark: z.string().describe("A visible landmark that confirms the guest is on the right path."),
        mode: z.enum(["walk", "elevator", "outdoor"]).describe("How the guest moves during this step."),
        signalCue: z
          .string()
          .describe("What boarding signal the guest should look for / expect at this step, if any."),
      }),
    )
    .describe("Ordered, step-by-step route a passenger walks from their room/start point to the robotaxi LandingPad, grounded in the interior survey and pickup zones."),
  boardingSignals: z
    .array(
      z.object({
        signal: z.enum(["blue", "amber", "green", "red"]),
        meaning: z.string(),
        guestAction: z.string().describe("What the guest should do when they see this signal."),
      }),
    )
    .describe("Boarding-signal legend for this property: Blue en route, Amber get ready, Green flashing = board now, Red do not approach."),
  signage: z.array(
    z.object({
      type: z.enum(["beacon", "qr", "fiducial", "sign"]),
      location: z.string(),
      purpose: z.string(),
    }),
  ),
})
export type WayfindingOutput = z.infer<typeof wayfindingSchema>

export const accessibilitySchema = z.object({
  score: z.number().int().min(0).max(100).describe("Accessibility readiness score, 0-100."),
  summary: z.string(),
  findings: z.array(
    z.object({
      area: z.string().describe("e.g. entrances, elevators, restrooms, signage, paths of travel."),
      severity: z.enum(["low", "medium", "high"]),
      observation: z.string(),
      recommendation: z.string(),
      needsProfessionalVerification: z
        .boolean()
        .describe("True when a licensed accessibility professional must confirm this."),
    }),
  ),
})
export type AccessibilityOutput = z.infer<typeof accessibilitySchema>

export const evPlanSchema = z.object({
  summary: z.string(),
  stations: z.array(
    z.object({
      kind: z.enum(["level2", "dc-fast", "robot-charger"]),
      count: z.number().int().min(1),
      powerKw: z.number().min(0).describe("Rated power per station in kW."),
      unitCost: z.number().min(0).describe("Indicative installed cost per station in USD."),
      rationale: z.string(),
    }),
  ),
  loadSummary: z.object({
    estimatedPeakKw: z.number().min(0),
    serviceUpgradeLikely: z.boolean(),
    notes: z.string(),
  }),
})
export type EvPlanOutput = z.infer<typeof evPlanSchema>

// ---------------------------------------------------------------------------
// Front-of-funnel prospecting pipeline
// ---------------------------------------------------------------------------

// Scout generates candidate commercial properties for a target city/type. These
// are UNVERIFIED leads handed to humans to confirm — the model must never
// present them as confirmed facts. Coordinates are best-effort for map/mileage
// filtering. No array .max() (Gemini gotcha) — count is clamped in code.
export const prospectPropertiesSchema = z.object({
  candidates: z.array(
    z.object({
      name: z.string().describe("The property's likely business name."),
      propertyType: z
        .enum(["hotel", "apartment", "school", "business_park", "shopping_center", "hospital", "event_venue", "commercial"])
        .describe("Best-fit category for this property."),
      addressLine1: z.string().describe("Street address, best-effort. Leave empty if genuinely unknown."),
      city: z.string(),
      region: z.string().describe("State / province."),
      postalCode: z.string().describe("Postal/ZIP code, best-effort; empty if unknown."),
      phone: z.string().describe("Main contact phone, best-effort; empty string if unknown — never invent one."),
      latitude: z.number().describe("Best-effort latitude for mapping. Use 0 if unknown."),
      longitude: z.number().describe("Best-effort longitude for mapping. Use 0 if unknown."),
      note: z.string().describe("One line on why this is a fit and how confident you are; state clearly it is unverified."),
    }),
  ),
})
export type ProspectPropertiesOutput = z.infer<typeof prospectPropertiesSchema>

// Vero pre-fills the intake with ONLY confidently-verifiable public info and
// leaves everything uncertain blank for a human. Returns an ARRAY of answers
// (not a dynamic-key object) to stay Gemini-safe; code reduces it to the intake
// answers map and coerces each value by its field type.
export const intakePrefillSchema = z.object({
  answers: z.array(
    z.object({
      fieldId: z.string().describe("An intake field id provided in the input's field list. Only use ids from that list."),
      value: z.string().describe("The value as a string. For multiselect, a comma-separated list. For boolean, 'true'/'false'."),
      confidence: z.enum(CONFIDENCE_LEVELS).describe("Only include a field when confidence is medium or high."),
    }),
  ),
  leftBlank: z.array(z.string()).describe("Field ids intentionally left blank because they require on-site verification or are unknown."),
  summary: z.string().describe("2-3 sentences on what was filled vs left for the field operator."),
})
export type IntakePrefillOutput = z.infer<typeof intakePrefillSchema>

export const proposalSchema = z.object({
  title: z.string(),
  summary: z.string().describe("A persuasive 2-4 sentence overview for the client."),
  lineItems: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0).describe("Price per unit in USD."),
    }),
  ),
})
export type ProposalOutput = z.infer<typeof proposalSchema>
