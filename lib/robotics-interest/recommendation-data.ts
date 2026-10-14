import "server-only"

import { and, desc, eq, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  assessment,
  property,
  roboticsInterest,
  roboticsManufacturer,
  roboticsModel,
  roboticsModelCapability,
  roboticsRecommendationRun,
  roboticsSourceOffering,
  solutionPartner,
} from "@/lib/db/schema"
import { rankRoboticsCatalog, type RoboticsCatalogModel, type RoboticsInterestRequirements } from "@/lib/robotics-interest/matcher"

export async function createRoboticsRecommendationRun(input: {
  organizationId: string
  interestId: string
  assessmentId?: string
  createdByUserId: string | null
  reason?: string | null
}) {
  const [interest] = await db
    .select()
    .from(roboticsInterest)
    .where(and(eq(roboticsInterest.id, input.interestId), eq(roboticsInterest.organizationId, input.organizationId)))
    .limit(1)
  if (!interest || interest.status === "closed") return null

  const [propertyRow] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, interest.propertyId), eq(property.organizationId, input.organizationId)))
    .limit(1)
  if (!propertyRow) return null

  const assessmentConditions = [
    eq(assessment.propertyId, propertyRow.id),
    eq(assessment.organizationId, input.organizationId),
    eq(assessment.status, "completed"),
  ]
  if (input.assessmentId) assessmentConditions.push(eq(assessment.id, input.assessmentId))
  const [assessmentRow] = await db
    .select()
    .from(assessment)
    .where(and(...assessmentConditions))
    .orderBy(desc(assessment.version))
    .limit(1)
  if (!assessmentRow) return null

  const [manufacturers, models, capabilities, sourceOfferings, partners] = await Promise.all([
    db.select().from(roboticsManufacturer).where(eq(roboticsManufacturer.organizationId, input.organizationId)),
    db.select().from(roboticsModel).where(eq(roboticsModel.organizationId, input.organizationId)),
    db.select().from(roboticsModelCapability).where(eq(roboticsModelCapability.organizationId, input.organizationId)),
    db.select().from(roboticsSourceOffering).where(eq(roboticsSourceOffering.organizationId, input.organizationId)),
    db.select().from(solutionPartner).where(eq(solutionPartner.organizationId, input.organizationId)),
  ])

  const manufacturersById = new Map(manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]))
  const capabilitiesByModelId = new Map<string, typeof capabilities>()
  for (const capability of capabilities) {
    capabilitiesByModelId.set(capability.modelId, [...(capabilitiesByModelId.get(capability.modelId) ?? []), capability])
  }
  const partnersById = new Map(partners.map((partner) => [partner.id, partner]))
  const modelsById = new Map(models.map((model) => [model.id, model]))
  const offersByModelId = new Map<string, RoboticsCatalogModel["offers"]>()
  for (const offering of sourceOfferings) {
    const modelRow = modelsById.get(offering.modelId)
    const partnerRow = partnersById.get(offering.partnerId)
    if (!modelRow || !partnerRow) continue
    offersByModelId.set(offering.modelId, [
      ...(offersByModelId.get(offering.modelId) ?? []),
      {
        id: offering.id,
        partnerId: offering.partnerId,
        sourceType: offering.sourceType,
        sourceUrl: offering.sourceUrl,
        availability: offering.availability,
        verificationStatus: offering.verificationStatus,
        lastVerifiedAt: offering.lastVerifiedAt?.toISOString() ?? null,
        priceCents: offering.priceCents,
        priceCurrency: offering.priceCurrency,
        priceBasis: offering.priceBasis,
        partner: {
          id: partnerRow.id,
          name: partnerRow.name,
          active: partnerRow.active,
          category: partnerRow.category,
          capabilities: Array.isArray(partnerRow.capabilities) ? partnerRow.capabilities : [],
          coverage: partnerRow.coverage,
          roboticsSourceStatus: partnerRow.roboticsSourceStatus,
          roboticsSourcePriority: partnerRow.roboticsSourcePriority,
        },
      },
    ])
  }

  const catalogModels: RoboticsCatalogModel[] = models.flatMap((modelRow) => {
    const manufacturer = manufacturersById.get(modelRow.manufacturerId)
    if (!manufacturer) return []
    return [{
      id: modelRow.id,
      name: modelRow.name,
      category: modelRow.category,
      productUrl: modelRow.productUrl,
      commercialStatus: modelRow.commercialStatus,
      verificationStatus: modelRow.verificationStatus,
      lastVerifiedAt: modelRow.lastVerifiedAt?.toISOString() ?? null,
      manufacturer: {
        name: manufacturer.name,
        verificationStatus: manufacturer.verificationStatus,
        lastVerifiedAt: manufacturer.lastVerifiedAt?.toISOString() ?? null,
      },
      capabilities: (capabilitiesByModelId.get(modelRow.id) ?? []).map((capability) => ({
        id: capability.id,
        capabilityKey: capability.capabilityKey,
        capabilityValue: capability.capabilityValue,
        verificationStatus: capability.verificationStatus,
        evidenceUrl: capability.evidenceUrl,
        lastVerifiedAt: capability.lastVerifiedAt?.toISOString() ?? null,
      })),
      offers: offersByModelId.get(modelRow.id) ?? [],
    }]
  })

  const requirements: RoboticsInterestRequirements = {
    property: {
      id: propertyRow.id,
      name: propertyRow.name,
      city: propertyRow.city,
      region: propertyRow.region,
      country: propertyRow.country,
    },
    useCase: interest.useCase,
    tasks: Array.isArray(interest.tasks) ? interest.tasks : [],
    environment: interest.environment,
    operatingConditions: interest.operatingConditions,
    safetyRequirements: interest.safetyRequirements,
    integrationNeeds: interest.integrationNeeds,
    serviceNeeds: interest.serviceNeeds,
    budgetRange: interest.budgetRange,
    targetTimeline: interest.targetTimeline,
  }

  const generatedAt = new Date()
  const results = rankRoboticsCatalog({
    requirements,
    models: catalogModels,
    assessment: assessmentRow.premiumBreakdown,
    now: generatedAt,
  })
  const interestSnapshot = {
    property: requirements.property,
    useCase: requirements.useCase,
    tasks: requirements.tasks,
    environment: requirements.environment,
    operatingConditions: requirements.operatingConditions,
    safetyRequirements: requirements.safetyRequirements,
    integrationNeeds: requirements.integrationNeeds,
    serviceNeeds: requirements.serviceNeeds,
    budgetRange: requirements.budgetRange,
    targetTimeline: requirements.targetTimeline,
  }
  const assessmentSnapshot = {
    id: assessmentRow.id,
    version: assessmentRow.version,
    roboReadyScore: assessmentRow.roboReadyScore,
    premiumBreakdown: assessmentRow.premiumBreakdown,
  }

  return db.transaction(async (tx) => {
    const [latestRun] = await tx
      .select({ runNumber: roboticsRecommendationRun.runNumber })
      .from(roboticsRecommendationRun)
      .where(and(
        eq(roboticsRecommendationRun.organizationId, input.organizationId),
        eq(roboticsRecommendationRun.interestId, interest.id),
      ))
      .orderBy(desc(roboticsRecommendationRun.runNumber))
      .limit(1)
    const runNumber = (latestRun?.runNumber ?? 0) + 1
    await tx
      .update(roboticsRecommendationRun)
      .set({ status: "superseded", supersededAt: generatedAt })
      .where(and(
        eq(roboticsRecommendationRun.organizationId, input.organizationId),
        eq(roboticsRecommendationRun.interestId, interest.id),
        eq(roboticsRecommendationRun.status, "current"),
      ))
    const id = crypto.randomUUID()
    await tx.insert(roboticsRecommendationRun).values({
      id,
      organizationId: input.organizationId,
      interestId: interest.id,
      assessmentId: assessmentRow.id,
      assessmentVersion: assessmentRow.version,
      runNumber,
      status: "current",
      reason: input.reason?.trim().slice(0, 500) || null,
      interestSnapshot,
      assessmentSnapshot,
      results,
      createdByUserId: input.createdByUserId,
      createdAt: generatedAt,
    })
    return {
      id,
      runNumber,
      assessmentId: assessmentRow.id,
      assessmentVersion: assessmentRow.version,
      interestSnapshot,
      assessmentSnapshot,
      results,
    }
  })
}

