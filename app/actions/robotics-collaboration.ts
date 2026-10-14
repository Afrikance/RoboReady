'use server'

import { and, desc, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  partnerReferral,
  roboticsManufacturer,
  property,
  roboticsInterest,
  roboticsModel,
  roboticsRecommendationRun,
  roboticsSourceCollaboration,
  roboticsSourceCollaborationEvent,
  roboticsSourceOffering,
  solutionPartner,
  type RoboticsCollaborationStatus,
  type RoboticsConsentScope,
  type RoboticsSharedSnapshot,
} from '@/lib/db/schema'
import { isAdminRole, isClient } from '@/lib/access'
import { getAuthorizedProperty, getOrgContext, recordAudit } from '@/lib/tenancy'
import { createRoboticsConsentScope, canTransitionRoboticsCollaboration, isRoboticsCollaborationStatus } from '@/lib/robotics-interest/collaboration'
import { createRoboticsRecommendationRun } from '@/lib/robotics-interest/recommendation-data'

const formResult = (error: string) => ({ ok: false as const, error })
type ActionResult = { ok: true; id: string } | { ok: false; error: string }

async function adminContext() {
  const context = await getOrgContext()
  return context && isAdminRole(context.role) ? context : null
}

function refreshCollaborationViews(propertyId: string) {
  revalidatePath('/dashboard/robotics-interest')
  revalidatePath(`/dashboard/properties/${propertyId}/robotics-interest`)
  revalidatePath(`/dashboard/properties/${propertyId}`)
}

