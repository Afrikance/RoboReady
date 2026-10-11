import type { MatchOpportunity, PartnerMatch, PartnerProfile, PartnerCategory, PartnerCoverage } from "./types"

export const OPPORTUNITY_CATEGORIES = ["robotics", "charging"] as const
export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number]

export function isPartnerCategory(value: unknown): value is PartnerCategory {
  return value === "robotics" || value === "charging" || value === "both"
}

export function normalizePartnerCoverage(value: unknown): PartnerCoverage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (typeof input.nationwide !== "boolean") return null
  const country = typeof input.country === "string" ? input.country.trim().toUpperCase() : ""
  const areas = Array.isArray(input.areas)
    ? input.areas.filter((area): area is string => typeof area === "string").map((area) => area.trim()).filter(Boolean).slice(0, 30)
    : []
  if (!input.nationwide && areas.length === 0) return null
  if (input.nationwide && !country) return null
  return { nationwide: input.nationwide, country: country || null, areas: [...new Set(areas)] }
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
}

function servesCategory(partner: PartnerProfile, category: OpportunityCategory): boolean {
  return partner.category === "both" || partner.category === category
}

function territoryMatch(coverage: PartnerCoverage, opportunity: MatchOpportunity): { ok: boolean; reason: string } {
  const country = normalize(opportunity.country)
  const coveredCountry = normalize(coverage.country)
  if (!country) return { ok: false, reason: "Property country is missing, so coverage cannot be verified." }
  if (coveredCountry && country !== coveredCountry) {
    return { ok: false, reason: `Serves ${coverage.country} only; property is in ${opportunity.country}.` }
  }
  if (coverage.nationwide) return { ok: true, reason: `Nationwide coverage in ${coverage.country}.` }

  const locationTokens = [opportunity.city, opportunity.region].map(normalize).filter(Boolean)
  const coveredAreas = coverage.areas.map(normalize)
  const matchingArea = locationTokens.find((token) => coveredAreas.includes(token))
  if (matchingArea) return { ok: true, reason: `Covers ${opportunity.city && normalize(opportunity.city) === matchingArea ? opportunity.city : opportunity.region}.` }
  return { ok: false, reason: "No matching city or region in the partner's coverage." }
}

export function matchPartner(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  const reasons: string[] = []
  const unmet: string[] = []
  if (!partner.active) unmet.push("Partner is inactive.")

  if (needs.length === 0) unmet.push("Select at least one solution need to match.")
  for (const need of needs) {
    if (servesCategory(partner, need)) reasons.push(`Supports ${need === "charging" ? "EV charging" : "robotics"}.`)
    else unmet.push(`Does not support ${need === "charging" ? "EV charging" : "robotics"}.`)
  }

  const territory = territoryMatch(partner.coverage, opportunity)
  if (territory.ok) reasons.push(territory.reason)
  else unmet.push(territory.reason)

  if (partner.capabilities.length) reasons.push(`Capabilities for staff review: ${partner.capabilities.join(", ")}.`)
  return { partner, matched: unmet.length === 0, reasons, unmet }
}

const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["under_review", "withdrawn"],
  under_review: ["sent", "withdrawn"],
  sent: ["accepted", "declined", "withdrawn"],
  accepted: ["in_progress", "withdrawn"],
  in_progress: ["won", "lost", "withdrawn"],
  declined: [],
  won: [],
  lost: [],
  withdrawn: [],
}

export function canTransitionReferral(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export function deriveOpportunityNeeds(value: unknown): OpportunityCategory[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  const scores = (value as Record<string, unknown>).keyPointScores
  if (!Array.isArray(scores)) return []
  let roboticsWeak = false
  let chargingWeak = false
  for (const item of scores) {
    if (!item || typeof item !== "object") continue
    const score = item as Record<string, unknown>
    if (typeof score.keyPointId !== "string" || typeof score.points !== "number") continue
    if (score.keyPointId.startsWith("rob-")) roboticsWeak ||= score.points < 1.5
    if (score.keyPointId.startsWith("ev-")) chargingWeak ||= score.points < 1.5
  }
  return [ ...(roboticsWeak ? ["robotics" as const] : []), ...(chargingWeak ? ["charging" as const] : []) ]
}

export function cleanCapabilityTags(value: unknown): string[] | null {
  const values = typeof value === "string" ? value.split(",") : value
  if (!Array.isArray(values)) return null
  const tags = [...new Set(values.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).map((item) => item.slice(0, 60)))].slice(0, 20)
  return tags
}

export function isOpportunityCategory(value: unknown): value is OpportunityCategory {
  return value === "robotics" || value === "charging"
}

export function isValidConsentMethod(value: unknown): value is "email" | "phone" | "in_person" | "written" | "other" {
  return value === "email" || value === "phone" || value === "in_person" || value === "written" || value === "other"
}

export function normalizeOpportunityNeeds(value: unknown): OpportunityCategory[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 2 || !value.every(isOpportunityCategory)) return null
  return [...new Set(value)]
}

export function safeTrim(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const result = value.trim().slice(0, maxLength)
  return result || null
}

