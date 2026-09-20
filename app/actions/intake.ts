"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { intakeSubmission, property } from "@/lib/db/schema"
import { hasRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { intakeCompletion } from "@/lib/intake/questions"
import { syncListingFromAssessment } from "@/lib/network/data"
import type { ActionResult } from "@/app/actions/properties"

/** Clears any Field Work claim stored on a property's metadata.pipeline. */
function dropClaim(metadata: unknown): Record<string, unknown> {
  const base = (metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {}) ?? {}
  const pipeline =
    base.pipeline && typeof base.pipeline === "object" ? { ...(base.pipeline as Record<string, unknown>) } : {}
  pipeline.claim = null
  return { ...base, pipeline }
}

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
    .select({ id: property.id, status: property.status, metadata: property.metadata })
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  const completion = intakeCompletion(answers)
  const existing = await getIntake(propertyId)

  // Once an intake is submitted (completed) it becomes view-only for everyone
  // except admins/owners. A Field Operator who submits can no longer edit it;
  // only an admin can reopen or change a submitted intake.
  if (existing?.status === "completed" && !hasRole(ctx, "admin")) {
    return {
      ok: false,
      error: "This intake has been submitted and is locked. Only an admin can edit it.",
    }
  }

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

  // Advance property status when intake is completed. A property coming out of
  // the field-work handover queue goes to the admin verification queue; a
  // property in the direct flow proceeds straight to assessing as before.
  if (complete) {
    const fromHandover = prop.status === "handover"
    const nextStatus = fromHandover ? "pending_verification" : "assessing"
    await db
      .update(property)
      // Leaving Field Work clears the claim so it isn't shown as in-progress
      // once it moves to the verification queue.
      .set({
        status: nextStatus,
        updatedAt: new Date(),
        ...(fromHandover ? { metadata: dropClaim(prop.metadata) } : {}),
      })
      .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    if (nextStatus === "pending_verification") {
      revalidatePath("/dashboard/handover")
      revalidatePath("/dashboard/verification")
    }
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: complete ? "intake.completed" : "intake.saved",
    entityType: "intake_submission",
    entityId: id,
    metadata: { propertyId, completion },
  })

  // Any property with amenities enters the RoboArrival network automatically
  // and stays updated. Intake answers are what amenities are derived from, so
  // re-sync here on every save. Best-effort — never blocks the intake save.
  try {
    await syncListingFromAssessment(propertyId)
    revalidatePath("/network")
    revalidatePath("/dashboard/network")
  } catch (err) {
    console.log("[v0] syncListingFromAssessment (intake) failed:", (err as Error).message)
  }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { ok: true, data: { id, completion } }
}
