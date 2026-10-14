import type { RoboticsMatchCandidate, RoboticsMatchOffer, RoboticsSharedSnapshot, RoboticsSourceType } from "@/lib/db/schema"

export type RoboticsCapabilityFact = {
  id: string
  capabilityKey: string
  capabilityValue: string | null
  verificationStatus: string
  evidenceUrl: string | null
  lastVerifiedAt: string | null
}

export type RoboticsCatalogOffer = {
  id: string
  partnerId: string
  sourceType: RoboticsSourceType
  sourceUrl: string | null
  availability: string
  verificationStatus: string
  lastVerifiedAt: string | null
  priceCents: number | null
  priceCurrency: string | null
  priceBasis: string | null
  partner: {
    id: string
    name: string
    active: boolean
    category: string
    capabilities: string[]
    coverage: { nationwide: boolean; country: string | null; areas: string[] }
    roboticsSourceStatus: string
    roboticsSourcePriority: number
  }
}

export type RoboticsCatalogModel = {
  id: string
  name: string
  category: string
  productUrl: string | null
  commercialStatus: string
  verificationStatus: string
  lastVerifiedAt: string | null
  manufacturer: { name: string; verificationStatus: string; lastVerifiedAt: string | null }
  capabilities: RoboticsCapabilityFact[]
  offers: RoboticsCatalogOffer[]
}

export type RoboticsInterestRequirements = {
  property: {
    id: string
    name: string
    city: string | null
    region: string | null
    country: string | null
  }
  useCase: string
  tasks: string[]
  environment: { location: string; access: string; operatingHours: string }
  operatingConditions: string | null
  safetyRequirements: string | null
  integrationNeeds: string | null
  serviceNeeds: string | null
  budgetRange: string | null
  targetTimeline: string | null
}

export type RoboticsAssessmentEvidence = Array<{
  keyPointId: string
  points: number
  explanation: string
  evidence: string[]
  confidence: string
}>

const USE_CASE_TO_CAPABILITY: Record<string, string> = {
  last_mile_delivery: "package_delivery",
  food_and_beverage: "food_delivery",
  material_movement: "inventory",
  cleaning_maintenance: "cleaning",
  security_patrol: "security_patrol",
  site_inspection: "inspection",
  guest_assistance: "guest_support",
}

const TASK_LABELS: Record<string, string> = {
  package_delivery: "Packages and supplies",
  food_delivery: "Food and beverage",
  linen_or_waste: "Linen, waste, or carts",
  cleaning: "Cleaning rounds",
  security_patrol: "Security patrols",
  inspection: "Inspection and monitoring",
  guest_support: "Guest or visitor support",
  inventory: "Inventory movement",
}

const MAX_EVIDENCE_AGE_MS = 365 * 24 * 60 * 60 * 1000

function normalizeCapabilityKey(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "")
}

function requirementsFor(input: RoboticsInterestRequirements): Array<{ key: string; label: string }> {
  const requested = new Set<string>()
  const fromUseCase = USE_CASE_TO_CAPABILITY[input.useCase]
  if (fromUseCase) requested.add(fromUseCase)
  for (const rawTask of input.tasks) {
    const task = rawTask.startsWith("other:") ? rawTask.slice("other:".length) : rawTask
    requested.add(normalizeCapabilityKey(task))
  }

  const requirements = [...requested].filter(Boolean).map((key) => ({ key, label: TASK_LABELS[key] ?? key.replaceAll("_", " ") }))
  if (input.environment.location === "indoor" || input.environment.location === "mixed") {
    requirements.push({ key: "environment_indoor", label: "indoor operation" })
  }
  if (input.environment.location === "outdoor" || input.environment.location === "mixed") {
    requirements.push({ key: "environment_outdoor", label: "outdoor operation" })
  }
  if (input.environment.access === "public" || input.environment.access === "mixed") {
    requirements.push({ key: "access_public", label: "public-area operation" })
  }
  if (input.environment.access === "restricted" || input.environment.access === "mixed") {
    requirements.push({ key: "access_restricted", label: "restricted-area operation" })
  }
  if (input.operatingConditions?.trim()) requirements.push({ key: "site_conditions_reviewed", label: "reviewed site-condition fit" })
  if (input.safetyRequirements?.trim()) requirements.push({ key: "safety_reviewed", label: "reviewed safety requirements" })
  if (input.integrationNeeds?.trim()) requirements.push({ key: "integration_reviewed", label: "reviewed integration needs" })
  if (input.serviceNeeds?.trim()) requirements.push({ key: "service_supported", label: "service and support fit" })
  return [...new Map(requirements.map((item) => [item.key, item])).values()]
}