export function validPartnerEmail(value: string | null): boolean {
  return value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function opportunityCategoryLabel(category: OpportunityCategory): string {
  return category === "charging" ? "EV charging" : "Robotics"
}

export function toOpportunityCategories(values: readonly string[]): OpportunityCategory[] {
  return values.filter(isOpportunityCategory)
}

export function isPartnerMatch(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): boolean {
  return matchPartner(opportunity, partner, needs).matched
}

export function matchPartnerByCoverage(opportunity: MatchOpportunity, partner: PartnerProfile): boolean {
  return territoryMatch(partner.coverage, opportunity).ok
}

export function shouldIncludeOpportunity(score: number | null, qualifiedLead: boolean): boolean {
  return qualifiedLead || (score !== null && Number.isFinite(score) && score >= 50)
}

export function formatOpportunityLocation(opportunity: Pick<MatchOpportunity, "city" | "region" | "country">): string {
  return [opportunity.city, opportunity.region, opportunity.country].filter(Boolean).join(", ") || "Location not provided"
}

export function profileFromRow(row: PartnerProfile): PartnerProfile {
  return row
}

export function comparePartnerNames(a: PartnerProfile, b: PartnerProfile): number {
  return a.name.localeCompare(b.name)
}

export function hasCapability(partner: PartnerProfile, capability: string): boolean {
  const needle = normalize(capability)
  return partner.capabilities.some((item) => normalize(item) === needle)
}

export function isNeedList(value: unknown): value is OpportunityCategory[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 2 && value.every(isOpportunityCategory)
}

export function clampNotes(value: unknown): string | null {
  return safeTrim(value, 4000)
}

export function clampConsentReference(value: unknown): string | null {
  return safeTrim(value, 240)
}

export function clampPartnerName(value: unknown): string | null {
  const name = safeTrim(value, 100)
  return name && name.length >= 2 ? name : null
}

export function validatePartnerContact(value: unknown, maxLength: number): string | null {
  return safeTrim(value, maxLength)
}

export function partnerSupportsAnyCategory(partner: PartnerProfile, categories: readonly OpportunityCategory[]): boolean {
  return categories.some((category) => servesCategory(partner, category))
}

export function isNationwideCoverage(coverage: PartnerCoverage): boolean {
  return coverage.nationwide
}

export function hasLocation(opportunity: MatchOpportunity): boolean {
  return Boolean(opportunity.country && (opportunity.city || opportunity.region))
}

export function matchReasonsForPartner(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): string[] {
  return matchPartner(opportunity, partner, needs).reasons
}

export function unmetCriteriaForPartner(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): string[] {
  return matchPartner(opportunity, partner, needs).unmet
}

export function partnerCategoryLabel(category: PartnerCategory): string {
  if (category === "both") return "Robotics + charging"
  return category === "charging" ? "EV charging" : "Robotics"
}

export function isSupportedPartnerCategory(category: string): category is PartnerCategory {
  return isPartnerCategory(category)
}

export function isReferralStatus(value: unknown, statuses: readonly string[]): value is string {
  return typeof value === "string" && statuses.includes(value)
}

export function isCoverageArea(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 100
}

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null
  const country = value.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(country) ? country : null
}

export function partnerMatchSummary(matches: readonly PartnerMatch[]): { matched: number; reviewed: number } {
  return { matched: matches.filter((item) => item.matched).length, reviewed: matches.length }
}

export function sameOrganizationId(left: string, right: string): boolean {
  return left === right
}

export function isValidPartnerInputName(value: unknown): boolean {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 100
}

export function allowedStatusTransition(from: string, to: string): boolean {
  return canTransitionReferral(from, to)
}

export function eligibleForReferral(score: number | null, qualifiedLead: boolean): boolean {
  return shouldIncludeOpportunity(score, qualifiedLead)
}

export function canSendReferral(consentAt: Date | null, consentBy: string | null, consentMethod: string | null): boolean {
  return Boolean(consentAt && consentBy && consentMethod)
}

export function opportunityHasCategoryNeeds(needs: readonly OpportunityCategory[]): boolean {
  return needs.length > 0
}

export function isCoverageValid(value: unknown): value is PartnerCoverage {
  return normalizePartnerCoverage(value) !== null
}

export function isValidPartnerContactEmail(value: unknown): boolean {
  return typeof value === "string" && validPartnerEmail(value.trim() || null)
}

export function emptyMatch(opportunity: MatchOpportunity, partner: PartnerProfile): PartnerMatch {
  return matchPartner(opportunity, partner, [])
}

export function referralNeedsConsent(status: string): boolean {
  return ["sent", "accepted", "declined", "in_progress", "won", "lost"].includes(status)
}

export function sortMatches(matches: readonly PartnerMatch[]): PartnerMatch[] {
  return [...matches].sort((a, b) => Number(b.matched) - Number(a.matched) || a.partner.name.localeCompare(b.partner.name))
}

export function matchNeedsSummary(needs: readonly OpportunityCategory[]): string {
  return needs.map(opportunityCategoryLabel).join(" + ")
}

export function partnerCoverageSummary(coverage: PartnerCoverage): string {
  if (coverage.nationwide) return `Nationwide · ${coverage.country}`
  return `${coverage.areas.join(", ")}${coverage.country ? ` · ${coverage.country}` : ""}`
}

export function isPartnerProfile(value: unknown): value is PartnerProfile {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<PartnerProfile>
  return typeof row.id === "string" && typeof row.name === "string" && isPartnerCategory(row.category)
}

export function isMatchOpportunity(value: unknown): value is MatchOpportunity {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<MatchOpportunity>
  return typeof row.propertyId === "string" && typeof row.propertyName === "string"
}

export function matchPartnerCandidates(opportunity: MatchOpportunity, partners: readonly PartnerProfile[], needs: readonly OpportunityCategory[]): PartnerMatch[] {
  return sortMatches(partners.map((partner) => matchPartner(opportunity, partner, needs)))
}

export function isConsentRequiredForStatus(status: string): boolean {
  return referralNeedsConsent(status)
}

export function normalizeTextList(value: unknown): string[] | null {
  return cleanCapabilityTags(value)
}

export function hasPartnerCoverage(partner: PartnerProfile, opportunity: MatchOpportunity): boolean {
  return matchPartnerByCoverage(opportunity, partner)
}

