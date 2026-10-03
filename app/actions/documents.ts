"use server"

import { db } from "@/lib/db"
import { document } from "@/lib/db/schema"
import { getAuthorizedProperty, isFieldRole, requireOrgContext, recordAudit } from "@/lib/tenancy"
import { and, desc, eq } from "drizzle-orm"
import { del } from "@vercel/blob"
import { revalidatePath } from "next/cache"

export async function listDocuments(propertyId: string) {
  const ctx = await requireOrgContext()
  if (!(await getAuthorizedProperty(ctx, propertyId, "documents"))) return []
  return db
    .select()
    .from(document)
    .where(and(eq(document.organizationId, ctx.organizationId), eq(document.propertyId, propertyId)))
    .orderBy(desc(document.createdAt))
}

export async function deleteDocument(id: string) {
  const ctx = await requireOrgContext()
  const { organizationId, user } = ctx

  const [doc] = await db
    .select()
    .from(document)
    .where(and(eq(document.id, id), eq(document.organizationId, organizationId)))
    .limit(1)

  if (!doc) throw new Error("NOT_FOUND")
  if (!(await getAuthorizedProperty(ctx, doc.propertyId, "documents"))) throw new Error("NOT_FOUND")
  if (isFieldRole(ctx.role) && doc.createdByUserId !== user.id) throw new Error("NOT_FOUND")

  // Best-effort blob cleanup; the pathname is stored in `url`.
  try {
    await del(doc.url)
  } catch (err) {
    console.log("[v0] blob delete failed (continuing):", (err as Error).message)
  }

  await db.delete(document).where(and(eq(document.id, id), eq(document.organizationId, organizationId)))

  await recordAudit({
    organizationId,
    userId: user.id,
    action: "document.deleted",
    entityType: "document",
    entityId: id,
    metadata: { propertyId: doc.propertyId },
  })

  revalidatePath(`/dashboard/properties/${doc.propertyId}`)
}
