"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { intakeSubmission, property } from "@/lib/db/schema"
import { recordAudit, requireOrgContext } from "@/lib/tenancy"
import { intakeCompletion } from "@/lib/intake/questions"
import type { ActionResult } from "@/app/actions/properties"

/** Returns the latest intake submission for a property, or null. */
export async function getIntake(propertyId: string) {
  const ctx = await requireOrgContext()
  const rows = await db
    .select()
    .from(intakeSubmission)
    .where(and(eq(intakeSubmission.propertyId, propertyId), eq(intakeSubmission.organizationId, ctx.organizationId)))
    .orderBy(desc(intakeSubmission.updatedAt))
    .limit(1)
  return rows[0] ?? null
}

export async function saveIntake(
  propertyId: string,
  answers: Record<string, unknown>,
  complete: boolean,
): Promise<ActionResult<{ id: string; completion: number }>> {
  const ctx = await requireOrgContext()

  // Ownership check.
  const [prop] = await db
    .select({ id: property.id })
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  const completion = intakeCompletion(answers)
  const existing = await getIntake(propertyId)
  const status = complete ? "completed" : "draft"

  let id: string
  if (existing) {
    id = existing.id
    await db
      .update(intakeSubmission)
      .set({
        answers: answers as Record<string, unknown>,
        status,
        completedAt: complete ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(intakeSubmission.id, id), eq(intakeSubmission.organizationId, ctx.organizationId)))
  } else {
    id = crypto.randomUUID()
    await db.insert(intakeSubmission).values({
      id,
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      answers: answers as Record<string, unknown>,
      status,
      completedAt: complete ? new Date() : null,
    })
  }

  // Advance property status when intake is completed.
  if (complete) {
    await db
      .update(property)
      .set({ status: "assessing", updatedAt: new Date() })
      .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: complete ? "intake.completed" : "intake.saved",
    entityType: "intake_submission",
    entityId: id,
    metadata: { propertyId, completion },
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { ok: true, data: { id, completion } }
}
