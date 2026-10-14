"use server"

import { and, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { property, roboticsInterest, roboticsRecommendationRun, roboticsSourceCollaboration, roboticsSourceCollaborationEvent, solutionPartner, type RoboticsInterestRecommendation } from "@/lib/db/schema"
import { isAdminRole } from "@/lib/access"
import { getAuthorizedProperty, getOrgContext, isClient, recordAudit } from "@/lib/tenancy"
import {
  clampInterestText,
  isRoboticsContactPreference,
  isRoboticsInterestStatus,
  isRoboticsTask,
  isRoboticsUseCase,
  rankRoboticsPartners,
  toPartnerProfile,
  type RoboticsInterestStatus,
} from "@/lib/robotics-interest/core"
import { eligibleManualPartner } from "@/lib/robotics-interest/core"

export type RoboticsInterestActionState = {
  status: "idle" | "success" | "error"
  message: string
}

const interestFormSchema = z.object({
  useCase: z.custom<import("@/lib/robotics-interest/core").RoboticsUseCase>(isRoboticsUseCase),
  tasks: z.array(z.custom<import("@/lib/robotics-interest/core").RoboticsTask>(isRoboticsTask)).min(1).max(9),
  otherTaskDetail: z.string().trim().max(240),
  location: z.enum(["indoor", "outdoor", "mixed"]),
  access: z.enum(["public", "restricted", "mixed"]),
  operatingHours: z.string().trim().max(160),
  operatingConditions: z.string().trim().max(1200),
  humanHandoff: z.string().trim().max(1200),
  safetyRequirements: z.string().trim().max(1200),
  integrationNeeds: z.string().trim().max(1200),
  serviceNeeds: z.string().trim().max(1200),
  budgetRange: z.string().trim().max(100),
  targetTimeline: z.enum(["As soon as practical", "Within 3 months", "Within 6 months", "Within 12 months", "Exploring options"]),
  additionalContext: z.string().trim().max(2400),
  contactPhone: z.string().trim().max(60),
  contactPreference: z.custom<"email" | "phone">(isRoboticsContactPreference),
  contactConsent: z.literal(true),
})

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value : ""
}

function selectedValues(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((value): value is string => typeof value === "string")
}

export async function submitRoboticsInterest(
  propertyId: string,
  _previousState: RoboticsInterestActionState,
  formData: FormData,
): Promise<RoboticsInterestActionState> {
  const ctx = await getOrgContext()
  if (!ctx || !isClient(ctx.role)) {
    return { status: "error", message: "Sign in as the property owner to submit a fit-review request." }
  }
  if (typeof propertyId !== "string" || !propertyId.trim() || propertyId.length > 100) {
    return { status: "error", message: "This property could not be verified." }
  }

  const propertyRow = await getAuthorizedProperty(ctx, propertyId, "read")
  if (!propertyRow) return { status: "error", message: "This property could not be verified." }

  const parsed = interestFormSchema.safeParse({
    useCase: field(formData, "useCase"),
    tasks: selectedValues(formData, "tasks"),
    otherTaskDetail: field(formData, "otherTaskDetail"),
    location: field(formData, "location"),
    access: field(formData, "access"),
    operatingHours: field(formData, "operatingHours"),
    operatingConditions: field(formData, "operatingConditions"),
    humanHandoff: field(formData, "humanHandoff"),
    safetyRequirements: field(formData, "safetyRequirements"),
    integrationNeeds: field(formData, "integrationNeeds"),
    serviceNeeds: field(formData, "serviceNeeds"),
    budgetRange: field(formData, "budgetRange"),
    targetTimeline: field(formData, "targetTimeline"),
    additionalContext: field(formData, "additionalContext"),
    contactPhone: field(formData, "contactPhone"),
    contactPreference: field(formData, "contactPreference"),
    contactConsent: formData.get("contactConsent") === "yes",
  })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Please review the required fields and try again." }
  }
  if (parsed.data.tasks.includes("other") && parsed.data.otherTaskDetail.length < 3) {
    return { status: "error", message: "Please describe the other recurring task." }
  }
  if (parsed.data.contactPreference === "phone" && parsed.data.contactPhone.length < 7) {
    return { status: "error", message: "Add a phone number or choose email as your contact preference." }
  }

  const tasks = parsed.data.tasks.map((task) =>
    task === "other" ? `other:${parsed.data.otherTaskDetail}` : task,
  )
  const partnerRows = await db
    .select()
    .from(solutionPartner)
    .where(eq(solutionPartner.organizationId, ctx.organizationId))
  const partnerProfiles = partnerRows.flatMap((row) => {
    const profile = toPartnerProfile(row)
    return profile ? [profile] : []
  })
  const recommendations = rankRoboticsPartners(
    {
      propertyId: propertyRow.id,
      propertyName: propertyRow.name,
      city: propertyRow.city,
      region: propertyRow.region,
      country: propertyRow.country,
      useCase: parsed.data.useCase,
      tasks,
    },
    partnerProfiles,
  )

  const id = crypto.randomUUID()
  const submittedAt = new Date()
  await db.insert(roboticsInterest).values({
    id,
    organizationId: ctx.organizationId,
    propertyId: propertyRow.id,
    createdByUserId: ctx.user.id,
    useCase: parsed.data.useCase,
    tasks,
    environment: {
      location: parsed.data.location,
      access: parsed.data.access,
      operatingHours: parsed.data.operatingHours,
    },
    operatingConditions: clampInterestText(parsed.data.operatingConditions, 1200),
    humanHandoff: clampInterestText(parsed.data.humanHandoff, 1200),
    safetyRequirements: clampInterestText(parsed.data.safetyRequirements, 1200),
    integrationNeeds: clampInterestText(parsed.data.integrationNeeds, 1200),
    serviceNeeds: clampInterestText(parsed.data.serviceNeeds, 1200),
    budgetRange: clampInterestText(parsed.data.budgetRange, 100),
    targetTimeline: parsed.data.targetTimeline,
    additionalContext: clampInterestText(parsed.data.additionalContext, 2400),
    contactName: ctx.user.name,
    contactEmail: ctx.user.email,
    contactPhone: clampInterestText(parsed.data.contactPhone, 60),
    contactPreference: parsed.data.contactPreference,
    contactConsentAt: submittedAt,
    contactConsentByUserId: ctx.user.id,
    status: "submitted",
    recommendations,
    submittedAt,
    updatedAt: submittedAt,
  })
  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "robotics_interest.submitted",
    entityType: "robotics_interest",
    entityId: id,
    metadata: { propertyId: propertyRow.id, recommendationCount: recommendations.length },
  })

  revalidatePath(`/dashboard/properties/${propertyRow.id}`)
  revalidatePath(`/dashboard/properties/${propertyRow.id}/robotics-interest`)
  return {
    status: "success",
    message: "Your request is with RoboReady for fit review. A team member will follow up using your selected contact preference.",
  }
}

