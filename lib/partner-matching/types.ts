export const PARTNER_CATEGORIES = ["robotics", "charging", "both"] as const
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number]

export const REFERRAL_STATUSES = [
  "draft",
  "under_review",
  "sent",
  "accepted",
  "declined",
  "in_progress",
  "won",
  "lost",
  "withdrawn",
] as const
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number]

export const CONSENT_METHODS = ["email", "phone", "in_person", "written", "other"] as const
export type ConsentMethod = (typeof CONSENT_METHODS)[number]

export type PartnerCoverage = {
  nationwide: boolean
  country: string | null
  areas: string[]
}

export type PartnerProfile = {
  id: string
  name: string
  category: PartnerCategory
  capabilities: string[]
  coverage: PartnerCoverage
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  active: boolean
}

export type MatchOpportunity = {
  propertyId: string
  leadId: string | null
  propertyName: string
  leadCompany: string | null
  city: string | null
  region: string | null
  country: string | null
  needs: string[]
}

export type PartnerMatch = {
  partner: PartnerProfile
  matched: boolean
  reasons: string[]
  unmet: string[]
}

export type PartnerReferralView = {
  id: string
  partnerId: string
  partnerName: string
  propertyId: string
  propertyName: string
  leadCompany: string | null
  propertySnapshot: { name: string; city: string | null; region: string | null; country: string | null }
  matchReasons: string[]
  status: ReferralStatus
  notes: string | null
  consentObtainedAt: Date | null
  consentObtainedByUserId: string | null
  consentMethod: string | null
  consentReference: string | null
  sentAt: Date | null
  respondedAt: Date | null
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PartnerWorkspace = {
  partners: PartnerProfile[]
  opportunities: MatchOpportunity[]
  referrals: PartnerReferralView[]
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export type PartnerInput = {
  name: string
  category: PartnerCategory
  capabilities: string[]
  coverage: PartnerCoverage
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
}
