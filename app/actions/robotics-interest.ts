"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { property, roboticsInterest, solutionPartner } from "@/lib/db/schema"
import { isClient } from "@/lib/roles"
import { getAuthorizedProperty, getOrgContext, recordAudit } from "@/lib/tenancy"
import {
  isRoboticsContactPreference,
  isRoboticsTask,
  isRoboticsUseCase,
  rankRoboticsPartners,
  toPartnerProfile,
} from "@/lib/robotics-interest/core"

const interestInputSchema = z.object({
  useCase: z.string().max(60),
  tasks: z.array(z.string().max(120)).min(1).max(9),
  otherTaskDetail: z.string().trim().max(160).optional(),
  environment: z.object({
    location: z.enum(["indoor", "outdoor", "mixed"]),
    access: z.enum(["public", "restricted", "mixed"]),
    operatingHours: z.string().trim().max(120),
  }),
  operatingConditions: z.string().trim().max(2000).optional(),
  humanHandoff: z.string().trim().max(2000).optional(),
  safetyRequirements: z.string().trim().max(2000).optional(),
  integrationNeeds: z.string().trim().max(2000).optional(),
  serviceNeeds: z.string().trim().max(2000).optional(),
  budgetRange: z.string().trim().max(120).optional(),
  targetTimeline: z.string().trim().min(1).max(120),
  additionalContext: z.string().trim().max(4000).optional(),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(320),
  contactPhone: z.string().trim().max(60).optional(),
  contactPreference: z.enum(["email", "phone"]),
  contactConsent: z.literal(true),
})

function optionalText(value: string | undefined) {
  return value?.trim() || null
}

export async function getCustomerRoboticsInterest(propertyId: string) {
  const ctx = await getOrgContext()
  if (!ctx || !isClient(ctx.role)) return null
  const authorizedProperty = await getAuthorizedProperty(ctx, propertyId, "read")
  if (!authorizedProperty) return null

  const [row] = await db
    .select({ status: roboticsInterest.status, submittedAt: roboticsInterest.submittedAt })
    .from(roboticsInterest)
    .where(and(
      eq(roboticsInterest.organizationId, ctx.organizationId),
      eq(roboticsInterest.propertyId, authorizedProperty.id),
      eq(roboticsInterest.createdByUserId, ctx.user.id),
    ))
    .orderBy(desc(roboticsInterest.submittedAt))
    .limit(1)

  return row ?? null
}

export async function submitRoboticsInterest(propertyId: string, input: unknown) {
  const ctx = await getOrgContext()
  if (!ctx || !isClient(ctx.role)) return { ok: false as const, error: "Only a property owner can submit this request." }
  if (typeof propertyId !== "string" || propertyId.length > 100) {
    return { ok: false as const, error: "Choose a valid property." }
  }

  const parsed = interestInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Review the request details." }
  const value = parsed.data
  if (!isRoboticsUseCase(value.useCase) || !value.tasks.every((task) => isRoboticsTask(task))) {
    return { ok: false as const, error: "Choose a valid use case and task list." }
  }
  if (!value.contactConsent || !isRoboticsContactPreference(value.contactPreference)) {
    return { ok: false as const, error: "Consent is required so RoboReady can follow up about this request." }
  }
  if (value.contactPreference === "phone" && !value.contactPhone?.trim()) {
    return { ok: false as const, error: "Add a phone number for phone follow-up." }
  }
  if (value.tasks.includes("other") && !value.otherTaskDetail?.trim()) {
    return { ok: false as const, error: "Describe the other recurring task." }
  }

  const authorizedProperty = await getAuthorizedProperty(ctx, propertyId, "read")
  if (!authorizedProperty) return { ok: false as const, error: "Property not found." }

  const tasks = value.tasks.map((task) =>
    task === "other" ? `other:${value.otherTaskDetail?.trim().slice(0, 160)}` : task,
  )
  const partnerRows = await db
    .select()
    .from(solutionPartner)
    .where(and(eq(solutionPartner.organizationId, ctx.organizationId), eq(solutionPartner.active, true)))
  const partners = partnerRows.flatMap((row) => {
    const profile = toPartnerProfile(row)
    return profile ? [profile] : []
  })
  const recommendations = rankRoboticsPartners({
    propertyId: authorizedProperty.id,
    propertyName: authorizedProperty.name,
    city: authorizedProperty.city,
    region: authorizedProperty.region,
    country: authorizedProperty.country,
    useCase: value.useCase,
    tasks,
  }, partners)

  const id = crypto.randomUUID()
  const now = new Date()
  await db.insert(roboticsInterest).values({
    id,
    organizationId: ctx.organizationId,
    propertyId: authorizedProperty.id,
    createdByUserId: ctx.user.id,
    useCase: value.useCase,
    tasks,
    environment: value.environment,
    operatingConditions: optionalText(value.operatingConditions),
    humanHandoff: optionalText(value.humanHandoff),
    safetyRequirements: optionalText(value.safetyRequirements),
    integrationNeeds: optionalText(value.integrationNeeds),
    serviceNeeds: optionalText(value.serviceNeeds),
    budgetRange: optionalText(value.budgetRange),
    targetTimeline: value.targetTimeline,
    additionalContext: optionalText(value.additionalContext),
    contactName: value.contactName,
    contactEmail: value.contactEmail.toLowerCase(),
    contactPhone: optionalText(value.contactPhone),
    contactPreference: value.contactPreference,
    contactConsentAt: now,
    contactConsentByUserId: ctx.user.id,
    status: recommendations.length > 0 ? "submitted" : "under_review",
    recommendations,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  })

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "robotics_interest.submitted",
    entityType: "robotics_interest",
    entityId: id,
    metadata: { propertyId: authorizedProperty.id, recommendationsCount: recommendations.length },
  })

  revalidatePath(`/dashboard/properties/${authorizedProperty.id}`)
  revalidatePath(`/dashboard/properties/${authorizedProperty.id}/robotics-interest`)
  revalidatePath("/dashboard/robotics-interest")
  return { ok: true as const }
}

export async function getRoboticsInterestPropertySnapshot(propertyId: string) {
  const ctx = await getOrgContext()
  if (!ctx || !isClient(ctx.role)) return null
  const [row] = await db
    .select({ id: property.id, name: property.name, city: property.city, region: property.region, country: property.country })
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId), eq(property.createdByUserId, ctx.user.id)))
    .limit(1)
  return row ?? null
}

export type CustomerRoboticsInterest = NonNullable<Awaited<ReturnType<typeof getCustomerRoboticsInterest>>>
export type RoboticsInterestFormInput = z.infer<typeof interestInputSchema>
