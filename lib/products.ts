// Source of truth for RoboReady's fixed-price SKUs. Prices are placeholders you
// can edit; the server always charges the amount defined here (or, for a
// proposal deposit, the amount computed server-side from the stored proposal),
// never a value sent by the client.

export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
}

export const PRODUCTS: Product[] = [
  {
    id: "readiness-assessment",
    name: "RoboReady Assessment",
    description:
      "Full autonomous-readiness assessment: RoboReady Score, findings, site concept, and infrastructure plan.",
    priceInCents: 250000, // $2,500.00 — placeholder, edit in lib/products.ts
  },
]

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// Tiered assessment / report products (MVP3 monetization)
// ---------------------------------------------------------------------------
// A property buys ONE tier. The purchased tier decides which artifacts appear
// in the client-facing report and portal (see reportFeaturesForTier). Higher
// tiers are supersets of lower ones. Price is always enforced server-side.

/** Feature keys a tier can unlock in the client-facing report. */
export type ReportFeature =
  | "score" // RoboReady Score + executive summary
  | "categories" // per-category readiness breakdown
  | "recommendations" // findings + prioritized recommendations
  | "narrative" // AI narrative sections + site concept
  | "infrastructure" // proposed infrastructure & cost table
  | "plans" // floor & site plan schematics
  | "premium-domains" // multi-domain (EV/robotics/delivery/AI-ops) graded roll-up

export type AssessmentTierId = "basic" | "standard" | "pro" | "premium"

export interface AssessmentTier {
  id: AssessmentTierId
  name: string
  tagline: string
  description: string
  priceInCents: number
  /** Ordering for "highest purchased tier" comparisons. */
  rank: number
  /** Whether to highlight this tier in the picker. */
  featured?: boolean
  /** Cumulative report features unlocked at this tier. */
  includes: ReportFeature[]
  /** Short human-readable bullets for the pricing card. */
  highlights: string[]
}

const BASIC_FEATURES: ReportFeature[] = ["score", "categories", "recommendations"]
const STANDARD_FEATURES: ReportFeature[] = [...BASIC_FEATURES, "narrative", "infrastructure"]
const PRO_FEATURES: ReportFeature[] = [...STANDARD_FEATURES, "plans"]
const PREMIUM_FEATURES: ReportFeature[] = [...PRO_FEATURES, "premium-domains"]

export const ASSESSMENT_TIERS: AssessmentTier[] = [
  {
    id: "basic",
    name: "Readiness Check",
    tagline: "Know where you stand",
    description: "RoboReady Score, category breakdown, and the top findings — a fast readiness snapshot.",
    priceInCents: 49900, // $499
    rank: 1,
    includes: BASIC_FEATURES,
    highlights: ["RoboReady Score (0–100)", "8-category breakdown", "Priority findings & recommendations"],
  },
  {
    id: "standard",
    name: "Standard Assessment",
    tagline: "The full readiness report",
    description: "Everything in Readiness Check plus the AI site concept, narrative report, and infrastructure plan with cost estimates.",
    priceInCents: 250000, // $2,500
    rank: 2,
    featured: true,
    includes: STANDARD_FEATURES,
    highlights: ["Everything in Readiness Check", "AI site concept & narrative", "Infrastructure plan + cost estimates"],
  },
  {
    id: "pro",
    name: "Quality Pro Report",
    tagline: "Build-ready documentation",
    description: "Everything in Standard plus floor & site plan schematics — the documentation clients hand to contractors.",
    priceInCents: 750000, // $7,500
    rank: 3,
    includes: PRO_FEATURES,
    highlights: ["Everything in Standard", "Floor & site plan schematics", "Contractor-ready documentation"],
  },
  {
    id: "premium",
    name: "Premium Assessment",
    tagline: "The whole autonomous transition",
    description:
      "Everything in Quality Pro plus the multi-domain readiness roll-up — arrival, EV & charging, physical robotics, autonomous delivery, and AI-enabled operations, each graded across every key point.",
    priceInCents: 1500000, // $15,000 — placeholder, edit in lib/products.ts
    rank: 4,
    featured: true,
    includes: PREMIUM_FEATURES,
    highlights: [
      "Everything in Quality Pro",
      "5-domain, 100-point readiness roll-up",
      "Every key point graded A–F with evidence",
    ],
  },
]

export function getAssessmentTier(id: string): AssessmentTier | undefined {
  return ASSESSMENT_TIERS.find((t) => t.id === id)
}

/** Rank of a tier id (0 when unknown/unpurchased). */
export function tierRank(id: string | null | undefined): number {
  return ASSESSMENT_TIERS.find((t) => t.id === id)?.rank ?? 0
}

/**
 * Report features a property is entitled to. An unpurchased property still
 * previews the Basic feature set so the client sees value and can upgrade.
 */
export function reportFeaturesForTier(tierId: AssessmentTierId | null): Set<ReportFeature> {
  const tier = tierId ? getAssessmentTier(tierId) : undefined
  return new Set(tier?.includes ?? BASIC_FEATURES)
}

/** The next tier up from the given one, for upsell copy. Null at the top. */
export function nextTier(tierId: AssessmentTierId | null): AssessmentTier | null {
  const rank = tierRank(tierId)
  return ASSESSMENT_TIERS.find((t) => t.rank === rank + 1) ?? null
}

// Default deposit rate applied to a proposal subtotal when a client accepts.
// Editable placeholder; stored per-proposal so historical proposals are stable.
export const DEFAULT_DEPOSIT_RATE = 0.1
