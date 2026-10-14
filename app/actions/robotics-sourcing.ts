'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  roboticsInterest,
  roboticsManufacturer,
  roboticsModel,
  roboticsModelCapability,
  roboticsSourceOffering,
  solutionPartner,
} from '@/lib/db/schema'
import { isAdminRole } from '@/lib/access'
import { getOrgContext, recordAudit } from '@/lib/tenancy'
import { createRoboticsRecommendationRun, getCurrentRoboticsRecommendationRun, listRoboticsRecommendationHistory } from '@/lib/robotics-interest/recommendation-data'

const sourceTypes = ['manufacturer', 'distributor', 'retailer', 'rental', 'raas', 'integrator'] as const
const verificationStatuses = ['verified', 'unverified', 'unknown'] as const
const commercialStatuses = ['commercial', 'pilot', 'preorder', 'prototype', 'retired', 'unknown'] as const
const availabilityStatuses = ['available', 'pilot', 'preorder', 'waitlist', 'unavailable', 'unknown'] as const
const priceBases = ['one_time', 'monthly', 'annual', 'quote'] as const

type Result = { ok: true; id: string } | { ok: false; error: string }

async function getAdminContext() {
  const context = await getOrgContext()
  return context && isAdminRole(context.role) ? context : null
}

function httpsUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}

function invalid(message: string): Result {
  return { ok: false, error: message }
}

function refreshSourcing() {
  revalidatePath('/dashboard/robotics-interest')
  revalidatePath('/dashboard/robotics-interest/catalog')
  revalidatePath('/dashboard/partners')
}