export async function getCustomerRoboticsInterest(propertyId: string) {
  const ctx = await getOrgContext()
  if (!ctx || !isClient(ctx.role) || typeof propertyId !== "string" || !propertyId.trim() || propertyId.length > 100) {
    return null
  }

  const propertyRow = await getAuthorizedProperty(ctx, propertyId, "read")
  if (!propertyRow) return null

  const [request] = await db
    .select({ submittedAt: roboticsInterest.submittedAt })
    .from(roboticsInterest)
    .where(and(
      eq(roboticsInterest.organizationId, ctx.organizationId),
      eq(roboticsInterest.propertyId, propertyRow.id),
      eq(roboticsInterest.createdByUserId, ctx.user.id),
    ))
    .orderBy(desc(roboticsInterest.submittedAt))
    .limit(1)

  return request ? { submittedAt: request.submittedAt.toISOString() } : null
}

export async function getRoboticsInterestReviewData() {
  const ctx = await getOrgContext()
  if (!ctx || !isAdminRole(ctx.role)) return null

  const [rows, partnerRows, recommendationRows, collaborationRows] = await Promise.all([
    db
      .select({
        interest: roboticsInterest,
        propertyName: property.name,
        addressLine1: property.addressLine1,
        city: property.city,
        region: property.region,
        country: property.country,
        selectedPartnerName: solutionPartner.name,
      })
      .from(roboticsInterest)
      .innerJoin(property, and(eq(property.id, roboticsInterest.propertyId), eq(property.organizationId, ctx.organizationId)))
      .leftJoin(solutionPartner, and(
        eq(solutionPartner.id, roboticsInterest.selectedPartnerId),
        eq(solutionPartner.organizationId, ctx.organizationId),
      ))
      .where(eq(roboticsInterest.organizationId, ctx.organizationId))
      .orderBy(desc(roboticsInterest.submittedAt)),
    db
      .select()
      .from(solutionPartner)
      .where(and(eq(solutionPartner.organizationId, ctx.organizationId), eq(solutionPartner.active, true))),
    db
      .select()
      .from(roboticsRecommendationRun)
      .where(and(eq(roboticsRecommendationRun.organizationId, ctx.organizationId), eq(roboticsRecommendationRun.status, "current")))
      .orderBy(desc(roboticsRecommendationRun.runNumber)),
    db
      .select()
      .from(roboticsSourceCollaboration)
      .where(eq(roboticsSourceCollaboration.organizationId, ctx.organizationId))
      .orderBy(desc(roboticsSourceCollaboration.createdAt)),
  ])
  const currentRunByInterest = new Map<string, (typeof recommendationRows)[number]>()
  for (const run of recommendationRows) {
    if (!currentRunByInterest.has(run.interestId)) currentRunByInterest.set(run.interestId, run)
  }
  const collaborationIds = collaborationRows.map((collaboration) => collaboration.id)
  const eventRows = collaborationIds.length
    ? await db.select().from(roboticsSourceCollaborationEvent).where(and(
      eq(roboticsSourceCollaborationEvent.organizationId, ctx.organizationId),
      inArray(roboticsSourceCollaborationEvent.collaborationId, collaborationIds),
    )).orderBy(desc(roboticsSourceCollaborationEvent.createdAt))
    : []
  const eventsByCollaboration = new Map<string, typeof eventRows>()
  for (const event of eventRows) eventsByCollaboration.set(event.collaborationId, [...(eventsByCollaboration.get(event.collaborationId) ?? []), event])
  const collaborationsByInterest = new Map<string, typeof collaborationRows>()
  for (const collaboration of collaborationRows) collaborationsByInterest.set(collaboration.interestId, [...(collaborationsByInterest.get(collaboration.interestId) ?? []), collaboration])

  return {
    requests: rows.map(({ interest, propertyName, addressLine1, city, region, country, selectedPartnerName }) => ({
      id: interest.id,
      propertyId: interest.propertyId,
      propertyName,
      address: [addressLine1, city, region, country].filter(Boolean).join(", "),
      useCase: interest.useCase,
      tasks: interest.tasks,
      environment: interest.environment,
      operatingConditions: interest.operatingConditions,
      humanHandoff: interest.humanHandoff,
      safetyRequirements: interest.safetyRequirements,
      integrationNeeds: interest.integrationNeeds,
      serviceNeeds: interest.serviceNeeds,
      budgetRange: interest.budgetRange,
      targetTimeline: interest.targetTimeline,
      additionalContext: interest.additionalContext,
      contactName: interest.contactName,
      contactEmail: interest.contactEmail,
      contactPhone: interest.contactPhone,
      contactPreference: interest.contactPreference,
      contactConsentAt: interest.contactConsentAt?.toISOString() ?? null,
      status: interest.status as RoboticsInterestStatus,
      recommendations: interest.recommendations as RoboticsInterestRecommendation[],
      selectedPartnerId: interest.selectedPartnerId,
      selectedPartnerName,
      recommendationRun: currentRunByInterest.get(interest.id) ?? null,
      sourceCollaborations: (collaborationsByInterest.get(interest.id) ?? []).map((collaboration) => ({
        ...collaboration,
        events: eventsByCollaboration.get(collaboration.id) ?? [],
      })),
      reviewNotes: interest.reviewNotes,
      submittedAt: interest.submittedAt.toISOString(),
    })),
    partners: partnerRows.flatMap((row) => {
      const profile = toPartnerProfile(row)
      return profile && eligibleManualPartner(profile) ? [{ id: profile.id, name: profile.name }] : []
    }),
  }
}