export async function createLatestRoboticsRecommendationRun(input: {
  organizationId: string
  propertyId: string
  assessmentId: string
  createdByUserId: string | null
}) {
  const [interest] = await db
    .select({ id: roboticsInterest.id })
    .from(roboticsInterest)
    .where(and(
      eq(roboticsInterest.organizationId, input.organizationId),
      eq(roboticsInterest.propertyId, input.propertyId),
      ne(roboticsInterest.status, "closed"),
    ))
    .orderBy(desc(roboticsInterest.submittedAt))
    .limit(1)
  if (!interest) return null
  return createRoboticsRecommendationRun({
    organizationId: input.organizationId,
    interestId: interest.id,
    assessmentId: input.assessmentId,
    createdByUserId: input.createdByUserId,
    reason: "Assessment completed",
  })
}

export async function getCurrentRoboticsRecommendationRun(organizationId: string, interestId: string) {
  const [run] = await db
    .select()
    .from(roboticsRecommendationRun)
    .where(and(
      eq(roboticsRecommendationRun.organizationId, organizationId),
      eq(roboticsRecommendationRun.interestId, interestId),
      eq(roboticsRecommendationRun.status, "current"),
    ))
    .orderBy(desc(roboticsRecommendationRun.runNumber))
    .limit(1)
  return run ?? null
}

export async function listRoboticsRecommendationHistory(organizationId: string, interestId: string) {
  return db
    .select()
    .from(roboticsRecommendationRun)
    .where(and(
      eq(roboticsRecommendationRun.organizationId, organizationId),
      eq(roboticsRecommendationRun.interestId, interestId),
    ))
    .orderBy(desc(roboticsRecommendationRun.runNumber))
}

export async function listRoboticsCatalog(organizationId: string) {
  const [manufacturers, models, capabilities, sourceOfferings, partners] = await Promise.all([
    db.select().from(roboticsManufacturer).where(eq(roboticsManufacturer.organizationId, organizationId)),
    db.select().from(roboticsModel).where(eq(roboticsModel.organizationId, organizationId)).orderBy(desc(roboticsModel.updatedAt)),
    db.select().from(roboticsModelCapability).where(eq(roboticsModelCapability.organizationId, organizationId)),
    db.select().from(roboticsSourceOffering).where(eq(roboticsSourceOffering.organizationId, organizationId)),
    db.select().from(solutionPartner).where(eq(solutionPartner.organizationId, organizationId)).orderBy(desc(solutionPartner.updatedAt)),
  ])
  return { manufacturers, models, capabilities, sourceOfferings, partners }
}
