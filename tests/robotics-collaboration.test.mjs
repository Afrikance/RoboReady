import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canTransitionRoboticsCollaboration,
  createRoboticsConsentScope,
  ROBOTICS_EXCLUDED_SHARE_FIELDS,
  ROBOTICS_SHARE_FIELDS,
} from '../lib/robotics-interest/collaboration.ts'

test('collaboration cannot move past consent or to a source-facing stage without the required gate', () => {
  assert.equal(canTransitionRoboticsCollaboration('consent_pending', 'selected', false, false), false)
  assert.equal(canTransitionRoboticsCollaboration('consent_pending', 'selected', true, false), true)
  assert.equal(canTransitionRoboticsCollaboration('selected', 'shared', true, false), true)
  assert.equal(canTransitionRoboticsCollaboration('shared', 'source_response', true, false), false)
  assert.equal(canTransitionRoboticsCollaboration('shared', 'source_response', true, true), true)
  assert.equal(canTransitionRoboticsCollaboration('deployment_completed', 'pilot_in_progress', true, true), false)
})

test('consent scope is explicit, minimal, and excludes direct owner contact data', () => {
  const scope = createRoboticsConsentScope({ partnerName: 'Northstar', modelName: 'Courier One' })
  assert.equal(scope.providerName, 'Northstar')
  assert.equal(scope.modelName, 'Courier One')
  assert.deepEqual(scope.includedFields, [...ROBOTICS_SHARE_FIELDS])
  assert.ok(scope.excludedFields.includes('Owner name, email, and phone number'))
  assert.ok(scope.excludedFields.includes('Street address and access instructions'))
  assert.equal(scope.overrideReason, null)
  assert.equal(ROBOTICS_EXCLUDED_SHARE_FIELDS.length > 0, true)
})