export async function saveRoboticsManufacturer(input: unknown): Promise<Result> {
  const context = await getAdminContext()
  if (!context) return invalid('You do not have permission to manage the robotics catalog.')
  const parsed = z.object({
    id: z.string().max(100).optional(),
    name: z.string().trim().min(2).max(120),
    websiteUrl: z.string().trim().max(2048).optional().default(''),
    country: z.string().trim().max(80).optional().default(''),
    verificationStatus: z.enum(verificationStatuses),
  }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Check the manufacturer details.')
  const websiteUrl = httpsUrl(parsed.data.websiteUrl)
  if (parsed.data.websiteUrl && !websiteUrl) return invalid('Enter a valid HTTPS manufacturer source URL.')
  if (parsed.data.verificationStatus === 'verified' && !websiteUrl) return invalid('Add a manufacturer source URL before verifying this record.')

  const existing = parsed.data.id
    ? (await db.select().from(roboticsManufacturer).where(and(eq(roboticsManufacturer.id, parsed.data.id), eq(roboticsManufacturer.organizationId, context.organizationId))).limit(1))[0]
    : undefined
  if (parsed.data.id && !existing) return invalid('Manufacturer not found in this organization.')
  const id = existing?.id ?? crypto.randomUUID()
  const now = new Date()
  const values = {
    name: parsed.data.name,
    websiteUrl,
    country: parsed.data.country || null,
    verificationStatus: parsed.data.verificationStatus,
    lastVerifiedAt: parsed.data.verificationStatus === 'verified' ? now : null,
    updatedAt: now,
  }
  if (existing) {
    await db.update(roboticsManufacturer).set(values).where(and(eq(roboticsManufacturer.id, id), eq(roboticsManufacturer.organizationId, context.organizationId)))
  } else {
    await db.insert(roboticsManufacturer).values({ id, organizationId: context.organizationId, createdByUserId: context.user.id, ...values, createdAt: now })
  }
  await recordAudit({ organizationId: context.organizationId, userId: context.user.id, action: existing ? 'robotics_manufacturer.updated' : 'robotics_manufacturer.created', entityType: 'robotics_manufacturer', entityId: id, metadata: { verificationStatus: values.verificationStatus } })
  refreshSourcing()
  return { ok: true, id }
}

export async function saveRoboticsModel(input: unknown): Promise<Result> {
  const context = await getAdminContext()
  if (!context) return invalid('You do not have permission to manage the robotics catalog.')
  const parsed = z.object({
    id: z.string().max(100).optional(),
    manufacturerId: z.string().min(1).max(100),
    name: z.string().trim().min(2).max(120),
    category: z.string().trim().min(2).max(80),
    description: z.string().trim().max(2400).optional().default(''),
    productUrl: z.string().trim().max(2048).optional().default(''),
    commercialStatus: z.enum(commercialStatuses),
    verificationStatus: z.enum(verificationStatuses),
  }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Check the robot or cobot model details.')
  const productUrl = httpsUrl(parsed.data.productUrl)
  if (parsed.data.productUrl && !productUrl) return invalid('Enter a valid HTTPS product source URL.')
  if (parsed.data.verificationStatus === 'verified' && !productUrl) return invalid('Add a product source URL before verifying this model.')
  const [manufacturer] = await db.select({ id: roboticsManufacturer.id }).from(roboticsManufacturer).where(and(eq(roboticsManufacturer.id, parsed.data.manufacturerId), eq(roboticsManufacturer.organizationId, context.organizationId))).limit(1)
  if (!manufacturer) return invalid('Choose a manufacturer from this organization.')
  const existing = parsed.data.id
    ? (await db.select({ id: roboticsModel.id }).from(roboticsModel).where(and(eq(roboticsModel.id, parsed.data.id), eq(roboticsModel.organizationId, context.organizationId))).limit(1))[0]
    : undefined
  if (parsed.data.id && !existing) return invalid('Robot or cobot model not found in this organization.')
  const id = existing?.id ?? crypto.randomUUID()
  const now = new Date()
  const values = {
    manufacturerId: manufacturer.id,
    name: parsed.data.name,
    category: parsed.data.category,
    description: parsed.data.description || null,
    productUrl,
    commercialStatus: parsed.data.commercialStatus,
    verificationStatus: parsed.data.verificationStatus,
    lastVerifiedAt: parsed.data.verificationStatus === 'verified' ? now : null,
    updatedAt: now,
  }
  if (existing) {
    await db.update(roboticsModel).set(values).where(and(eq(roboticsModel.id, id), eq(roboticsModel.organizationId, context.organizationId)))
  } else {
    await db.insert(roboticsModel).values({ id, organizationId: context.organizationId, createdByUserId: context.user.id, ...values, createdAt: now })
  }
  await recordAudit({ organizationId: context.organizationId, userId: context.user.id, action: existing ? 'robotics_model.updated' : 'robotics_model.created', entityType: 'robotics_model', entityId: id, metadata: { manufacturerId: manufacturer.id, verificationStatus: values.verificationStatus, commercialStatus: values.commercialStatus } })
  refreshSourcing()
  return { ok: true, id }
}

export async function saveRoboticsCapability(input: unknown): Promise<Result> {
  const context = await getAdminContext()
  if (!context) return invalid('You do not have permission to manage the robotics catalog.')
  const parsed = z.object({
    id: z.string().max(100).optional(),
    modelId: z.string().min(1).max(100),
    capabilityKey: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
    capabilityValue: z.string().trim().max(240).optional().default(''),
    evidenceUrl: z.string().trim().max(2048).optional().default(''),
    evidenceTitle: z.string().trim().max(160).optional().default(''),
    verificationStatus: z.enum(verificationStatuses),
    confidence: z.number().int().min(0).max(100).nullable().optional(),
  }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Check the capability details.')
  const evidenceUrl = httpsUrl(parsed.data.evidenceUrl)
  if (parsed.data.evidenceUrl && !evidenceUrl) return invalid('Capability evidence must use a valid HTTPS URL.')
  if (parsed.data.verificationStatus === 'verified' && !evidenceUrl) return invalid('Add a source URL before verifying this capability.')
  const [model] = await db.select({ id: roboticsModel.id }).from(roboticsModel).where(and(eq(roboticsModel.id, parsed.data.modelId), eq(roboticsModel.organizationId, context.organizationId))).limit(1)
  if (!model) return invalid('Choose a model from this organization.')
  const existing = parsed.data.id
    ? (await db.select({ id: roboticsModelCapability.id }).from(roboticsModelCapability).where(and(eq(roboticsModelCapability.id, parsed.data.id), eq(roboticsModelCapability.organizationId, context.organizationId))).limit(1))[0]
    : undefined
  if (parsed.data.id && !existing) return invalid('Capability record not found in this organization.')
  const id = existing?.id ?? crypto.randomUUID()
  const now = new Date()
  const values = {
    modelId: model.id,
    capabilityKey: parsed.data.capabilityKey,
    capabilityValue: parsed.data.capabilityValue || null,
    evidenceUrl,
    evidenceTitle: parsed.data.evidenceTitle || null,
    verificationStatus: parsed.data.verificationStatus,
    confidence: parsed.data.confidence ?? null,
    lastVerifiedAt: parsed.data.verificationStatus === 'verified' ? now : null,
    updatedAt: now,
  }
  if (existing) {
    await db.update(roboticsModelCapability).set(values).where(and(eq(roboticsModelCapability.id, id), eq(roboticsModelCapability.organizationId, context.organizationId)))
  } else {
    await db.insert(roboticsModelCapability).values({ id, organizationId: context.organizationId, createdByUserId: context.user.id, ...values, createdAt: now })
  }
  await recordAudit({ organizationId: context.organizationId, userId: context.user.id, action: existing ? 'robotics_capability.updated' : 'robotics_capability.created', entityType: 'robotics_model_capability', entityId: id, metadata: { modelId: model.id, capabilityKey: values.capabilityKey, verificationStatus: values.verificationStatus } })
  refreshSourcing()
  return { ok: true, id }
}

export async function saveRoboticsOffering(input: unknown): Promise<Result> {
  const context = await getAdminContext()
  if (!context) return invalid('You do not have permission to manage robotics sources.')
  const parsed = z.object({
    id: z.string().max(100).optional(),
    partnerId: z.string().min(1).max(100),
    modelId: z.string().min(1).max(100),
    sourceType: z.enum(sourceTypes),
    sourceUrl: z.string().trim().max(2048).optional().default(''),
    availability: z.enum(availabilityStatuses),
    priceCents: z.number().int().nonnegative().nullable(),
    priceCurrency: z.string().trim().regex(/^[A-Z]{3}$/).nullable(),
    priceBasis: z.enum(priceBases).nullable(),
    pricingEvidenceUrl: z.string().trim().max(2048).optional().default(''),
    verificationStatus: z.enum(verificationStatuses),
  }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Check the source offering details.')
  const sourceUrl = httpsUrl(parsed.data.sourceUrl)
  const pricingEvidenceUrl = httpsUrl(parsed.data.pricingEvidenceUrl)
  if (parsed.data.sourceUrl && !sourceUrl) return invalid('Offering source must be a valid HTTPS URL.')
  if (parsed.data.pricingEvidenceUrl && !pricingEvidenceUrl) return invalid('Pricing evidence must be a valid HTTPS URL.')
  if (parsed.data.verificationStatus === 'verified' && (!sourceUrl || !['available', 'pilot'].includes(parsed.data.availability))) {
    return invalid('A verified offering needs a source URL and a current available or pilot status.')
  }
  if (parsed.data.priceCents !== null && (!parsed.data.priceCurrency || !parsed.data.priceBasis)) return invalid('Price, currency, and price basis must be recorded together.')
  if (parsed.data.priceCents !== null && !pricingEvidenceUrl && parsed.data.verificationStatus === 'verified') return invalid('Add pricing evidence before verifying a quoted price.')
  const [[partner], [model]] = await Promise.all([
    db.select({ id: solutionPartner.id, category: solutionPartner.category }).from(solutionPartner).where(and(eq(solutionPartner.id, parsed.data.partnerId), eq(solutionPartner.organizationId, context.organizationId))).limit(1),
    db.select({ id: roboticsModel.id }).from(roboticsModel).where(and(eq(roboticsModel.id, parsed.data.modelId), eq(roboticsModel.organizationId, context.organizationId))).limit(1),
  ])
  if (!partner || !['robotics', 'both'].includes(partner.category)) return invalid('Choose an organization robotics source.')
  if (!model) return invalid('Choose a model from this organization.')
  const existing = parsed.data.id
    ? (await db.select({ id: roboticsSourceOffering.id }).from(roboticsSourceOffering).where(and(eq(roboticsSourceOffering.id, parsed.data.id), eq(roboticsSourceOffering.organizationId, context.organizationId))).limit(1))[0]
    : undefined
  if (parsed.data.id && !existing) return invalid('Source offering not found in this organization.')
  const id = existing?.id ?? crypto.randomUUID()
  const now = new Date()
  const values = {
    partnerId: partner.id,
    modelId: model.id,
    sourceType: parsed.data.sourceType,
    sourceUrl,
    availability: parsed.data.availability,
    priceCents: parsed.data.priceCents,
    priceCurrency: parsed.data.priceCurrency,
    priceBasis: parsed.data.priceBasis,
    pricingEvidenceUrl,
    verificationStatus: parsed.data.verificationStatus,
    lastVerifiedAt: parsed.data.verificationStatus === 'verified' ? now : null,
    updatedAt: now,
  }
  if (existing) {
    await db.update(roboticsSourceOffering).set(values).where(and(eq(roboticsSourceOffering.id, id), eq(roboticsSourceOffering.organizationId, context.organizationId)))
  } else {
    await db.insert(roboticsSourceOffering).values({ id, organizationId: context.organizationId, createdByUserId: context.user.id, ...values, createdAt: now })
  }
  await recordAudit({ organizationId: context.organizationId, userId: context.user.id, action: existing ? 'robotics_source_offering.updated' : 'robotics_source_offering.created', entityType: 'robotics_source_offering', entityId: id, metadata: { partnerId: partner.id, modelId: model.id, sourceType: values.sourceType, verificationStatus: values.verificationStatus } })
  refreshSourcing()
  return { ok: true, id }
}

export async function updateRoboticsSourcePriority(input: unknown): Promise<Result> {
  const context = await getAdminContext()
  if (!context) return invalid('You do not have permission to manage robotics sources.')
  const parsed = z.object({
    partnerId: z.string().min(1).max(100),
    status: z.enum(['unverified', 'paused', 'participating', 'full_partner']),
    priority: z.number().int().min(0).max(10000),
  }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Check the source status and priority.')
  const [partner] = await db.select().from(solutionPartner).where(and(eq(solutionPartner.id, parsed.data.partnerId), eq(solutionPartner.organizationId, context.organizationId))).limit(1)
  if (!partner || !['robotics', 'both'].includes(partner.category)) return invalid('Robotics source not found in this organization.')
  const now = new Date()
  await db.update(solutionPartner).set({ roboticsSourceStatus: parsed.data.status, roboticsSourcePriority: parsed.data.priority, updatedAt: now }).where(and(eq(solutionPartner.id, partner.id), eq(solutionPartner.organizationId, context.organizationId)))
  await recordAudit({ organizationId: context.organizationId, userId: context.user.id, action: 'robotics_source.qualified', entityType: 'solution_partner', entityId: partner.id, metadata: { previousStatus: partner.roboticsSourceStatus, status: parsed.data.status, previousPriority: partner.roboticsSourcePriority, priority: parsed.data.priority } })
  refreshSourcing()
  return { ok: true, id: partner.id }
}

export async function getRoboticsCatalogAdminData() {
  const context = await getAdminContext()
  if (!context) return null
  const [manufacturers, models, capabilities, sourceOfferings, partners] = await Promise.all([
    db.select().from(roboticsManufacturer).where(eq(roboticsManufacturer.organizationId, context.organizationId)),
    db.select().from(roboticsModel).where(eq(roboticsModel.organizationId, context.organizationId)),
    db.select().from(roboticsModelCapability).where(eq(roboticsModelCapability.organizationId, context.organizationId)),
    db.select().from(roboticsSourceOffering).where(eq(roboticsSourceOffering.organizationId, context.organizationId)),
    db.select().from(solutionPartner).where(eq(solutionPartner.organizationId, context.organizationId)),
  ])
  return { manufacturers, models, capabilities, sourceOfferings, partners: partners.filter((partner) => ['robotics', 'both'].includes(partner.category)) }
}

export async function refreshRoboticsRecommendation(interestId: string, reason: string): Promise<Result> {
  const context = await getAdminContext()
  if (!context) return invalid('You do not have permission to rerun robotics recommendations.')
  if (typeof interestId !== 'string' || !interestId.trim() || interestId.length > 100) return invalid('Request not found.')
  const [interest] = await db.select({ id: roboticsInterest.id, propertyId: roboticsInterest.propertyId }).from(roboticsInterest).where(and(eq(roboticsInterest.id, interestId), eq(roboticsInterest.organizationId, context.organizationId))).limit(1)
  if (!interest) return invalid('Request not found.')
  const cleanReason = z.string().trim().max(500).safeParse(reason)
  if (!cleanReason.success || !cleanReason.data) return invalid('Add a short reason for rerunning this recommendation.')
  const run = await createRoboticsRecommendationRun({ organizationId: context.organizationId, interestId: interest.id, createdByUserId: context.user.id, reason: cleanReason.data })
  if (!run) return invalid('A completed assessment and an open fit request are required before recommendations can be generated.')
  await recordAudit({ organizationId: context.organizationId, userId: context.user.id, action: 'robotics_recommendations.refreshed', entityType: 'robotics_recommendation_run', entityId: run.id, metadata: { interestId: interest.id, assessmentId: run.assessmentId, assessmentVersion: run.assessmentVersion, runNumber: run.runNumber, reason: reason.slice(0, 500) } })
  refreshSourcing()
  return { ok: true, id: run.id }
}

export async function getRoboticsRecommendationAdminData(interestId: string) {
  const context = await getAdminContext()
  if (!context || typeof interestId !== 'string' || !interestId.trim() || interestId.length > 100) return null
  const [interest] = await db.select({ id: roboticsInterest.id, propertyId: roboticsInterest.propertyId }).from(roboticsInterest).where(and(eq(roboticsInterest.id, interestId), eq(roboticsInterest.organizationId, context.organizationId))).limit(1)
  if (!interest) return null
  const [current, history] = await Promise.all([
    getCurrentRoboticsRecommendationRun(context.organizationId, interest.id),
    listRoboticsRecommendationHistory(context.organizationId, interest.id),
  ])
  return { current, history }
}
