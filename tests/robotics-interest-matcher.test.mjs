import assert from "node:assert/strict"
import test from "node:test"
import { rankRoboticsCatalog } from "../lib/robotics-interest/matcher.ts"

const now = new Date("2026-10-13T12:00:00.000Z")
const recent = "2026-09-01T00:00:00.000Z"

function requirementInput(overrides = {}) {
  return {
    requirements: {
      property: { id: "property-1", name: "North Hotel", city: "Austin", region: "Texas", country: "US" },
      useCase: "last_mile_delivery",
      tasks: ["package_delivery"],
      environment: { location: "indoor", access: "restricted", operatingHours: "24/7" },
      operatingConditions: null,
      safetyRequirements: null,
      integrationNeeds: null,
      serviceNeeds: null,
      budgetRange: null,
      targetTimeline: "Within 6 months",
    },
    models: [model()],
    assessment: { keyPoints: [{ keyPointId: "rob-access", points: 2, evidence: ["Assessment evidence"], confidence: "high" }] },
    now,
    ...overrides,
  }
}

function model(overrides = {}) {
  return {
    id: "model-1",
    name: "Courier One",
    category: "delivery",
    productUrl: "https://example.com/robot",
    commercialStatus: "commercial",
    verificationStatus: "verified",
    lastVerifiedAt: recent,
    manufacturer: { name: "Example Robotics", verificationStatus: "verified", lastVerifiedAt: recent },
    capabilities: ["package_delivery", "environment_indoor", "access_restricted"].map((capabilityKey, index) => ({
      id: `cap-${index}`,
      capabilityKey,
      capabilityValue: "Supported",
      verificationStatus: "verified",
      evidenceUrl: `https://example.com/evidence/${capabilityKey}`,
      lastVerifiedAt: recent,
    })),
    offers: [offer()],
    ...overrides,
  }
}

function offer(overrides = {}) {
  return {
    id: "offer-1",
    partnerId: "partner-1",
    sourceType: "integrator",
    sourceUrl: "https://example.com/offer",
    availability: "available",
    verificationStatus: "verified",
    lastVerifiedAt: recent,
    priceCents: null,
    priceCurrency: null,
    priceBasis: null,
    partner: {
      id: "partner-1",
      name: "Austin Robotics",
      active: true,
      category: "robotics",
      capabilities: [],
      coverage: { nationwide: false, country: "US", areas: ["Austin"] },
      roboticsSourceStatus: "participating",
      roboticsSourcePriority: 100,
    },
    ...overrides,
  }
}

test("a catalog match passes only when current evidence covers requirements and an eligible source", () => {
  const result = rankRoboticsCatalog(requirementInput())
  assert.equal(result.outcome, "verified_fit")
  assert.equal(result.candidates[0].eligible, true)
  assert.equal(result.candidates[0].fitScore, 100)
  assert.deepEqual(result.candidates[0].unmetRequirements, [])
  assert.ok(result.candidates[0].roboticsAssessmentEvidence.some((item) => item.keyPointId === "rob-access"))
})

test("missing, stale, or unverified capability evidence blocks a verified fit", () => {
  const base = model()
  const missing = rankRoboticsCatalog(requirementInput({
    models: [{ ...base, capabilities: base.capabilities.filter((item) => item.capabilityKey !== "access_restricted") }],
  }))
  assert.equal(missing.candidates[0].eligible, false)
  assert.ok(missing.candidates[0].unmetRequirements.some((reason) => reason.includes("restricted-area")))

  const stale = rankRoboticsCatalog(requirementInput({
    models: [{ ...base, capabilities: base.capabilities.map((item) => item.capabilityKey === "access_restricted" ? { ...item, lastVerifiedAt: "2024-01-01T00:00:00.000Z" } : item) }],
  }))
  assert.equal(stale.candidates[0].eligible, false)
  assert.ok(stale.candidates[0].unknownEvidence.some((reason) => reason.includes("12 months")))
})

test("an inactive, unverified, unavailable, or out-of-coverage source cannot qualify a model", () => {
  for (const sourceOverride of [
    { active: false },
    { roboticsSourceStatus: "unverified" },
    { coverage: { nationwide: false, country: "US", areas: ["Dallas"] } },
  ]) {
    const result = rankRoboticsCatalog(requirementInput({ models: [model({ offers: [offer({ partner: { ...offer().partner, ...sourceOverride } })] })] }))
    assert.equal(result.candidates[0].eligible, false)
  }

  const unavailable = rankRoboticsCatalog(requirementInput({ models: [model({ offers: [offer({ availability: "waitlist" })] })] }))
  assert.equal(unavailable.candidates[0].eligible, false)
})

test("multiple supply channels stay attached to one model and full partners rank first", () => {
  const participating = offer({
    id: "offer-participating",
    partnerId: "partner-participating",
    sourceType: "rental",
    partner: { ...offer().partner, id: "partner-participating", name: "Rental Source", roboticsSourcePriority: 1 },
  })
  const fullPartner = offer({
    id: "offer-full-partner",
    partnerId: "partner-full",
    sourceType: "manufacturer",
    partner: { ...offer().partner, id: "partner-full", name: "Full Partner", roboticsSourceStatus: "full_partner", roboticsSourcePriority: 100 },
  })
  const result = rankRoboticsCatalog(requirementInput({ models: [model({ offers: [participating, fullPartner] })] }))
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].offers.length, 2)
  assert.equal(result.candidates[0].offers[0].partnerName, "Full Partner")
  assert.equal(result.candidates[0].offers[0].partnershipStatus, "full_partner")
})

test("Admin priority orders sources within a partnership tier, and explanations remain deterministic", () => {
  const later = offer({
    id: "offer-later",
    partnerId: "partner-later",
    partner: { ...offer().partner, id: "partner-later", name: "Later Source", roboticsSourcePriority: 50 },
  })
  const preferred = offer({
    id: "offer-preferred",
    partnerId: "partner-preferred",
    partner: { ...offer().partner, id: "partner-preferred", name: "Preferred Source", roboticsSourcePriority: 5 },
  })
  const input = requirementInput({ models: [model({ offers: [later, preferred] })] })
  const first = rankRoboticsCatalog(input)
  const second = rankRoboticsCatalog(input)
  assert.equal(first.candidates[0].offers[0].partnerName, "Preferred Source")
  assert.deepEqual(first.candidates[0].offers, second.candidates[0].offers)
  assert.match(first.candidates[0].offers[0].matchReasons.join(" "), /priority applies only after the fit and evidence gates pass/)
})

test("no eligible catalog evidence produces follow-up or no-fit results, never an invented match", () => {
  const followUp = rankRoboticsCatalog(requirementInput({
    models: [model({ verificationStatus: "unverified" })],
  }))
  assert.equal(followUp.outcome, "follow_up_required")
  assert.equal(followUp.candidates[0].eligible, false)

  const empty = rankRoboticsCatalog(requirementInput({ models: [] }))
  assert.equal(empty.outcome, "no_verified_fit")
  assert.deepEqual(empty.candidates, [])
})

 test("a verified price above the customer's budget blocks the source", () => {
  const result = rankRoboticsCatalog(requirementInput({
    requirements: { ...requirementInput().requirements, budgetRange: "Under $25,000" },
    models: [model({ offers: [offer({ priceCents: 3_000_000, priceCurrency: "USD", priceBasis: "one_time" })] })],
  }))
  assert.equal(result.candidates[0].eligible, false)
  assert.ok(result.candidates[0].unmetRequirements.some((reason) => reason.includes("exceeds")))
})