export async function reviewRoboticsInterest(
  interestId: string,
  _previousState: RoboticsInterestActionState,
  formData: FormData,
): Promise<RoboticsInterestActionState> {
  const ctx = await getOrgContext()
  if (!ctx || !isAdminRole(ctx.role)) {
    return { status: "error", message: "You do not have permission to review robotics-interest requests." }
  }
  if (typeof interestId !== "string" || !interestId.trim() || interestId.length > 100) {
    return { status: "error", message: "Request not found." }
  }

  const [request] = await db
    .select()
    .from(roboticsInterest)
    .where(and(eq(roboticsInterest.id, interestId), eq(roboticsInterest.organizationId, ctx.organizationId)))
    .limit(1)
  if (!request) return { status: "error", message: "Request not found." }

  const rawStatus = field(formData, "status")
  if (!isRoboticsInterestStatus(rawStatus) || rawStatus === "submitted") {
    return { status: "error", message: "Choose a valid review status." }
  }
  const requestedPartnerId = clampInterestText(field(formData, "selectedPartnerId"), 100)
  const selectedPartnerId = formData.has("selectedPartnerId") ? requestedPartnerId : request.selectedPartnerId
  if (rawStatus === "recommended" && !selectedPartnerId) {
    return { status: "error", message: "Select an active robotics partner before marking this fit as selected." }
  }

  let selectedPartnerName: string | null = null
  if (selectedPartnerId) {
    const [partnerRow] = await db
      .select()
      .from(solutionPartner)
      .where(and(
        eq(solutionPartner.id, selectedPartnerId),
        eq(solutionPartner.organizationId, ctx.organizationId),
        eq(solutionPartner.active, true),
      ))
      .limit(1)
    const profile = partnerRow ? toPartnerProfile(partnerRow) : null
    if (!profile || !eligibleManualPartner(profile)) {
      return { status: "error", message: "Choose an active robotics partner from this organization." }
    }
    selectedPartnerName = profile.name
  }

  const reviewNotes = clampInterestText(field(formData, "reviewNotes"), 2000)
  const reviewedAt = new Date()
  await db.update(roboticsInterest)
    .set({
      status: rawStatus,
      selectedPartnerId,
      reviewNotes,
      reviewedByUserId: ctx.user.id,
      reviewedAt,
      updatedAt: reviewedAt,
    })
    .where(and(eq(roboticsInterest.id, request.id), eq(roboticsInterest.organizationId, ctx.organizationId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "robotics_interest.reviewed",
    entityType: "robotics_interest",
    entityId: request.id,
    metadata: { status: rawStatus, selectedPartnerId, selectedPartnerName },
  })
  revalidatePath("/dashboard/robotics-interest")
  return { status: "success", message: "Review saved." }
}