function dateIsCurrent(value: string | null, now: Date): boolean {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) && timestamp <= now.getTime() && now.getTime() - timestamp <= MAX_EVIDENCE_AGE_MS
}

function budgetCeilingCents(value: string | null): number | null {
  if (!value) return null
  if (value.startsWith("Under $25,000")) return 2_500_000
  if (value.startsWith("$25,000–$75,000")) return 7_500_000
  if (value.startsWith("$75,000–$150,000")) return 15_000_000
  if (value.startsWith("$150,000+")) return null
  return null
}

function assessmentEvidence(value: unknown): RoboticsAssessmentEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  const keyPoints = (value as Record<string, unknown>).keyPoints
  if (!Array.isArray(keyPoints)) return []
  return keyPoints.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return []
    const item = entry as Record<string, unknown>
    if (typeof item.keyPointId !== "string" || !item.keyPointId.startsWith("rob-") || typeof item.points !== "number") return []
    return [{
      keyPointId: item.keyPointId,
      points: item.points,
      explanation: typeof item.explanation === "string" ? item.explanation.slice(0, 500) : "",
      evidence: Array.isArray(item.evidence) ? item.evidence.filter((e): e is string => typeof e === "string").slice(0, 5) : [],
      confidence: typeof item.confidence === "string" ? item.confidence : "unknown",
    }]
  })
}

