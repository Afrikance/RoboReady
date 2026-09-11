"use server"

import { and, asc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { membership, property, propertyAssignment, user } from "@/lib/db/schema"
import { FIELD_ROLES, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { canManageTeam } from "@/lib/access"
import type { ActionResult } from "@/app/actions/properties"

/** Field-role members of the org who can be assigned to build out a property. */
export async function listAssignableStaff() {
  const ctx = await requireOrgContext()
  return db
    .select({
      userId: membership.userId,
      role: membership.role,
      name: user.name,
      email: user.email,
    })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(
      and(
        eq(membership.organizationId, ctx.organizationId),
        inArray(membership.role, FIELD_ROLES as unknown as string[]),
      ),
    )
    .orderBy(asc(user.name))
}

/** Current assignments for a property, joined with the assignee's identity. */
export async function listAssignmentsForProperty(propertyId: string) {
  const ctx = await requireOrgContext()
  return db
    .select({
      id: propertyAssignment.id,
      userId: propertyAssignment.userId,
      role: propertyAssignment.role,
      name: user.name,
      email: user.email,
      createdAt: propertyAssignment.createdAt,
    })
    .from(propertyAssignment)
    .innerJoin(user, eq(user.id, propertyAssignment.userId))
    .where(
      and(
        eq(propertyAssignment.organizationId, ctx.organizationId),
        eq(propertyAssignment.propertyId, propertyId),
      ),
    )
    .orderBy(asc(user.name))
}

export async function assignStaff(propertyId: string, userId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!canManageTeam(ctx.role)) return { ok: false, error: "You do not have permission to assign staff." }

  // The property must belong to this org.
  const prop = await db
    .select({ id: property.id })
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop[0]) return { ok: false, error: "Property not found." }

  // The assignee must be a field-role member of this org.
  const target = await db
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.organizationId, ctx.organizationId), eq(membership.userId, userId)))
    .limit(1)
  const role = target[0]?.role
  if (!role || !(FIELD_ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: "Only field operators, vendors, and contractors can be assigned." }
  }

  try {
    await db.insert(propertyAssignment).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      propertyId,
      userId,
      role,
      assignedByUserId: ctx.user.id,
    })
  } catch {
    // Unique (propertyId, userId) — already assigned. Treat as success.
    return { ok: true, data: undefined }
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "property.assigned",
    entityType: "property",
    entityId: propertyId,
    metadata: { userId, role },
  })

  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { ok: true, data: undefined }
}

export async function unassignStaff(assignmentId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!canManageTeam(ctx.role)) return { ok: false, error: "You do not have permission to do that." }

  const rows = await db
    .select({ propertyId: propertyAssignment.propertyId })
    .from(propertyAssignment)
    .where(
      and(eq(propertyAssignment.id, assignmentId), eq(propertyAssignment.organizationId, ctx.organizationId)),
    )
    .limit(1)

  await db
    .delete(propertyAssignment)
    .where(
      and(eq(propertyAssignment.id, assignmentId), eq(propertyAssignment.organizationId, ctx.organizationId)),
    )

  if (rows[0]) revalidatePath(`/dashboard/properties/${rows[0].propertyId}`)
  return { ok: true, data: undefined }
}
