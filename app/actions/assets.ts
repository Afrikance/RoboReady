"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { infrastructureAsset, property } from "@/lib/db/schema"
import { recordAudit, requireOrgContext } from "@/lib/tenancy"
import type { ActionResult } from "@/app/actions/properties"

export async function listAssets(propertyId: string) {
  const ctx = await requireOrgContext()
  return db
    .select()
    .from(infrastructureAsset)
    .where(
      and(
        eq(infrastructureAsset.propertyId, propertyId),
        eq(infrastructureAsset.organizationId, ctx.organizationId),
      ),
    )
}

export type AssetInput = {
  propertyId: string
  assetType: string
  label: string
  quantity: number
  unitCost?: number | null
  latitude?: number | null
  longitude?: number | null
}

export async function addAsset(input: AssetInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrgContext()

  const [prop] = await db
    .select({ id: property.id })
    .from(property)
    .where(and(eq(property.id, input.propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }
  if (!input.label?.trim()) return { ok: false, error: "Label is required." }

  const id = crypto.randomUUID()
  await db.insert(infrastructureAsset).values({
    id,
    organizationId: ctx.organizationId,
    propertyId: input.propertyId,
    createdByUserId: ctx.user.id,
    assetType: input.assetType,
    label: input.label.trim(),
    status: "planned",
    quantity: Math.max(1, Math.round(input.quantity || 1)),
    unitCost: input.unitCost != null ? String(input.unitCost) : null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  })

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "asset.added",
    entityType: "infrastructure_asset",
    entityId: id,
    metadata: { propertyId: input.propertyId, assetType: input.assetType },
  })

  revalidatePath(`/dashboard/properties/${input.propertyId}`)
  return { ok: true, data: { id } }
}

export async function updateAssetPlacement(
  id: string,
  latitude: number,
  longitude: number,
): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  await db
    .update(infrastructureAsset)
    .set({ latitude, longitude, updatedAt: new Date() })
    .where(and(eq(infrastructureAsset.id, id), eq(infrastructureAsset.organizationId, ctx.organizationId)))
  return { ok: true, data: undefined }
}

export async function setAssetStatus(id: string, status: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  const [asset] = await db
    .update(infrastructureAsset)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(infrastructureAsset.id, id), eq(infrastructureAsset.organizationId, ctx.organizationId)))
    .returning({ propertyId: infrastructureAsset.propertyId })
  if (asset) revalidatePath(`/dashboard/properties/${asset.propertyId}`)
  return { ok: true, data: undefined }
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  const [asset] = await db
    .delete(infrastructureAsset)
    .where(and(eq(infrastructureAsset.id, id), eq(infrastructureAsset.organizationId, ctx.organizationId)))
    .returning({ propertyId: infrastructureAsset.propertyId })
  if (asset) revalidatePath(`/dashboard/properties/${asset.propertyId}`)
  return { ok: true, data: undefined }
}