function matchOneOffer(
  model: RoboticsCatalogModel,
  offer: RoboticsCatalogOffer,
  requirements: Array<{ key: string; label: string }>,
  input: RoboticsInterestRequirements,
  now: Date,
): RoboticsMatchOffer {
  const matchReasons: string[] = []
  const unmetRequirements: string[] = []
  const unknownEvidence: string[] = []
  const partner = offer.partner

  if (!partner.active) unmetRequirements.push("The source is inactive.")
  if (partner.category !== "robotics" && partner.category !== "both") unmetRequirements.push("The source is not designated for robotics.")
  if (partner.roboticsSourceStatus !== "full_partner" && partner.roboticsSourceStatus !== "participating") {
    unmetRequirements.push("The source is not currently an eligible robotics participant.")
  }
  if (!dateIsCurrent(model.lastVerifiedAt, now) || model.verificationStatus !== "verified") {
    unmetRequirements.push("The robot model is not currently verified.")
  }
  if (!dateIsCurrent(model.manufacturer.lastVerifiedAt, now) || model.manufacturer.verificationStatus !== "verified") {
    unmetRequirements.push("The manufacturer record is not currently verified.")
  }
  if (!dateIsCurrent(offer.lastVerifiedAt, now) || offer.verificationStatus !== "verified") {
    unmetRequirements.push("The source offering is not currently verified.")
  }
  if (!["commercial", "pilot"].includes(model.commercialStatus)) {
    unmetRequirements.push(`Commercial status is ${model.commercialStatus}; a current commercial or pilot status is required.`)
  }
  if (!["available", "pilot"].includes(offer.availability)) {
    unmetRequirements.push(`Availability is ${offer.availability}; only verified available or pilot offerings pass the initial gate.`)
  }

  const facts = new Map<string, RoboticsCapabilityFact[]>()
  for (const fact of model.capabilities) {
    const key = normalizeCapabilityKey(fact.capabilityKey)
    facts.set(key, [...(facts.get(key) ?? []), fact])
  }
  for (const requirement of requirements) {
    const evidence = facts.get(requirement.key) ?? []
    const verified = evidence.find((fact) => fact.verificationStatus === "verified" && Boolean(fact.evidenceUrl) && dateIsCurrent(fact.lastVerifiedAt, now))
    if (verified) {
      matchReasons.push(`Verified capability evidence covers ${requirement.label}.`)
      continue
    }
    const staleOrUnverified = evidence.length > 0
    const reason = staleOrUnverified
      ? `The ${requirement.label} evidence is unverified or older than 12 months.`
      : `No curated capability evidence covers ${requirement.label}.`
    unmetRequirements.push(reason)
    unknownEvidence.push(reason)
  }

  const coverage = partner.coverage
  const locationKnown = Boolean(input.property.country && (input.property.city || input.property.region))
  if (!locationKnown) {
    unmetRequirements.push("Property location is incomplete, so source coverage cannot be verified.")
  } else {
    const countryMatches = !coverage.country || coverage.country.trim().toLocaleLowerCase() === input.property.country?.trim().toLocaleLowerCase()
    const areaNames = coverage.areas.map((area) => normalizeCapabilityKey(area))
    const propertyAreas = [input.property.city, input.property.region].filter((value): value is string => Boolean(value)).map(normalizeCapabilityKey)
    const territoryMatches = countryMatches && (coverage.nationwide || propertyAreas.some((area) => areaNames.includes(area)))
    if (territoryMatches) matchReasons.push(coverage.nationwide ? `Nationwide service coverage in ${coverage.country}.` : "Service coverage includes the property area.")
    else unmetRequirements.push("The source has no verified service coverage for the property location.")
  }

  if (input.budgetRange) {
    const ceiling = budgetCeilingCents(input.budgetRange)
    if (offer.priceCents === null || offer.priceCurrency !== "USD" || offer.priceBasis !== "one_time" || offer.verificationStatus !== "verified" || !dateIsCurrent(offer.lastVerifiedAt, now)) {
      const reason = "Verified one-time USD pricing is unavailable, so the stated budget cannot be checked."
      unmetRequirements.push(reason)
      unknownEvidence.push(reason)
    } else if (ceiling !== null && offer.priceCents > ceiling) {
      unmetRequirements.push("The verified one-time price exceeds the customer's stated budget range.")
    } else {
      matchReasons.push("Verified one-time USD pricing is within the stated budget range.")
    }
  } else if (offer.priceCents === null || offer.priceCurrency === null) {
    unknownEvidence.push("Pricing is unknown; no price or currency was inferred.")
  }

  if (offer.availability === "pilot") matchReasons.push("The source has a verified pilot offering; deployment availability still needs confirmation.")
  if (partner.roboticsSourceStatus === "full_partner") matchReasons.push("Full-partner priority applies only after the fit and evidence gates pass.")
  else if (partner.roboticsSourceStatus === "participating") matchReasons.push("Participating-source priority applies only after the fit and evidence gates pass.")
  if (!dateIsCurrent(offer.lastVerifiedAt, now)) unknownEvidence.push("Offering evidence is missing or older than 12 months.")

  const partnershipStatus = partner.roboticsSourceStatus === "full_partner"
    ? "full_partner"
    : partner.roboticsSourceStatus === "participating"
      ? "participating"
      : partner.roboticsSourceStatus === "paused"
        ? "paused"
        : "unverified"

  return {
    offeringId: offer.id,
    partnerId: partner.id,
    partnerName: partner.name,
    sourceType: offer.sourceType,
    partnershipStatus,
    sourcePriority: partner.roboticsSourcePriority,
    availability: offer.availability,
    sourceUrl: offer.sourceUrl,
    lastVerifiedAt: offer.lastVerifiedAt,
    matchReasons: [...new Set(matchReasons)],
    unmetRequirements: [...new Set(unmetRequirements)],
    unknownEvidence: [...new Set(unknownEvidence)],
  }
}

function offerOrder(left: RoboticsMatchOffer, right: RoboticsMatchOffer): number {
  const tier = (status: RoboticsMatchOffer["partnershipStatus"]) =>
    status === "full_partner" ? 0 : status === "participating" ? 1 : status === "paused" ? 2 : 3
  return tier(left.partnershipStatus) - tier(right.partnershipStatus)
    || left.sourcePriority - right.sourcePriority
    || left.partnerName.localeCompare(right.partnerName)
    || left.offeringId.localeCompare(right.offeringId)
}