export async function createRoboticsSourceCollaboration(input: unknown): Promise<ActionResult> {
  const context = await adminContext()
  if (!context) return formResult('You do not have permission to select a source for collaboration.')
  const parsed = z.object({
    interestId: z.string().min(1).max(100),
    modelId: z.string().min(1).max(100),
    offeringId: z.string().min(1).max(100),
    overrideBasis: z.enum(['partner_unable', 'owner_requested']).nullable().optional().default(null),
    overrideReason: z.string().trim().max(500).optional().default(''),
  }).safeParse(input)
  if (!parsed.success) return formResult(parsed.error.issues[0]?.message ?? 'Choose a valid candidate and source.')

  const [interest] = await db.select().from(roboticsInterest).where(and(
    eq(roboticsInterest.id, parsed.data.interestId),
    eq(roboticsInterest.organizationId, context.organizationId),
  )).limit(1)
  if (!interest || interest.status === 'closed') return formResult('Open robotics-interest request not found.')
  const [propertyRow] = await db.select().from(property).where(and(
    eq(property.id, interest.propertyId),
    eq(property.organizationId, context.organizationId),
  )).limit(1)
  if (!propertyRow) return formResult('Property not found in this organization.')

  const [partnerReferralRows, offeringRow] = await Promise.all([
    db.select({ partnerId: partnerReferral.partnerId, name: solutionPartner.name, category: solutionPartner.category, active: solutionPartner.active })
      .from(partnerReferral)
      .innerJoin(solutionPartner, and(
        eq(solutionPartner.id, partnerReferral.partnerId),
        eq(solutionPartner.organizationId, context.organizationId),
      ))
      .where(and(
        eq(partnerReferral.organizationId, context.organizationId),
        eq(partnerReferral.propertyId, propertyRow.id),
        inArray(partnerReferral.status, ['accepted', 'in_progress', 'won']),
      )),
    db.select().from(roboticsSourceOffering).where(and(
      eq(roboticsSourceOffering.id, parsed.data.offeringId),
      eq(roboticsSourceOffering.organizationId, context.organizationId),
      eq(roboticsSourceOffering.modelId, parsed.data.modelId),
    )).limit(1),
  ])
  const [offering] = offeringRow
  if (!offering) return formResult('Source offering not found for this model in this organization.')
  const [partner, model] = await Promise.all([
    db.select().from(solutionPartner).where(and(
      eq(solutionPartner.id, offering.partnerId),
      eq(solutionPartner.organizationId, context.organizationId),
      eq(solutionPartner.active, true),
    )).limit(1).then((rows) => rows[0]),
    db.select().from(roboticsModel).where(and(
      eq(roboticsModel.id, parsed.data.modelId),
      eq(roboticsModel.organizationId, context.organizationId),
    )).limit(1).then((rows) => rows[0]),
  ])
  if (!partner || !['robotics', 'both'].includes(partner.category) || !['full_partner', 'participating'].includes(partner.roboticsSourceStatus)) {
    return formResult('Only active, participating robotics sources may be selected.')
  }
  if (!model) return formResult('Robot or cobot model not found in this organization.')

  const applicablePartnerships = partnerReferralRows.filter((row) => row.active && ['robotics', 'both'].includes(row.category))
  const existingPartnerIds = new Set(applicablePartnerships.map((row) => row.partnerId))
  const needsOverride = existingPartnerIds.size > 0 && !existingPartnerIds.has(partner.id)
  const overrideReason = parsed.data.overrideReason.trim()
  if (needsOverride && (!parsed.data.overrideBasis || overrideReason.length < 12)) {
    const names = applicablePartnerships.map((row) => row.name).filter(Boolean).join(', ')
    return formResult(`An active robotics partnership already exists${names ? ` with ${names}` : ''}. Select whether the partner cannot meet the documented need or the owner requested an alternative, and record the reason.`)
  }

  const activeCollaborationStatuses: RoboticsCollaborationStatus[] = ['consent_pending', 'selected', 'shared', 'source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'pilot_in_progress', 'pilot_completed', 'deployment_planning', 'deployment_in_progress', 'deployment_completed']
  const [existingCollaboration] = await db.select({ id: roboticsSourceCollaboration.id }).from(roboticsSourceCollaboration).where(and(
    eq(roboticsSourceCollaboration.organizationId, context.organizationId),
    eq(roboticsSourceCollaboration.interestId, interest.id),
    eq(roboticsSourceCollaboration.offeringId, offering.id),
    inArray(roboticsSourceCollaboration.status, activeCollaborationStatuses),
  )).limit(1)
  if (existingCollaboration) return formResult('This source already has an active collaboration for the request. Update its timeline instead of duplicating it.')

  const recommendation = await createRoboticsRecommendationRun({
    organizationId: context.organizationId,
    interestId: interest.id,
    createdByUserId: context.user.id,
    reason: 'Source selection fit revalidation',
  })
  if (!recommendation) return formResult('A completed property assessment and an open request are required.')
  const candidate = recommendation.results.candidates.find((item) => item.modelId === model.id && item.eligible)
  const selectedOffer = candidate?.offers.find((item) => item.offeringId === offering.id && item.unmetRequirements.length === 0)
  if (!candidate || !selectedOffer) return formResult('This model and offering no longer pass all current fit and evidence gates. Review the refreshed results first.')

  const consentScope = createRoboticsConsentScope({
    partnerName: partner.name,
    modelName: model.name,
    overrideBasis: needsOverride ? parsed.data.overrideBasis : null,
    overrideReason: needsOverride ? overrideReason : null,
  })
  const id = crypto.randomUUID()
  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.insert(roboticsSourceCollaboration).values({
      id,
      organizationId: context.organizationId,
      interestId: interest.id,
      recommendationRunId: recommendation.id,
      assessmentId: recommendation.assessmentId,
      modelId: model.id,
      offeringId: offering.id,
      partnerId: partner.id,
      status: 'consent_pending',
      consentScope,
      selectedByAdminUserId: context.user.id,
      overrideBasis: needsOverride ? parsed.data.overrideBasis : null,
      overrideReason: needsOverride ? overrideReason : null,
      createdAt: now,
      updatedAt: now,
    })
    await tx.insert(roboticsSourceCollaborationEvent).values({
      id: crypto.randomUUID(),
      organizationId: context.organizationId,
      collaborationId: id,
      eventType: 'consent_requested',
      actorType: 'admin',
      actorUserId: context.user.id,
      note: needsOverride ? `Alternative source proposed: ${overrideReason}` : 'Source selected for owner review; no information has been shared.',
      detail: { partnerId: partner.id, modelId: model.id, offeringId: offering.id, recommendationRunId: recommendation.id },
      createdAt: now,
    })
  })
  await recordAudit({ organizationId: context.organizationId, userId: context.user.id, action: 'robotics_collaboration.consent_requested', entityType: 'robotics_source_collaboration', entityId: id, metadata: { interestId: interest.id, partnerId: partner.id, modelId: model.id, offeringId: offering.id, overrideBasis: needsOverride ? parsed.data.overrideBasis : null } })
  refreshCollaborationViews(propertyRow.id)
  return { ok: true, id }
}

