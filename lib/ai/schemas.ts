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
