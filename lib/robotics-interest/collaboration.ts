import type { RoboticsCollaborationStatus } from '@/lib/db/schema'

export const ROBOTICS_COLLABORATION_TRANSITIONS: Record<RoboticsCollaborationStatus, readonly RoboticsCollaborationStatus[]> = {
  consent_pending: ['selected', 'owner_declined', 'withdrawn'],
  selected: ['shared', 'withdrawn'],
  shared: ['source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'closed', 'withdrawn'],
  source_response: ['fit_confirmed', 'fit_rejected', 'pilot_planning', 'closed', 'withdrawn'],
  fit_confirmed: ['pilot_planning', 'closed', 'withdrawn'],
  fit_rejected: ['closed', 'withdrawn'],
  pilot_planning: ['pilot_in_progress', 'closed', 'withdrawn'],
  pilot_in_progress: ['pilot_completed', 'deployment_planning', 'closed', 'withdrawn'],
  pilot_completed: ['deployment_planning', 'closed'],
  deployment_planning: ['deployment_in_progress', 'closed'],
  deployment_in_progress: ['deployment_completed', 'closed'],
  deployment_completed: ['closed'],
  closed: [],
  owner_declined: ['closed'],
  withdrawn: ['closed'],
}

export function canTransitionRoboticsCollaboration(
  current: RoboticsCollaborationStatus,
  next: RoboticsCollaborationStatus,
  ownerConsentApproved: boolean,
  hasSharedSnapshot: boolean,
): boolean {
  if (!ROBOTICS_COLLABORATION_TRANSITIONS[current].includes(next)) return false
  if (['selected', 'shared', 'source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'pilot_in_progress', 'pilot_completed', 'deployment_planning', 'deployment_in_progress', 'deployment_completed', 'closed'].includes(next)
    && current === 'consent_pending' && !ownerConsentApproved) return false
  if (['source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'pilot_in_progress', 'pilot_completed', 'deployment_planning', 'deployment_in_progress', 'deployment_completed'].includes(next)
    && !hasSharedSnapshot) return false
  return true
}

export const ROBOTICS_SHARE_FIELDS = [
  'property.name',
  'property.city_region_country',
  'interest.use_case',
  'interest.tasks',
  'interest.environment',
  'interest.operating_conditions',
  'interest.safety_requirements',
  'interest.integration_needs',
  'interest.service_needs',
  'interest.budget_range',
  'interest.target_timeline',
  'assessment.robo_ready_score',
  'assessment.robotics_evidence',
  'robot.model_name_category',
  'offering.channel_availability',
] as const

export const ROBOTICS_EXCLUDED_SHARE_FIELDS = [
  'Owner name, email, and phone number',
  'Street address and access instructions',
  'Internal notes and preliminary partner rankings',
  'Non-robotics assessment domains and raw assessment report',
] as const

export type RoboticsShareField = (typeof ROBOTICS_SHARE_FIELDS)[number]

export function createRoboticsConsentScope(input: {
  partnerName: string
  modelName: string
  includedFields?: readonly RoboticsShareField[]
  overrideBasis?: 'partner_unable' | 'owner_requested' | null
  overrideReason?: string | null
}) {
  const includedFields = [...new Set(input.includedFields ?? ROBOTICS_SHARE_FIELDS)]
  return {
    providerName: input.partnerName,
    modelName: input.modelName,
    includedFields,
    excludedFields: [...ROBOTICS_EXCLUDED_SHARE_FIELDS],
    overrideBasis: input.overrideBasis ?? null,
    overrideReason: input.overrideReason?.trim().slice(0, 500) || null,
  }
}

export function getNextRoboticsCollaborationStatuses(status: RoboticsCollaborationStatus): readonly RoboticsCollaborationStatus[] {
  return ROBOTICS_COLLABORATION_TRANSITIONS[status]
}

export function isRoboticsCollaborationStatus(value: unknown): value is RoboticsCollaborationStatus {
  return typeof value === 'string' && Object.hasOwn(ROBOTICS_COLLABORATION_TRANSITIONS, value)
}