export async function getCustomerRoboticsCollaborationRequests(propertyId: string) {
  const context = await getOrgContext()
  if (!context || !isClient(context.role) || typeof propertyId !== 'string' || !propertyId.trim() || propertyId.length > 100) return []
  const propertyRow = await getAuthorizedProperty(context, propertyId, 'read')
  if (!propertyRow) return []
  const rows = await db.select({ collaboration: roboticsSourceCollaboration })
    .from(roboticsSourceCollaboration)
    .innerJoin(roboticsInterest, and(
      eq(roboticsInterest.id, roboticsSourceCollaboration.interestId),
      eq(roboticsInterest.organizationId, context.organizationId),
    ))
    .where(and(
      eq(roboticsSourceCollaboration.organizationId, context.organizationId),
      eq(roboticsInterest.propertyId, propertyRow.id),
      eq(roboticsInterest.createdByUserId, context.user.id),
    ))
    .orderBy(desc(roboticsSourceCollaboration.createdAt))
  return rows.map(({ collaboration }) => ({
    id: collaboration.id,
    status: collaboration.status,
    scope: collaboration.consentScope,
    overrideReason: collaboration.overrideReason,
    ownerConsentDecision: collaboration.ownerConsentDecision,
    createdAt: collaboration.createdAt.toISOString(),
    ownerConsentAt: collaboration.ownerConsentAt?.toISOString() ?? null,
    sharedAt: collaboration.sharedAt?.toISOString() ?? null,
  }))
}

export async function respondToRoboticsCollaborationConsent(input: unknown): Promise<ActionResult> {
  const context = await getOrgContext()
  if (!context || !isClient(context.role)) return formResult('Only the property owner can approve or decline source sharing.')
  const parsed = z.object({ collaborationId: z.string().min(1).max(100), decision: z.enum(['approved', 'declined']) }).safeParse(input)
  if (!parsed.success) return formResult('Choose a valid consent decision.')

  const [row] = await db.select({ collaboration: roboticsSourceCollaboration, interest: roboticsInterest })
    .from(roboticsSourceCollaboration)
    .innerJoin(roboticsInterest, and(
      eq(roboticsInterest.id, roboticsSourceCollaboration.interestId),
      eq(roboticsInterest.organizationId, context.organizationId),
    ))
    .where(and(
      eq(roboticsSourceCollaboration.id, parsed.data.collaborationId),
      eq(roboticsSourceCollaboration.organizationId, context.organizationId),
      eq(roboticsInterest.createdByUserId, context.user.id),
    )).limit(1)
  if (!row) return formResult('Sharing request not found.')
  const propertyRow = await getAuthorizedProperty(context, row.interest.propertyId, 'read')
  if (!propertyRow || row.collaboration.status !== 'consent_pending') return formResult('This sharing request is no longer awaiting your decision.')

  const nextStatus: RoboticsCollaborationStatus = parsed.data.decision === 'approved' ? 'selected' : 'owner_declined'
  const now = new Date()
  const updated = await db.transaction(async (tx) => {
    const changed = await tx.update(roboticsSourceCollaboration).set({
      status: nextStatus,
      ownerConsentAt: now,
      ownerConsentByUserId: context.user.id,
      ownerConsentDecision: parsed.data.decision,
      ownerConsentMethod: 'owner_portal',
      updatedAt: now,
    }).where(and(
      eq(roboticsSourceCollaboration.id, row.collaboration.id),
      eq(roboticsSourceCollaboration.organizationId, context.organizationId),
      eq(roboticsSourceCollaboration.status, 'consent_pending'),
    )).returning({ id: roboticsSourceCollaboration.id })
    if (!changed.length) return false
    await tx.insert(roboticsSourceCollaborationEvent).values({
      id: crypto.randomUUID(),
      organizationId: context.organizationId,
      collaborationId: row.collaboration.id,
      eventType: parsed.data.decision === 'approved' ? 'owner_consent_approved' : 'owner_consent_declined',
      actorType: 'owner',
      actorUserId: context.user.id,
      note: parsed.data.decision === 'approved' ? 'Owner approved the specific minimum-data sharing scope.' : 'Owner declined this source-sharing request.',
      detail: { decision: parsed.data.decision },
      createdAt: now,
    })
    return true
  })
  if (!updated) return formResult('This sharing request was already updated.')
  await recordAudit({ organizationId: context.organizationId, userId: context.user.id, action: `robotics_collaboration.owner_${parsed.data.decision}`, entityType: 'robotics_source_collaboration', entityId: row.collaboration.id, metadata: { partnerName: row.collaboration.consentScope.providerName, modelName: row.collaboration.consentScope.modelName } })
  refreshCollaborationViews(propertyRow.id)
  return { ok: true, id: row.collaboration.id }
}

