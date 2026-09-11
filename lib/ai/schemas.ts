import { z } from "zod"

// Note (per project memory): avoid array .max() bounds with Gemini structured
// output — clamp lengths in code instead.

export const SCORE_CATEGORIES = ["access", "connectivity", "layout", "goals"] as const
export type ScoreCategory = (typeof SCORE_CATEGORIES)[number]

export const assessmentSchema = z.object({
  roboReadyScore: z.number().int().min(0).max(100).describe("Overall 0-100 readiness score."),
  scoreBreakdown: z
    .array(
      z.object({
        category: z.enum(SCORE_CATEGORIES),
        score: z.number().int().min(0).max(100),
        weight: z.number().min(0).max(1).describe("Fraction of the overall score, 0-1."),
        rationale: z.string(),
      }),
    )
    .describe("One entry per category. Weights should sum to ~1."),
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
    .describe("Prioritized, actionable recommendations."),
  summary: z.string().describe("2-3 sentence executive summary of the readiness."),
})
export type AssessmentOutput = z.infer<typeof assessmentSchema>

export const siteConceptSchema = z.object({
  title: z.string(),
  narrative: z.string().describe("A few paragraphs describing the concept."),
  zones: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      automation: z.string().describe("What autonomous systems operate in this zone."),
    }),
  ),
})
export type SiteConceptOutput = z.infer<typeof siteConceptSchema>

export const infrastructurePlanSchema = z.object({
  assets: z.array(
    z.object({
      assetType: z
        .enum(["ev-charger", "robot-charger", "landing-pad", "drone-pad", "sensor", "beacon"])
        .describe("The kind of physical asset."),
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

export const wayfindingSchema = z.object({
  summary: z.string(),
  routes: z.array(
    z.object({
      name: z.string(),
      from: z.string(),
      to: z.string(),
      mode: z.enum(["robot", "drone", "shared"]),
      clearance: z.string().describe("Turning/width/clearance requirement."),
      notes: z.string(),
    }),
  ),
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
