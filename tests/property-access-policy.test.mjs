import assert from "node:assert/strict"
import test from "node:test"
import { canAccessProperty, meetsRoleRequirement } from "../lib/property-access-policy.ts"

test("clients are limited to their own property, including report and billing access", () => {
  for (const purpose of ["property", "read", "intake", "documents", "report", "billing"]) {
    assert.equal(canAccessProperty({ role: "client", purpose, isOwner: true, isAssigned: false }), true)
    assert.equal(canAccessProperty({ role: "client", purpose, isOwner: false, isAssigned: false }), false)
  }
  assert.equal(canAccessProperty({ role: "client", purpose: "operations", isOwner: true, isAssigned: false }), false)
})

test("field staff require an assignment and are limited to intake and documents", () => {
  for (const role of ["operator", "vendor", "contractor"]) {
    assert.equal(canAccessProperty({ role, purpose: "intake", isOwner: false, isAssigned: true }), true)
    assert.equal(canAccessProperty({ role, purpose: "documents", isOwner: false, isAssigned: true }), true)
    assert.equal(canAccessProperty({ role, purpose: "report", isOwner: false, isAssigned: true }), false)
    assert.equal(canAccessProperty({ role, purpose: "read", isOwner: false, isAssigned: false }), false)
  }
})

test("staff role hierarchy does not treat field roles as full members", () => {
  assert.equal(meetsRoleRequirement("operator", "member"), false)
  assert.equal(meetsRoleRequirement("client", "member"), false)
  assert.equal(meetsRoleRequirement("member", "member"), true)
  assert.equal(meetsRoleRequirement("owner", "admin"), true)
})