function buildSharedSnapshot(input: {
  scope: RoboticsConsentScope
  interestSnapshot: Record<string, unknown>
  assessmentSnapshot: Record<string, unknown>
  candidate: { manufacturerName: string; modelName: string; category: string; roboticsAssessmentEvidence: Array<Record<string, unknown>> } | undefined
  model: typeof roboticsModel.$inferSelect
  manufacturerName: string
  offering: typeof roboticsSourceOffering.$inferSelect
  propertyName: string
  propertyCity: string | null
  propertyRegion: string | null
  propertyCountry: string | null
}): RoboticsSharedSnapshot {
  const allowed = new Set(input.scope.includedFields)
  const interest = input.interestSnapshot
  const propertySnapshot = interest.property as Record<string, unknown> | undefined
  const requirements: Record<string, unknown> = {}
  const mapping: Array<[string, string]> = [
    ['interest.use_case', 'useCase'],
    ['interest.tasks', 'tasks'],
    ['interest.environment', 'environment'],
    ['interest.operating_conditions', 'operatingConditions'],
    ['interest.safety_requirements', 'safetyRequirements'],
    ['interest.integration_needs', 'integrationNeeds'],
    ['interest.service_needs', 'serviceNeeds'],
    ['interest.budget_range', 'budgetRange'],
    ['interest.target_timeline', 'targetTimeline'],
  ]
  for (const [scopeField, key] of mapping) if (allowed.has(scopeField) && interest[key] != null) requirements[key] = interest[key]
  const assessment: Record<string, unknown> = {}
  if (allowed.has('assessment.robo_ready_score') && input.assessmentSnapshot.roboReadyScore != null) assessment.roboReadyScore = input.assessmentSnapshot.roboReadyScore
  if (allowed.has('assessment.robotics_evidence')) assessment.roboticsEvidence = input.candidate?.roboticsAssessmentEvidence ?? []
  return {
    property: {
      name: allowed.has('property.name') ? input.propertyName : '',
      city: allowed.has('property.city_region_country') ? input.propertyCity : null,
      region: allowed.has('property.city_region_country') ? input.propertyRegion : null,
      country: allowed.has('property.city_region_country') ? input.propertyCountry : null,
    },
    requirements,
    assessment,
    model: {
      manufacturerName: input.manufacturerName,
      modelName: input.model.name,
      category: input.model.category,
      productUrl: input.model.productUrl,
    },
    offering: {
      sourceName: input.scope.providerName,
      sourceType: input.offering.sourceType,
      availability: input.offering.availability,
      sourceUrl: input.offering.sourceUrl,
    },
    preparedAt: new Date().toISOString(),
  }
}