export function partnerMatchesOpportunity(partner: PartnerProfile, opportunity: MatchOpportunity, needs: readonly OpportunityCategory[]): boolean {
  return isPartnerMatch(opportunity, partner, needs)
}

export function isValidPartnerCoverage(coverage: unknown): coverage is PartnerCoverage {
  return isCoverageValid(coverage)
}

export function isValidCategorySelection(value: unknown): value is OpportunityCategory[] {
  return isNeedList(value)
}

export function canAdvanceToSent(status: string, consentAt: Date | null, consentBy: string | null, consentMethod: string | null): boolean {
  return status === "under_review" && canSendReferral(consentAt, consentBy, consentMethod)
}

export function optionalContact(value: unknown, maxLength: number): string | null {
  return validatePartnerContact(value, maxLength)
}

export function getNeedCategoriesFromScores(value: unknown): OpportunityCategory[] {
  return deriveOpportunityNeeds(value)
}

export function isOpportunityQualified(score: number | null, leadStage: string | null): boolean {
  return shouldIncludeOpportunity(score, leadStage === "qualified")
}

export function getOpportunityNeedReason(category: OpportunityCategory): string {
  return category === "charging" ? "EV charging readiness may need partner support." : "Robotics readiness may need partner support."
}

export function getCoverageReason(coverage: PartnerCoverage): string {
  return partnerCoverageSummary(coverage)
}

