// ---------------------------------------------------------------------------
// Cyber Fleet Services partner referral: shared config, copy, and pure helpers.
//
// This is the client-safe source of truth for the referral funnel. The partner
// economics ($500 lead fee, $2,500 development fee, 2% revenue share) are
// intentionally NOT modeled here — they live in docs/partnerships for the
// future full implementation. This module only powers the referral handoff UI
// and eligibility math.
// ---------------------------------------------------------------------------

export const PARTNER = {
  name: "Cyber Fleet Services",
  tagline: "Autonomous security & robotics fleet operations",
  blurb:
    "Cyber Fleet Services deploys and operates the security robots, drones, and monitoring that turn a robot-ready building into a working autonomous site — 24/7 patrol, incident response, and fleet maintenance handled for you.",
  highlights: [
    "Robotic security patrol & remote monitoring",
    "Drone-based site surveillance and inspection",
    "Fleet deployment, charging, and maintenance",
    "90-day pilot program to prove ROI before you commit",
  ],
} as const

// Tesla business-charging referrals surfaced alongside the Cyber Fleet offer.
// These are simple outbound referrals to Tesla's commercial charging programs —
// they are NOT part of the internal referral pipeline (no status tracking).
export type TeslaReferral = {
  id: string
  name: string
  blurb: string
  url: string
}

export const TESLA_REFERRALS: readonly TeslaReferral[] = [
  {
    id: "supercharger-business",
    name: "Tesla Supercharger for Business",
    blurb:
      "Own white-labeled DC fast-charging on site, with Tesla handling network operations, maintenance, and driver support. Ideal for fleet turnaround and public charging revenue.",
    url: "https://www.tesla.com/support/supercharging-your-business",
  },
  {
    id: "wall-connector-business",
    name: "Tesla Wall Connector for Business",
    blurb:
      "Level 2 charging for workplaces and properties, installed by a Tesla Certified Installer. Set your own pricing or offer free charging to guests and employees.",
    url: "https://www.tesla.com/support/charging-your-business",
  },
] as const

// Default qualifying RoboReady Score band. Admin-editable per workspace via the
// partner_setting table; these are the fallbacks when no row exists yet.
export const DEFAULT_QUALIFY_MIN = 50
export const DEFAULT_QUALIFY_MAX = 100

export type ScoreRange = { min: number; max: number; enabled: boolean }

export const DEFAULT_SCORE_RANGE: ScoreRange = {
  min: DEFAULT_QUALIFY_MIN,
  max: DEFAULT_QUALIFY_MAX,
  enabled: true,
}

// Referral pipeline status. `eligible` is auto-created when an assessment
// qualifies; `requested` is set when the owner asks for the evaluation; the
// remaining states are moved by staff/admin as the partner handoff progresses.
export const REFERRAL_STATUSES = [
  "eligible",
  "requested",
  "accepted",
  "rejected",
  "deal",
  "dismissed",
] as const

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  eligible: "Eligible",
  requested: "Requested",
  accepted: "Accepted",
  rejected: "Rejected",
  deal: "Deal won",
  dismissed: "Dismissed",
}

// Statuses an admin can move a referral to from the console.
export const ADMIN_ACTIONABLE_STATUSES: ReferralStatus[] = [
  "requested",
  "accepted",
  "rejected",
  "deal",
  "dismissed",
]

/** Everything a client-facing referral CTA needs to render. */
export type ReferralCtaData = {
  status: ReferralStatus | null
  qualifies: boolean
  defaultName?: string | null
  defaultEmail?: string | null
}

/** Pure: does a score fall inside an (inclusive) qualifying band? */
export function isQualifyingScore(score: number | null | undefined, range: ScoreRange): boolean {
  if (!range.enabled) return false
  if (score === null || score === undefined || Number.isNaN(score)) return false
  return score >= range.min && score <= range.max
}

/** Clamp + sanitize an admin-submitted range so min<=max and both in 0..100. */
export function normalizeRange(min: number, max: number, enabled: boolean): ScoreRange {
  const lo = Math.max(0, Math.min(100, Math.round(Number.isFinite(min) ? min : DEFAULT_QUALIFY_MIN)))
  const hi = Math.max(0, Math.min(100, Math.round(Number.isFinite(max) ? max : DEFAULT_QUALIFY_MAX)))
  return { min: Math.min(lo, hi), max: Math.max(lo, hi), enabled }
}