export async function updateRoboticsSourceCollaboration(input: unknown): Promise<ActionResult> {
  const context = await adminContext()
  if (!context) return formResult('You do not have permission to manage source collaboration.')
  const parsed = z.object({
    collaborationId: z.string().min(1).max(100),
    status: z.custom<RoboticsCollaborationStatus>(isRoboticsCollaborationStatus),
    note: z.string().trim().max(2000).optional().default(''),
  }).safeParse(input)
  if (!parsed.success) return formResult('Choose a valid collaboration update.')

  const [row] = await db.select({ collaboration: roboticsSourceCollaboration, interest: roboticsInterest, run: roboticsRecommendationRun, property: property })
    .from(roboticsSourceCollaboration)
    .innerJoin(roboticsInterest, and(eq(roboticsInterest.id, roboticsSourceCollaboration.interestId), eq(roboticsInterest.organizationId, context.organizationId)))
    .innerJoin(roboticsRecommendationRun, and(eq(roboticsRecommendationRun.id, roboticsSourceCollaboration.recommendationRunId), eq(roboticsRecommendationRun.organizationId, context.organizationId)))
    .innerJoin(property, and(eq(property.id, roboticsInterest.propertyId), eq(property.organizationId, context.organizationId)))
    .where(and(eq(roboticsSourceCollaboration.id, parsed.data.collaborationId), eq(roboticsSourceCollaboration.organizationId, context.organizationId)))
    .limit(1)
  if (!row) return formResult('Source collaboration not found in this organization.')
  const collaboration = row.collaboration
  const nextStatus = parsed.data.status
  const approved = collaboration.ownerConsentDecision === 'approved' && collaboration.ownerConsentAt !== null && collaboration.ownerConsentByUserId !== null
  const hasSnapshot = collaboration.sharedSnapshot !== null
  if (!canTransitionRoboticsCollaboration(collaboration.status, nextStatus, approved, hasSnapshot)) return formResult('That collaboration transition is not allowed. Confirm owner consent and prior sharing milestones first.')
  if (nextStatus === 'source_response' && parsed.data.note.length < 3) return formResult('Record the source response before saving this milestone.')

  let sharedSnapshot = collaboration.sharedSnapshot as RoboticsSharedSnapshot | null
  let sharingRun: Awaited<ReturnType<typeof createRoboticsRecommendationRun>> = null
  if (nextStatus === 'shared') {
    if (!approved) return formResult('The property owner must approve this specific sharing scope before data is shared.')
    sharingRun = await createRoboticsRecommendationRun({
      organizationId: context.organizationId,
      interestId: collaboration.interestId,
      createdByUserId: context.user.id,
      reason: 'Pre-share fit and evidence revalidation',
    })
    if (!sharingRun) return formResult('A completed property assessment and an open request are required before sharing.')
    const candidate = sharingRun.results.candidates.find((item) => item.modelId === collaboration.modelId)
    const [model, offering, activePartnerships] = await Promise.all([
      db.select().from(roboticsModel).where(and(eq(roboticsModel.id, collaboration.modelId), eq(roboticsModel.organizationId, context.organizationId))).limit(1).then((rows) => rows[0]),
      db.select().from(roboticsSourceOffering).where(and(eq(roboticsSourceOffering.id, collaboration.offeringId), eq(roboticsSourceOffering.organizationId, context.organizationId), eq(roboticsSourceOffering.partnerId, collaboration.partnerId))).limit(1).then((rows) => rows[0]),
      db.select({ partnerId: partnerReferral.partnerId, category: solutionPartner.category, active: solutionPartner.active })
        .from(partnerReferral)
        .innerJoin(solutionPartner, and(eq(solutionPartner.id, partnerReferral.partnerId), eq(solutionPartner.organizationId, context.organizationId)))
        .where(and(
          eq(partnerReferral.organizationId, context.organizationId),
          eq(partnerReferral.propertyId, row.property.id),
          inArray(partnerReferral.status, ['accepted', 'in_progress', 'won']),
        )),
    ])
    const manufacturer = model
      ? (await db.select({ name: roboticsManufacturer.name }).from(roboticsManufacturer).where(and(eq(roboticsManufacturer.id, model.manufacturerId), eq(roboticsManufacturer.organizationId, context.organizationId))).limit(1))[0]
      : undefined
    const activeRoboticsPartnerships = activePartnerships.filter((item) => item.active && ['robotics', 'both'].includes(item.category))
    const existingPartnerIds = new Set(activeRoboticsPartnerships.map((item) => item.partnerId))
    const needsAlternativeReason = existingPartnerIds.size > 0 && !existingPartnerIds.has(collaboration.partnerId)
    if (needsAlternativeReason && (!collaboration.overrideBasis || !collaboration.overrideReason || collaboration.overrideReason.trim().length < 12)) {
      return formResult('An active robotics partnership now covers this request. Record why it cannot meet the documented need or confirm that the owner requested an alternative before sharing.')
    }
    if (!model || !offering || !manufacturer || !candidate?.eligible || !candidate.offers.some((offer) => offer.offeringId === offering.id && offer.unmetRequirements.length === 0)) {
      return formResult('The selected model/source no longer passes the current fit and evidence gates. Refresh and review before sharing.')
    }
    sharedSnapshot = buildSharedSnapshot({
      scope: collaboration.consentScope,
      interestSnapshot: sharingRun.interestSnapshot,
      assessmentSnapshot: sharingRun.assessmentSnapshot,
      candidate,
      model,
      manufacturerName: manufacturer.name,
      offering,
      propertyName: row.property.name,
      propertyCity: row.property.city,
      propertyRegion: row.property.region,
      propertyCountry: row.property.country,
    })
  }

  const now = new Date()
  await db.transaction(async (tx) => {
    const updated = await tx.update(roboticsSourceCollaboration).set({
      status: nextStatus,
      ...(nextStatus === 'shared' && sharingRun ? {
        recommendationRunId: sharingRun.id,
        assessmentId: sharingRun.assessmentId,
        sharedAt: now,
        sharedByUserId: context.user.id,
        shareMethod: 'manual_admin',
        sharedSnapshot,
      } : {}),
      updatedAt: now,
    }).where(and(
      eq(roboticsSourceCollaboration.id, collaboration.id),
      eq(roboticsSourceCollaboration.organizationId, context.organizationId),
      eq(roboticsSourceCollaboration.status, collaboration.status),
    )).returning({ id: roboticsSourceCollaboration.id })
    if (!updated.length) throw new Error('Collaboration changed concurrently.')
    await tx.insert(roboticsSourceCollaborationEvent).values({
      id: crypto.randomUUID(),
      organizationId: context.organizationId,
      collaborationId: collaboration.id,
      eventType: nextStatus,
      actorType: 'admin',
      actorUserId: context.user.id,
      note: parsed.data.note || (nextStatus === 'shared' ? 'Minimum approved information snapshot recorded for a deliberate manual outreach step.' : `Collaboration moved to ${nextStatus.replaceAll('_', ' ')}.`),
      detail: {
        from: collaboration.status,
        to: nextStatus,
        ...(nextStatus === 'shared' ? {
          shareMethod: 'manual_admin',
          recommendationRunId: sharingRun?.id,
          assessmentId: sharingRun?.assessmentId,
          assessmentVersion: sharingRun?.assessmentVersion,
        } : {}),
      },
      createdAt: now,
    })
  })
  await recordAudit({ organizationId: context.organizationId, userId: context.user.id, action: `robotics_collaboration.${nextStatus}`, entityType: 'robotics_source_collaboration', entityId: collaboration.id, metadata: { interestId: collaboration.interestId, partnerId: collaboration.partnerId, modelId: collaboration.modelId, status: nextStatus, ...(nextStatus === 'shared' ? { recommendationRunId: sharingRun?.id, assessmentId: sharingRun?.assessmentId } : {}) } })
  refreshCollaborationViews(row.property.id)
  return { ok: true, id: collaboration.id }
}

