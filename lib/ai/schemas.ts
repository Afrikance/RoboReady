import { z } from "zod"

// Note (per project memory): avoid array .max() bounds with Gemini structured
// output — clamp lengths in code instead.

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
