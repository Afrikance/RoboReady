import { matchPartner, normalizePartnerCoverage, isPartnerCategory } from "@/lib/partner-matching/core"
import type { MatchOpportunity, PartnerProfile } from "@/lib/partner-matching/types"
import type { RoboticsInterestRecommendation } from "@/lib/db/schema"

export const ROBOTICS_USE_CASES = [
  { value: "last_mile_delivery", label: "Last-mile delivery" },
  { value: "food_and_beverage", label: "Food and beverage service" },
  { value: "material_movement", label: "Material movement" },
  { value: "cleaning_maintenance", label: "Cleaning and maintenance" },
  { value: "security_patrol", label: "Security patrol" },
  { value: "site_inspection", label: "Site inspection" },
  { value: "guest_assistance", label: "Guest assistance" },
  { value: "other", label: "Other" },
] as const

export const ROBOTICS_TASKS = [
  { value: "package_delivery", label: "Packages and supplies" },
  { value: "food_delivery", label: "Food and beverage" },
  { value: "linen_or_waste", label: "Linen, waste, or carts" },
  { value: "cleaning", label: "Cleaning rounds" },
  { value: "security_patrol", label: "Security patrols" },
  { value: "inspection", label: "Inspection and monitoring" },
  { value: "guest_support", label: "Guest or visitor support" },
  { value: "inventory", label: "Inventory movement" },
  { value: "other", label: "Another recurring task" },
] as const

export type RoboticsUseCase = (typeof ROBOTICS_USE_CASES)[number]["value"]
export type RoboticsTask = (typeof ROBOTICS_TASKS)[number]["value"]

export type RoboticsInterestStatus = "submitted" | "under_review" | "needs_info" | "recommended" | "closed"

export type RoboticsInterestEnvironment = {
  location: "indoor" | "outdoor" | "mixed"
  access: "public" | "restricted" | "mixed"
  operatingHours: string
}

export type RoboticsInterestFormInput = {
  useCase: RoboticsUseCase
  tasks: RoboticsTask[]
  otherTaskDetail?: string
  environment: RoboticsInterestEnvironment
  operatingConditions?: string
  humanHandoff?: string
  safetyRequirements?: string
  integrationNeeds?: string
  serviceNeeds?: string
  budgetRange?: string
  targetTimeline: string
  additionalContext?: string
  contactPhone?: string
  contactPreference: "email" | "phone"
  contactConsent: boolean
}

export type RoboticsInterestMatchInput = {
  propertyId: string
  propertyName: string
  city: string | null
  region: string | null
  country: string | null
  useCase: string
  tasks: string[]
}

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase()
}

function tokenize(values: readonly string[]): Set<string> {
  const ignored = new Set(["and", "for", "the", "with", "from", "robot", "robots", "robotics", "service", "services", "system", "systems", "other"])
  return new Set(
    values
      .flatMap((value) => normalize(value).split(/[^\p{L}\p{N}]+/u))
      .filter((token) => token.length >= 3 && !ignored.has(token)),
  )
}

function termsForUseCase(value: string): string {
  return ROBOTICS_USE_CASES.find((item) => item.value === value)?.label ?? value
}

function termsForTask(value: string): string {
  if (value.startsWith("other:")) return value.slice("other:".length)
  return ROBOTICS_TASKS.find((item) => item.value === value)?.label ?? value
}

export function toPartnerProfile(row: {
  id: string
  name: string
  category: string
  capabilities: unknown
  coverage: unknown
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  active: boolean
}): PartnerProfile | null {
  const coverage = normalizePartnerCoverage(row.coverage)
  if (!isPartnerCategory(row.category) || !coverage) return null
  const capabilities = Array.isArray(row.capabilities)
    ? row.capabilities.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : []
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    capabilities,
    coverage,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    active: row.active,
  }
}

export function rankRoboticsPartners(
  input: RoboticsInterestMatchInput,
  partners: readonly PartnerProfile[],
): RoboticsInterestRecommendation[] {
  const opportunity: MatchOpportunity = {
    propertyId: input.propertyId,
    leadId: null,
    propertyName: input.propertyName,
    leadCompany: null,
    city: input.city,
    region: input.region,
    country: input.country,
    needs: ["robotics"],
  }
  const requestedTerms = tokenize([termsForUseCase(input.useCase), ...input.tasks.map(termsForTask)])
  if (requestedTerms.size === 0) return []

  return partners
    .flatMap((partner) => {
      if (!partner.active || (partner.category !== "robotics" && partner.category !== "both")) return []
      const fit = matchPartner(opportunity, partner, ["robotics"])
      if (!fit.matched) return []

      const matchedCapabilities = partner.capabilities.filter((capability) => {
        const capabilityTerms = tokenize([capability])
        return [...capabilityTerms].some((term) => requestedTerms.has(term))
      })
      const matchedTerms = new Set(matchedCapabilities.flatMap((capability) => [...tokenize([capability])].filter((term) => requestedTerms.has(term))))
      if (matchedTerms.size === 0) return []

      const tagCoverage = Math.round((matchedTerms.size / requestedTerms.size) * 100)
      const reasons = [
        ...fit.reasons.filter((reason) => !reason.startsWith("Capabilities for staff review:")),
        `Capability tags overlap on: ${matchedCapabilities.join(", ")}.`,
        `Task-tag coverage: ${tagCoverage}% (${matchedTerms.size} of ${requestedTerms.size} request terms).`,
      ]
      return [{
        partnerId: partner.id,
        partnerName: partner.name,
        category: partner.category,
        tagCoverage,
        matchedCapabilities,
        reasons,
      }]
    })
    .sort((a, b) => b.tagCoverage - a.tagCoverage || a.partnerName.localeCompare(b.partnerName))
    .slice(0, 3)
}

export function isRoboticsInterestStatus(value: unknown): value is RoboticsInterestStatus {
  return value === "submitted" || value === "under_review" || value === "needs_info" || value === "recommended" || value === "closed"
}

export function roboticsInterestStatusLabel(status: RoboticsInterestStatus): string {
  const labels: Record<RoboticsInterestStatus, string> = {
    submitted: "Submitted",
    under_review: "Under review",
    needs_info: "Follow-up needed",
    recommended: "Fit selected",
    closed: "Closed",
  }
  return labels[status]
}

export function eligibleManualPartner(partner: PartnerProfile): boolean {
  return partner.active && (partner.category === "robotics" || partner.category === "both")
}

export function statusNeedsPartner(status: RoboticsInterestStatus): boolean {
  return status === "recommended"
}

export function contactNeedsPhone(preference: string, phone: string | null | undefined): boolean {
  return preference !== "phone" || Boolean(phone?.trim())
}

export function clampInterestText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const clean = value.trim().slice(0, maxLength)
  return clean || null
}

export function isRoboticsUseCase(value: unknown): value is RoboticsUseCase {
  return typeof value === "string" && ROBOTICS_USE_CASES.some((item) => item.value === value)
}

export function isRoboticsTask(value: unknown): value is RoboticsTask {
  return typeof value === "string" && ROBOTICS_TASKS.some((item) => item.value === value)
}

export function isRoboticsContactPreference(value: unknown): value is "email" | "phone" {
  return value === "email" || value === "phone"
}