export async function getRoboticsCollaborationAdminData(interestId: string) {
  const context = await adminContext()
  if (!context || typeof interestId !== 'string' || !interestId.trim() || interestId.length > 100) return null
  const collaborations = await db.select().from(roboticsSourceCollaboration).where(and(
    eq(roboticsSourceCollaboration.organizationId, context.organizationId),
    eq(roboticsSourceCollaboration.interestId, interestId),
  )).orderBy(desc(roboticsSourceCollaboration.createdAt))
  const collaborationIds = collaborations.map((item) => item.id)
  const events = collaborationIds.length
    ? await db.select().from(roboticsSourceCollaborationEvent).where(and(
      eq(roboticsSourceCollaborationEvent.organizationId, context.organizationId),
      inArray(roboticsSourceCollaborationEvent.collaborationId, collaborationIds),
    )).orderBy(desc(roboticsSourceCollaborationEvent.createdAt))
    : []
  const partnerIds = [...new Set(collaborations.map((item) => item.partnerId))]
  const partners = partnerIds.length
    ? await db.select({ id: solutionPartner.id, name: solutionPartner.name }).from(solutionPartner).where(and(
      eq(solutionPartner.organizationId, context.organizationId),
      inArray(solutionPartner.id, partnerIds),
    ))
    : []
  return {
    collaborations: collaborations.map((item) => ({
      ...item,
      events: events.filter((event) => event.collaborationId === item.id),
      partnerName: partners.find((partner) => partner.id === item.partnerId)?.name ?? item.consentScope.providerName,
    })),
  }
}
