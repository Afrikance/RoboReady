// Source of truth for RoboReady's recurring Concierge + Maintenance plans. The
// server always charges the amount defined here (never a client value). Annual
// billing is priced at 10x the monthly rate (two months free); the helper below
// is the single place that rule lives so it can't drift between UI and checkout.

export type BillingInterval = "month" | "year"

export interface ServicePlan {
  id: string
  name: string
  tagline: string
  /** Monthly list price in cents. Annual is derived from this. */
  monthlyCents: number
  /** What this plan adds on top of the plan above it. */
  features: string[]
  /** Marks the plan highlighted in the pricing grid. */
  recommended?: boolean
}

// Number of monthly payments billed for an annual plan (two months free).
export const ANNUAL_MONTHS_BILLED = 10

export const SERVICE_PLANS: ServicePlan[] = [
  {
    id: "watchtower",
    name: "Watchtower Monitoring",
    tagline: "Keep the RoboReady Score from silently drifting.",
    monthlyCents: 29900, // $299/mo — placeholder, edit here
    features: [
      "Continuous readiness monitoring",
      "Quarterly automated re-assessment",
      "Score-drop email alerts",
      "Client portal access",
      "RoboArrival network access — gated listings + live AV tracking",
    ],
  },
  {
    id: "concierge",
    name: "Arrival Concierge",
    tagline: "A managed autonomous-arrival experience for guests.",
    monthlyCents: 89900, // $899/mo — placeholder
    recommended: true,
    features: [
      "Everything in Watchtower",
      "Live arrival & pickup concierge support",
      "Ongoing wayfinding + signage updates",
      "Guest-journey optimization reviews",
    ],
  },
  {
    id: "full-care",
    name: "Full Care",
    tagline: "Hands-off uptime for deployed infrastructure.",
    monthlyCents: 199900, // $1,999/mo — placeholder
    features: [
      "Everything in Arrival Concierge",
      "On-site preventive maintenance visits",
      "Priority response SLA",
      "Dedicated success manager",
    ],
  },
]

export function getServicePlan(id: string): ServicePlan | undefined {
  return SERVICE_PLANS.find((p) => p.id === id)
}

/** Server-authoritative amount for a plan at a given billing interval. */
export function planAmountCents(plan: ServicePlan, interval: BillingInterval): number {
  return interval === "year" ? plan.monthlyCents * ANNUAL_MONTHS_BILLED : plan.monthlyCents
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}