export function matchPartnerForOpportunity(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function validatePartnerProfile(input: {
  name: unknown
  category: unknown
  capabilities: unknown
  coverage: unknown
}): { name: string; category: PartnerCategory; capabilities: string[]; coverage: PartnerCoverage } | null {
  const name = clampPartnerName(input.name)
  const capabilities = cleanCapabilityTags(input.capabilities)
  const coverage = normalizePartnerCoverage(input.coverage)
  if (!name || !isPartnerCategory(input.category) || !capabilities || !coverage) return null
  return { name, category: input.category, capabilities, coverage }
}

export function normalizeInputNeeds(value: unknown): OpportunityCategory[] | null {
  return normalizeOpportunityNeeds(value)
}

export function isSupportedReferralTransition(from: string, to: string): boolean {
  return canTransitionReferral(from, to)
}

export function createPartnerMatch(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function isPartnerEligibleForOpportunity(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): boolean {
  return matchPartner(opportunity, partner, needs).matched
}

export function hasValidConsent(attestation: { obtainedAt: Date | null; obtainedBy: string | null; method: string | null }): boolean {
  return canSendReferral(attestation.obtainedAt, attestation.obtainedBy, attestation.method)
}

export function referralTransitionNeedsConsent(from: string, to: string): boolean {
  return to === "sent" || (from === "sent" && ["accepted", "declined"].includes(to))
}

export function activeMatchCount(matches: readonly PartnerMatch[]): number {
  return matches.filter((item) => item.matched).length
}

export function filterMatchCandidates(matches: readonly PartnerMatch[]): PartnerMatch[] {
  return matches.filter((item) => item.matched)
}

export function profileCoverageCovers(coverage: PartnerCoverage, opportunity: MatchOpportunity): boolean {
  return territoryMatch(coverage, opportunity).ok
}

export function sanitizeCoverage(value: unknown): PartnerCoverage | null {
  return normalizePartnerCoverage(value)
}

export function isAllowedStatusTransition(from: string, to: string): boolean {
  return canTransitionReferral(from, to)
}

export function getPartnerMatchReasons(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function matchedCapabilities(partner: PartnerProfile): string[] {
  return partner.capabilities
}

export function statusLabel(status: string): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function normalizePartnerInput(input: {
  name: unknown
  category: unknown
  capabilities: unknown
  coverage: unknown
}): { name: string; category: PartnerCategory; capabilities: string[]; coverage: PartnerCoverage } | null {
  return validatePartnerProfile(input)
}

export function validConsentMethod(value: unknown): value is "email" | "phone" | "in_person" | "written" | "other" {
  return isValidConsentMethod(value)
}

export function matchScoreLabel(match: PartnerMatch): string {
  return match.matched ? "Meets selected criteria" : `${match.unmet.length} criteria unmet`
}

export function getOpportunityCategoryChoices(): readonly OpportunityCategory[] {
  return OPPORTUNITY_CATEGORIES
}

export function normalizeNotes(value: unknown): string | null {
  return clampNotes(value)
}

export function validateEmail(value: unknown): string | null {
  const email = safeTrim(value, 320)
  return validPartnerEmail(email) ? email : null
}

export function isQualifiedLeadStage(value: unknown): boolean {
  return value === "qualified"
}

export function referralIsTerminal(status: string): boolean {
  return (ALLOWED_TRANSITIONS[status] ?? []).length === 0
}

export function noSensitiveOpportunityData(opportunity: MatchOpportunity): Pick<MatchOpportunity, "propertyId" | "propertyName" | "leadCompany" | "city" | "region" | "country" | "needs"> {
  return {
    propertyId: opportunity.propertyId,
    propertyName: opportunity.propertyName,
    leadCompany: opportunity.leadCompany,
    city: opportunity.city,
    region: opportunity.region,
    country: opportunity.country,
    needs: opportunity.needs,
  }
}

export function asReferralStatus(value: string): import("./types").ReferralStatus | null {
  return (REFERRAL_STATUSES as readonly string[]).includes(value) ? (value as import("./types").ReferralStatus) : null
}

import { REFERRAL_STATUSES } from "./types"

export function isReferralStatusValue(value: unknown): value is import("./types").ReferralStatus {
  return typeof value === "string" && (REFERRAL_STATUSES as readonly string[]).includes(value)
}

export function partnerIdMatches(value: unknown, partnerId: string): boolean {
  return typeof value === "string" && value === partnerId
}

export function safeReferralStatus(value: unknown): import("./types").ReferralStatus | null {
  return asReferralStatus(typeof value === "string" ? value : "")
}

export function isStatusFinal(status: string): boolean {
  return ["won", "lost", "declined", "withdrawn"].includes(status)
}

export function cleanReferralNote(value: unknown): string | null {
  return clampNotes(value)
}

export function getSupportedNeedCategories(partner: PartnerProfile): OpportunityCategory[] {
  return OPPORTUNITY_CATEGORIES.filter((category) => servesCategory(partner, category))
}

export function capabilityLabel(capability: string): string {
  return capability
}

export function isPropertyCountryCode(value: unknown): boolean {
  return normalizeCountryCode(value) !== null
}

export function isNationwideCoverageValid(coverage: PartnerCoverage): boolean {
  return coverage.nationwide && Boolean(coverage.country)
}

export function referralCanBeSent(status: string, consentObtainedAt: Date | null, consentObtainedByUserId: string | null, consentMethod: string | null): boolean {
  return canAdvanceToSent(status, consentObtainedAt, consentObtainedByUserId, consentMethod)
}

export function getMatchUnmet(match: PartnerMatch): string[] {
  return match.unmet
}

export function getMatchReasons(match: PartnerMatch): string[] {
  return match.reasons
}

export function isValidTagList(value: unknown): boolean {
  return cleanCapabilityTags(value) !== null
}

export function referralsByStatus<T extends { status: string }>(rows: readonly T[], status: string): T[] {
  return rows.filter((row) => row.status === status)
}

export function selectBestPartnerMatches(matches: readonly PartnerMatch[]): PartnerMatch[] {
  return sortMatches(matches)
}

export function matchOpportunityNeeds(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function isMatchingInputValid(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): boolean {
  return matchPartner(opportunity, partner, needs).matched
}

export function filterPartnersByActive(partners: readonly PartnerProfile[]): PartnerProfile[] {
  return partners.filter((partner) => partner.active)
}

export function hasAtLeastOneNeed(needs: readonly OpportunityCategory[]): boolean {
  return needs.length > 0
}

export function isValidPartnerCoverageInput(value: unknown): value is PartnerCoverage {
  return normalizePartnerCoverage(value) !== null
}

export function defaultOpportunityNeeds(value: unknown): OpportunityCategory[] {
  return deriveOpportunityNeeds(value)
}

export function simplifyCoverageText(coverage: PartnerCoverage): string {
  return coverage.nationwide ? `Nationwide (${coverage.country})` : [coverage.areas.join(", "), coverage.country].filter(Boolean).join(" · ")
}

export function canReferOpportunity(opportunity: MatchOpportunity, score: number | null, qualifiedLead: boolean): boolean {
  return shouldIncludeOpportunity(score, qualifiedLead) && Boolean(opportunity.propertyId)
}

export function isSupportedCategory(value: unknown): value is PartnerCategory {
  return isPartnerCategory(value)
}

export function partnerContactSummary(partner: PartnerProfile): string {
  return [partner.contactName, partner.contactEmail, partner.contactPhone].filter(Boolean).join(" · ")
}

export function uniqueText(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function referralUpdatePayload(status: string): { sent: boolean; responded: boolean; closed: boolean } {
  return { sent: status === "sent", responded: status === "accepted" || status === "declined", closed: ["won", "lost", "withdrawn"].includes(status) }
}

export function normalizeAreaName(value: string): string {
  return normalize(value)
}

export function categorySupportsNeed(category: PartnerCategory, need: OpportunityCategory): boolean {
  return category === "both" || category === need
}

export function validOpportunityCountry(value: string | null): boolean {
  return Boolean(value && /^[A-Za-z]{2}$/.test(value.trim()))
}

export function isInternalOnlyReferral(_status: string): true {
  return true
}

export function filterReferralsToOrganization<T extends { organizationId?: string }>(rows: readonly T[], organizationId: string): T[] {
  return rows.filter((row) => row.organizationId === organizationId)
}

export function sanitizePartnerCapabilities(value: unknown): string[] | null {
  return cleanCapabilityTags(value)
}

export function isSafePartnerName(value: unknown): boolean {
  return isValidPartnerInputName(value)
}

export function opportunityIncludesNeed(opportunity: MatchOpportunity, category: OpportunityCategory): boolean {
  return opportunity.needs.includes(category)
}

export function isLocationCovered(coverage: PartnerCoverage, opportunity: MatchOpportunity): boolean {
  return territoryMatch(coverage, opportunity).ok
}

export function isSupportedReferralStage(status: string): boolean {
  return (REFERRAL_STATUSES as readonly string[]).includes(status)
}

export function parsePartnerCoverage(input: unknown): PartnerCoverage | null {
  return normalizePartnerCoverage(input)
}

export function getPartnerName(partner: PartnerProfile): string {
  return partner.name
}

export function matchesNeedCategories(partner: PartnerProfile, needs: readonly OpportunityCategory[]): boolean {
  return needs.length > 0 && needs.every((need) => servesCategory(partner, need))
}

export function validOpportunityId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 80
}

export function matchPartnerProfile(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function statusOptions(): readonly string[] {
  return REFERRAL_STATUSES
}

export function sanitizePartnerInput(input: {
  name: unknown
  category: unknown
  capabilities: unknown
  coverage: unknown
}): { name: string; category: PartnerCategory; capabilities: string[]; coverage: PartnerCoverage } | null {
  return validatePartnerProfile(input)
}

export function areaMatchesCoverage(coverage: PartnerCoverage, city: string | null, region: string | null): boolean {
  const areas = coverage.areas.map(normalize)
  return [city, region].map(normalize).some((item) => item && areas.includes(item))
}

export function referralConsentStatus(status: string): "required" | "not_required" {
  return referralNeedsConsent(status) ? "required" : "not_required"
}

export function canCreateDraft(match: PartnerMatch): boolean {
  return match.matched
}

export function needsFromAssessment(value: unknown): OpportunityCategory[] {
  return deriveOpportunityNeeds(value)
}

export function canUsePartnerWorkspace(role: string): boolean {
  return role === "owner" || role === "admin"
}

export function requirePartnerAdmin(role: string): boolean {
  return canUsePartnerWorkspace(role)
}

export function referralCountsByStatus(rows: readonly { status: string }[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), {})
}

export function isValidOpportunityNeeds(value: unknown): value is OpportunityCategory[] {
  return isNeedList(value)
}

export function isPartnerNameUniqueCandidate(name: string, names: readonly string[]): boolean {
  return !names.some((item) => normalize(item) === normalize(name))
}

export function needsSummary(needs: readonly OpportunityCategory[]): string {
  return needs.map(opportunityCategoryLabel).join(", ")
}

export function validContactPhone(value: unknown): string | null {
  return safeTrim(value, 40)
}

export function validContactName(value: unknown): string | null {
  return safeTrim(value, 120)
}

export function validCoverageAreaList(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 30 && value.every(isCoverageArea)
}

export function validatePartnerData(input: {
  name: unknown
  category: unknown
  capabilities: unknown
  coverage: unknown
}): { name: string; category: PartnerCategory; capabilities: string[]; coverage: PartnerCoverage } | null {
  return validatePartnerProfile(input)
}

export function referralStageCanTransition(from: string, to: string): boolean {
  return canTransitionReferral(from, to)
}

export function shouldRequireConsent(status: string): boolean {
  return referralNeedsConsent(status)
}

export function validatePartnerDataEmail(value: unknown): boolean {
  return isValidPartnerContactEmail(value)
}

export function validatePartnerDataCoverage(value: unknown): boolean {
  return isCoverageValid(value)
}

export function matchKnownOpportunityNeeds(opportunity: MatchOpportunity, partner: PartnerProfile): PartnerMatch {
  return matchPartner(opportunity, partner, toOpportunityCategories(opportunity.needs))
}

export function validateMatchNeeds(value: unknown): OpportunityCategory[] | null {
  return normalizeOpportunityNeeds(value)
}

export function coverageCountryMatches(coverage: PartnerCoverage, country: string | null): boolean {
  return !coverage.country || normalize(coverage.country) === normalize(country)
}

export function isQualifiedOpportunity(score: number | null, leadStage: string | null): boolean {
  return shouldIncludeOpportunity(score, leadStage === "qualified")
}

export function contactValid(email: string | null): boolean {
  return validPartnerEmail(email)
}

export function createOpportunityLabel(propertyName: string, location: string): string {
  return `${propertyName} · ${location}`
}

export function normalizePartnerDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export function validCapabilities(value: unknown): string[] | null {
  return cleanCapabilityTags(value)
}

export function hasPartnerCategory(partner: PartnerProfile, category: OpportunityCategory): boolean {
  return servesCategory(partner, category)
}

export function isStageTerminal(status: string): boolean {
  return referralIsTerminal(status)
}

export function inCoverageCountry(coverage: PartnerCoverage, country: string | null): boolean {
  return coverageCountryMatches(coverage, country)
}

export function isValidReferralConsent(method: unknown): boolean {
  return isValidConsentMethod(method)
}

export function getDefaultPartnerCoverage(): PartnerCoverage {
  return { nationwide: false, country: null, areas: [] }
}

export function hasAnyCapability(partner: PartnerProfile): boolean {
  return partner.capabilities.length > 0
}

export function referralStatusCanChange(status: string): boolean {
  return !referralIsTerminal(status)
}

export function validConsentReference(value: unknown): string | null {
  return safeTrim(value, 240)
}

export function validateOpportunitySelection(value: unknown): boolean {
  return validOpportunityId(value)
}

export function opportunityMatchesSelectedCategories(opportunity: MatchOpportunity, needs: readonly OpportunityCategory[]): boolean {
  return needs.length > 0 && needs.every((need) => opportunity.needs.includes(need))
}

export function isAnyPartnerCategory(value: unknown): value is PartnerCategory {
  return isPartnerCategory(value)
}

export function shouldShowMatchResults(opportunity: MatchOpportunity | null, needs: readonly OpportunityCategory[]): boolean {
  return Boolean(opportunity && needs.length)
}

export function isCurrentOrganization(id: string, organizationId: string): boolean {
  return id === organizationId
}

export function stripUnsafeText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim()
}

export function cleanUserText(value: unknown, maxLength: number): string | null {
  const text = safeTrim(value, maxLength)
  return text ? stripUnsafeText(text) : null
}

export function validatePartnerName(value: unknown): string | null {
  const name = cleanUserText(value, 100)
  return name && name.length >= 2 ? name : null
}

export function trimCapabilityList(value: unknown): string[] | null {
  return cleanCapabilityTags(value)
}

export function referralHasConsent(referral: { consentObtainedAt: Date | null; consentObtainedByUserId: string | null; consentMethod: string | null }): boolean {
  return canSendReferral(referral.consentObtainedAt, referral.consentObtainedByUserId, referral.consentMethod)
}

export function getSimpleNeedLabel(category: OpportunityCategory): string {
  return opportunityCategoryLabel(category)
}

export function isPartnerActive(partner: PartnerProfile): boolean {
  return partner.active
}

export function validCoverageInput(value: unknown): PartnerCoverage | null {
  return normalizePartnerCoverage(value)
}

export function containsSupportedNeed(needs: readonly OpportunityCategory[], category: OpportunityCategory): boolean {
  return needs.includes(category)
}

export function referralCanTransition(from: string, to: string): boolean {
  return canTransitionReferral(from, to)
}

export function isValidReferralStage(value: unknown): value is import("./types").ReferralStatus {
  return isReferralStatusValue(value)
}

export function partnerCategoriesForNeeds(needs: readonly OpportunityCategory[]): string[] {
  return needs.map(opportunityCategoryLabel)
}

export function isCoverageAreaValid(value: unknown): boolean {
  return isCoverageArea(value)
}

export function matchingReasonCount(match: PartnerMatch): number {
  return match.reasons.length
}

export function formatCoverage(coverage: PartnerCoverage): string {
  return simplifyCoverageText(coverage)
}

export function opportunityNeedsFromLeadQualification(value: unknown): OpportunityCategory[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  const record = value as Record<string, unknown>
  const text = [record.recommendation, record.summary, record.rationale].filter((item): item is string => typeof item === "string").join(" ").toLowerCase()
  return [ ...(text.includes("robot") ? ["robotics" as const] : []), ...(text.includes("charg") || text.includes("ev ") ? ["charging" as const] : []) ]
}

export function matchPartnerEligibility(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): boolean {
  return matchPartner(opportunity, partner, needs).matched
}

export function getPartnersForOpportunity(opportunity: MatchOpportunity, partners: readonly PartnerProfile[], needs: readonly OpportunityCategory[]): PartnerMatch[] {
  return matchPartnerCandidates(opportunity, partners, needs)
}

export function legalReferralTransitions(status: string): readonly string[] {
  return ALLOWED_TRANSITIONS[status] ?? []
}

export function stageUpdateIsValid(from: string, to: string): boolean {
  return canTransitionReferral(from, to)
}

export function hasCompleteConsent(referral: { consentObtainedAt: Date | null; consentObtainedByUserId: string | null; consentMethod: string | null }): boolean {
  return Boolean(referral.consentObtainedAt && referral.consentObtainedByUserId && referral.consentMethod)
}

export function sanitizedPartnerCoverage(value: unknown): PartnerCoverage | null {
  return normalizePartnerCoverage(value)
}

export function stripTag(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 60)
}

export function safeTagList(value: unknown): string[] | null {
  return cleanCapabilityTags(value)
}

export function referralStatusNeedsConsent(status: string): boolean {
  return referralNeedsConsent(status)
}

export function matchRequiresNeeds(needs: readonly OpportunityCategory[]): boolean {
  return needs.length > 0
}

export function isPartnerForCategory(partner: PartnerProfile, category: OpportunityCategory): boolean {
  return servesCategory(partner, category)
}

export function isReferralActionAllowed(role: string): boolean {
  return canUsePartnerWorkspace(role)
}

export function shouldAllowReferralSend(referral: { status: string; consentObtainedAt: Date | null; consentObtainedByUserId: string | null; consentMethod: string | null }): boolean {
  return canAdvanceToSent(referral.status, referral.consentObtainedAt, referral.consentObtainedByUserId, referral.consentMethod)
}

export function meaningfulNeeds(needs: readonly OpportunityCategory[]): OpportunityCategory[] {
  return [...new Set(needs)]
}

export function partnerMatchIsValid(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): boolean {
  return matchPartner(opportunity, partner, needs).matched
}

export function partnerTagSummary(partner: PartnerProfile): string {
  return partner.capabilities.join(", ")
}

export function safeOptionalText(value: unknown, maxLength: number): string | null {
  return cleanUserText(value, maxLength)
}

export function isReferralStageValid(value: unknown): value is import("./types").ReferralStatus {
  return isReferralStatusValue(value)
}

export function getReferralStatusLabel(status: string): string {
  return statusLabel(status)
}

export function supportsAllNeeds(partner: PartnerProfile, needs: readonly OpportunityCategory[]): boolean {
  return needs.length > 0 && needs.every((need) => servesCategory(partner, need))
}

export function locationCoverageMatch(coverage: PartnerCoverage, opportunity: MatchOpportunity): boolean {
  return territoryMatch(coverage, opportunity).ok
}

export function isWellFormedCoverage(value: unknown): boolean {
  return normalizePartnerCoverage(value) !== null
}

export function matchPartnerObject(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function validPartnerCategory(value: unknown): value is PartnerCategory {
  return isPartnerCategory(value)
}

export function partnerAreasMatch(coverage: PartnerCoverage, opportunity: MatchOpportunity): boolean {
  return areaMatchesCoverage(coverage, opportunity.city, opportunity.region)
}

export function isQualifiedOpportunityLead(stage: string | null): boolean {
  return stage === "qualified"
}

export function validateConsentAttestation(method: unknown, reference: unknown): { method: "email" | "phone" | "in_person" | "written" | "other"; reference: string | null } | null {
  if (!isValidConsentMethod(method)) return null
  return { method, reference: clampConsentReference(reference) }
}

export function safePartnerContact(value: unknown, limit: number): string | null {
  return cleanUserText(value, limit)
}

export function validateOpportunityNeedInput(value: unknown): OpportunityCategory[] | null {
  return normalizeOpportunityNeeds(value)
}

export function derivePartnerMatches(opportunity: MatchOpportunity, partners: readonly PartnerProfile[], needs: readonly OpportunityCategory[]): PartnerMatch[] {
  return matchPartnerCandidates(opportunity, partners, needs)
}

export function isPartnerStatus(value: unknown): value is "active" | "inactive" {
  return value === "active" || value === "inactive"
}

export function isReferralActionStatusTransition(status: string): boolean {
  return status in ALLOWED_TRANSITIONS
}

export function partnerCoverageCountry(coverage: PartnerCoverage): string | null {
  return coverage.country
}

export function opportunityCountry(opportunity: MatchOpportunity): string | null {
  return opportunity.country
}

export function consentMethodLabel(method: string): string {
  return method.replaceAll("_", " ")
}

export function sanitizeFreeText(value: unknown, maxLength: number): string | null {
  return cleanUserText(value, maxLength)
}

export function partnerMatchingSummary(opportunity: MatchOpportunity, needs: readonly OpportunityCategory[]): string {
  return `${opportunity.propertyName}: ${matchNeedsSummary(needs)}`
}

export function referralsCanAdvance(status: string): boolean {
  return !referralIsTerminal(status)
}

export function validReferralStatus(status: string): status is import("./types").ReferralStatus {
  return isReferralStatusValue(status)
}

export function buildMatchReasons(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function isConsentComplete(input: { date: Date | null; byUserId: string | null; method: string | null }): boolean {
  return Boolean(input.date && input.byUserId && input.method)
}

export function coverageAreas(coverage: PartnerCoverage): string[] {
  return coverage.areas
}

export function validLeadId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 80
}

export function createReferralSnapshot(opportunity: MatchOpportunity): { name: string; city: string | null; region: string | null; country: string | null } {
  return { name: opportunity.propertyName, city: opportunity.city, region: opportunity.region, country: opportunity.country }
}

export function clearUnknownCapabilities(value: unknown): string[] {
  return cleanCapabilityTags(value) ?? []
}

export function normalizeLeadStage(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

export function onlyPublicMatchFields(opportunity: MatchOpportunity): MatchOpportunity {
  return opportunity
}

export function markOpportunityQualified(score: number | null, leadStage: string | null): boolean {
  return shouldIncludeOpportunity(score, leadStage === "qualified")
}

export function sanitizePartnerLabel(value: unknown): string | null {
  return cleanUserText(value, 100)
}

export function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, "")
}

export function getReferralInitialStatus(): import("./types").ReferralStatus {
  return "draft"
}

export function hasSupportedCountryCoverage(coverage: PartnerCoverage): boolean {
  return Boolean(coverage.country)
}

export function isAreaCovered(coverage: PartnerCoverage, area: string): boolean {
  return coverage.areas.some((item) => normalize(item) === normalize(area))
}

export function verifyOpportunityForReferral(score: number | null, leadStage: string | null): boolean {
  return shouldIncludeOpportunity(score, leadStage === "qualified")
}

export function validatePartnerNameOrNull(value: unknown): string | null {
  return clampPartnerName(value)
}

export function dedupeCapabilities(values: readonly string[]): string[] {
  return uniqueText(values)
}

export function doesPartnerServeCountry(coverage: PartnerCoverage, country: string | null): boolean {
  return coverageCountryMatches(coverage, country)
}

export function partnerCategoryForNeed(category: OpportunityCategory): PartnerCategory {
  return category
}

export function partnerReferralsNeedConsent(status: string): boolean {
  return referralNeedsConsent(status)
}

export function ensureNeedArray(value: unknown): OpportunityCategory[] {
  return Array.isArray(value) ? value.filter(isOpportunityCategory) : []
}

export function isAnyReferralStatus(value: unknown): value is import("./types").ReferralStatus {
  return isReferralStatusValue(value)
}

export function requiresReferralConsent(status: string): boolean {
  return referralNeedsConsent(status)
}

export function isPartnerContactValid(input: { email: string | null }): boolean {
  return validPartnerEmail(input.email)
}

export function isMatchingOpportunityQualified(opportunity: MatchOpportunity, score: number | null, leadStage: string | null): boolean {
  return canReferOpportunity(opportunity, score, leadStage === "qualified")
}

export function matchReasonsIncludeCoverage(match: PartnerMatch): boolean {
  return match.reasons.some((reason) => reason.toLowerCase().includes("cover"))
}

export function partnerMatchesNeeds(partner: PartnerProfile, needs: readonly OpportunityCategory[]): boolean {
  return needs.length > 0 && needs.every((need) => servesCategory(partner, need))
}

export function validCapabilityInput(value: unknown): string[] | null {
  return cleanCapabilityTags(value)
}

export function sanitizeAreaInput(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const areas = value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
  return areas.length <= 30 && areas.every((area) => area.length <= 100) ? [...new Set(areas)] : null
}

export function isValidOrganizationScopedId(value: string, organizationId: string): boolean {
  return Boolean(value && organizationId)
}

export function getCoverageMismatch(opportunity: MatchOpportunity, coverage: PartnerCoverage): string | null {
  const result = territoryMatch(coverage, opportunity)
  return result.ok ? null : result.reason
}

export function matchPartnerForCategories(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function referralIsConsentGated(status: string): boolean {
  return referralNeedsConsent(status)
}

export function categoriesNeeded(opportunity: MatchOpportunity): OpportunityCategory[] {
  return toOpportunityCategories(opportunity.needs)
}

export function validateContactEmail(email: unknown): boolean {
  if (email == null || email === "") return true
  return typeof email === "string" && validPartnerEmail(email.trim())
}

export function locationIsComplete(opportunity: MatchOpportunity): boolean {
  return Boolean(opportunity.country && (opportunity.region || opportunity.city))
}

export function partnerMeetsLocation(partner: PartnerProfile, opportunity: MatchOpportunity): boolean {
  return territoryMatch(partner.coverage, opportunity).ok
}

export function canMarkReferralSent(status: string, consent: { at: Date | null; by: string | null; method: string | null }): boolean {
  return status === "under_review" && canSendReferral(consent.at, consent.by, consent.method)
}

export function validatePartnerUpdate(input: {
  name: unknown
  category: unknown
  capabilities: unknown
  coverage: unknown
}): { name: string; category: PartnerCategory; capabilities: string[]; coverage: PartnerCoverage } | null {
  return validatePartnerProfile(input)
}

export function selectedNeedLabels(needs: readonly OpportunityCategory[]): string[] {
  return needs.map(opportunityCategoryLabel)
}

export function isPartnerDataValid(input: {
  name: unknown
  category: unknown
  capabilities: unknown
  coverage: unknown
}): boolean {
  return validatePartnerProfile(input) !== null
}

export function filterActivePartners(partners: readonly PartnerProfile[]): PartnerProfile[] {
  return partners.filter((partner) => partner.active)
}

export function partnerNameForId(partners: readonly PartnerProfile[], id: string): string | null {
  return partners.find((partner) => partner.id === id)?.name ?? null
}

export function makeMatchOpportunity(row: MatchOpportunity): MatchOpportunity {
  return row
}

export function extractAssessmentNeeds(value: unknown): OpportunityCategory[] {
  return deriveOpportunityNeeds(value)
}

export function referralStatusIsAllowed(value: unknown): value is import("./types").ReferralStatus {
  return isReferralStatusValue(value)
}

export function routePartnerStatus(status: string): string {
  return statusLabel(status)
}

export function matchPartnerAgainstOpportunity(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function sanitizeMatchingNeeds(value: unknown): OpportunityCategory[] | null {
  return normalizeOpportunityNeeds(value)
}

export function opportunityMeetsQualification(score: number | null, qualifiedLead: boolean): boolean {
  return shouldIncludeOpportunity(score, qualifiedLead)
}

export function simplePartnerMatcher(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function isPartnerMatchingPossible(needs: readonly OpportunityCategory[]): boolean {
  return needs.length > 0
}

export function isReferralStatusTransitionAllowed(from: string, to: string): boolean {
  return canTransitionReferral(from, to)
}

export function extractCoverage(value: unknown): PartnerCoverage | null {
  return normalizePartnerCoverage(value)
}

export function safeContactEmail(value: unknown): string | null {
  const email = safeTrim(value, 320)
  return validPartnerEmail(email) ? email : null
}

export function safeContactPhone(value: unknown): string | null {
  return safeTrim(value, 40)
}

export function safeContactName(value: unknown): string | null {
  return safeTrim(value, 120)
}

export function isValidOpportunityCategory(value: unknown): value is OpportunityCategory {
  return isOpportunityCategory(value)
}

export function makePartnerCoverage(nationwide: boolean, country: string, areas: string[]): PartnerCoverage | null {
  return normalizePartnerCoverage({ nationwide, country, areas })
}

export function canTransitionToSent(from: string, consentAt: Date | null, consentBy: string | null, method: string | null): boolean {
  return from !== "under_review" || canSendReferral(consentAt, consentBy, method)
}

export function allowedNeeds(value: unknown): OpportunityCategory[] | null {
  return normalizeOpportunityNeeds(value)
}

export function referralConsentComplete(referral: { consentObtainedAt: Date | null; consentObtainedByUserId: string | null; consentMethod: string | null }): boolean {
  return hasCompleteConsent(referral)
}

export function validPartnerUpdateInput(input: {
  name: unknown
  category: unknown
  capabilities: unknown
  coverage: unknown
}): boolean {
  return validatePartnerProfile(input) !== null
}

export function hasCoverageForLocation(coverage: PartnerCoverage, city: string | null, region: string | null, country: string | null): boolean {
  return territoryMatch(coverage, { city, region, country } as MatchOpportunity).ok
}

export function matchPartnerForOpportunityCategories(opportunity: MatchOpportunity, partner: PartnerProfile, needs: readonly OpportunityCategory[]): PartnerMatch {
  return matchPartner(opportunity, partner, needs)
}

export function isValidPartnerId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 80
}

export function makeOpportunityNeeds(rob: boolean, charge: boolean): OpportunityCategory[] {
  return [ ...(rob ? ["robotics" as const] : []), ...(charge ? ["charging" as const] : []) ]
}

export function canCreateReferralDraft(match: PartnerMatch): boolean {
  return match.matched
}

export function validateCoverageAreaNames(value: unknown): string[] | null {
  if (typeof value === "string") {
    const areas = value.split(",").map((area) => area.trim()).filter(Boolean)
    return areas.length <= 30 && areas.every((area) => area.length <= 100) ? [...new Set(areas)] : null
  }
  return sanitizeAreaInput(value)
}

export function isOpportunityMatchable(score: number | null, stage: string | null): boolean {
  return shouldIncludeOpportunity(score, stage === "qualified")
}

export function isAllowedPartnerCategory(value: unknown): value is PartnerCategory {
  return isPartnerCategory(value)
}

export function partnerHasValidCategory(partner: PartnerProfile): boolean {
  return isPartnerCategory(partner.category)
}

export function normalizedPartnerCategoryLabel(category: PartnerCategory): string {
  return partnerCategoryLabel(category)
}

export function updateReferralTimestamps(status: string, now: Date, existing: { sentAt: Date | null; respondedAt: Date | null; closedAt: Date | null }) {
  return {
    sentAt: status === "sent" ? existing.sentAt ?? now : existing.sentAt,
    respondedAt: ["accepted", "declined"].includes(status) ? existing.respondedAt ?? now : existing.respondedAt,
    closedAt: ["won", "lost", "withdrawn"].includes(status) ? existing.closedAt ?? now : existing.closedAt,
  }
}