export function rankRoboticsCatalog(input: {
  requirements: RoboticsInterestRequirements
  models: RoboticsCatalogModel[]
  assessment: unknown
  now?: Date
}): { outcome: "verified_fit" | "follow_up_required" | "no_verified_fit"; candidates: RoboticsMatchCandidate[]; summary: string; generatedAt: string } {
  const now = input.now ?? new Date()
  const requirements = requirementsFor(input.requirements)
  const evidence = assessmentEvidence(input.assessment)
  const candidateResults = input.models.map((model) => {
    const bySourceChannel = new Map<string, RoboticsMatchOffer>()
    for (const offer of model.offers) {
      const matched = matchOneOffer(model, offer, requirements, input.requirements, now)
      const key = `${matched.partnerId}:${matched.sourceType}`
      const current = bySourceChannel.get(key)
      const currentEvidenceDate = current?.lastVerifiedAt ? new Date(current.lastVerifiedAt).getTime() : 0
      const candidateEvidenceDate = matched.lastVerifiedAt ? new Date(matched.lastVerifiedAt).getTime() : 0
      if (!current
        || matched.unmetRequirements.length < current.unmetRequirements.length
        || (matched.unmetRequirements.length === current.unmetRequirements.length && candidateEvidenceDate > currentEvidenceDate)
        || (matched.unmetRequirements.length === current.unmetRequirements.length && candidateEvidenceDate === currentEvidenceDate && matched.offeringId.localeCompare(current.offeringId) < 0)) {
        bySourceChannel.set(key, matched)
      }
    }
    const offers = [...bySourceChannel.values()].sort(offerOrder)
    const eligibleOffers = offers.filter((offer) => offer.unmetRequirements.length === 0)
    const bestOffer = eligibleOffers[0] ?? offers[0]
    const unmatchedOffers = offers.filter((offer) => offer.unmetRequirements.length > 0)
    const modelUnmet = [...new Set(unmatchedOffers.flatMap((offer) => offer.unmetRequirements))]
    const coveredCount = requirements.filter((required) => model.capabilities.some((fact) => normalizeCapabilityKey(fact.capabilityKey) === required.key && fact.verificationStatus === "verified" && Boolean(fact.evidenceUrl) && dateIsCurrent(fact.lastVerifiedAt, now))).length
    const fitScore = requirements.length === 0 ? 0 : Math.round((coveredCount / requirements.length) * 100)
    return {
      candidate: {
        modelId: model.id,
        manufacturerName: model.manufacturer.name,
        modelName: model.name,
        category: model.category,
        eligible: eligibleOffers.length > 0,
        fitScore,
        matchReasons: [...new Set((bestOffer?.matchReasons ?? []).concat(evidence.length ? [`Includes ${evidence.length} robotics-specific assessment finding${evidence.length === 1 ? "" : "s"} for Admin review.`] : []))],
        unmetRequirements: modelUnmet,
        unknownEvidence: [...new Set(offers.flatMap((offer) => offer.unknownEvidence))],
        roboticsAssessmentEvidence: evidence,
        offers,
      } satisfies RoboticsMatchCandidate,
      bestOffer,
    }
  })
  candidateResults.sort((left, right) => {
    const leftOffer = left.candidate.offers.find((offer) => offer.unmetRequirements.length === 0) ?? left.bestOffer
    const rightOffer = right.candidate.offers.find((offer) => offer.unmetRequirements.length === 0) ?? right.bestOffer
    return Number(right.candidate.eligible) - Number(left.candidate.eligible)
      || (leftOffer && rightOffer ? offerOrder(leftOffer, rightOffer) : leftOffer ? -1 : rightOffer ? 1 : 0)
      || right.candidate.fitScore - left.candidate.fitScore
      || left.candidate.modelName.localeCompare(right.candidate.modelName)
  })

  const candidates = candidateResults.map((item) => item.candidate).slice(0, 30)
  const eligibleCount = candidates.filter((candidate) => candidate.eligible).length
  const outcome = eligibleCount > 0 ? "verified_fit" : candidates.length > 0 ? "follow_up_required" : "no_verified_fit"
  const summary = eligibleCount > 0
    ? `${eligibleCount} robot model${eligibleCount === 1 ? "" : "s"} passed the documented capability, source, availability, location, and budget gates.`
    : candidates.length > 0
      ? "No verified fit passed every gate. The listed models are follow-up leads only; resolve the evidence gaps before presenting a match."
      : "No catalog candidates are available for this request. Add verified model, capability, and source-offering records before recommending a fit."

  return { outcome, candidates, summary, generatedAt: now.toISOString() }
}
