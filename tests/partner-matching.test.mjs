import assert from "node:assert/strict"
import test from "node:test"
import {
  canAdvanceToSent,
  canSendReferral,
  canTransitionReferral,
  matchPartner,
} from "../lib/partner-matching/core.ts"

const opportunity = {
  propertyId: "property-1",
  leadId: "lead-1",
  propertyName: "Northstar Logistics",
  leadCompany: "Northstar",
  city: "Austin",
  region: "Texas",
  country: "US",
  needs: ["robotics"],
}

function partner(overrides = {}) {
  return {
    id: "partner-1",
    name: "Robotics Co",
    category: "robotics",
    capabilities: ["delivery robots"],
    coverage: { nationwide: false, country: "US", areas: ["Texas"] },
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    active: true,
    ...overrides,
  }
}

test("a partner matching category and region returns explainable reasons", () => {
  const result = matchPartner(opportunity, partner(), ["robotics"])
  assert.equal(result.matched, true)
  assert.deepEqual(result.unmet, [])
  assert.ok(result.reasons.some((reason) => reason.includes("robotics")))
  assert.ok(result.reasons.some((reason) => reason.includes("Texas")))
})

test("category, country, territory, and active status exclusions are explicit", () => {
  const mismatch = matchPartner(opportunity, partner({ category: "charging" }), ["robotics"])
  assert.equal(mismatch.matched, false)
  assert.ok(mismatch.unmet.some((criterion) => criterion.includes("Does not support")))

  const outsideCoverage = matchPartner(opportunity, partner({ coverage: { nationwide: false, country: "CA", areas: ["Ontario"] } }), ["robotics"])
  assert.equal(outsideCoverage.matched, false)
  assert.ok(outsideCoverage.unmet.some((criterion) => criterion.includes("Serves CA only")))

  const inactive = matchPartner(opportunity, partner({ active: false }), ["robotics"])
  assert.equal(inactive.matched, false)
  assert.ok(inactive.unmet.some((criterion) => criterion.includes("inactive")))
})

test("referral stages cannot be sent before a complete owner-consent attestation", () => {
  assert.equal(canSendReferral(null, null, null), false)
  assert.equal(canAdvanceToSent("under_review", null, null, null), false)
  assert.equal(canAdvanceToSent("under_review", new Date("2026-01-01T12:00:00.000Z"), "staff-1", "email"), true)
  assert.equal(canTransitionReferral("draft", "under_review"), true)
  assert.equal(canTransitionReferral("draft", "sent"), false)
  assert.equal(canTransitionReferral("won", "in_progress"), false)
})

