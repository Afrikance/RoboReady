"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { infrastructureAsset } from "@/lib/db/schema"
import { assertRole, getAuthorizedProperty, recordAudit, requireOrgContext } from "@/lib/tenancy"
import type { ActionResult } from "@/app/actions/properties"

export async function listAssets(propertyId: string) {
  const ctx = await requireOrgContext()
  if (!(await getAuthorizedProperty(ctx, propertyId, "read"))) return []
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
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to add assets." }
  }

  if (!(await getAuthorizedProperty(ctx, input.propertyId, "operations"))) {
    return { ok: false, error: "Property not found." }
  }
  if (!input.label?.trim() || input.label.length > 200) return { ok: false, error: "A valid asset label is required." }
  if (!input.assetType?.trim() || input.assetType.length > 80) return { ok: false, error: "A valid asset type is required." }
  if (!Number.isFinite(input.quantity) || input.quantity < 1 || input.quantity > 10000) {
    return { ok: false, error: "Quantity must be between 1 and 10,000." }
  }
  if (input.unitCost != null && (!Number.isFinite(input.unitCost) || input.unitCost < 0 || input.unitCost > 9_999_999_999.99)) {
    return { ok: false, error: "Unit cost must be a non-negative number." }
  }
  if (input.latitude != null && (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90)) {
    return { ok: false, error: "Latitude is invalid." }
  }
  if (input.longitude != null && (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180)) {
    return { ok: false, error: "Longitude is invalid." }
  }

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
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, error: "Asset coordinates are invalid." }
  }
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to edit assets." }
  }
  const [asset] = await db.select({ propertyId: infrastructureAsset.propertyId }).from(infrastructureAsset)
    .where(and(eq(infrastructureAsset.id, id), eq(infrastructureAsset.organizationId, ctx.organizationId))).limit(1)
  if (!asset || !(await getAuthorizedProperty(ctx, asset.propertyId, "operations"))) {
    return { ok: false, error: "Asset not found." }
  }
  await db
    .update(infrastructureAsset)
    .set({ latitude, longitude, updatedAt: new Date() })
    .where(and(eq(infrastructureAsset.id, id), eq(infrastructureAsset.organizationId, ctx.organizationId)))
  return { ok: true, data: undefined }
}

const ASSET_STATUSES = new Set(["planned", "proposed", "approved", "in_progress", "completed", "rejected"])

export async function setAssetStatus(id: string, status: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!ASSET_STATUSES.has(status)) return { ok: false, error: "Choose a valid asset status." }
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to change assets." }
  }
  const [existing] = await db.select({ propertyId: infrastructureAsset.propertyId }).from(infrastructureAsset)
    .where(and(eq(infrastructureAsset.id, id), eq(infrastructureAsset.organizationId, ctx.organizationId))).limit(1)
  if (!existing || !(await getAuthorizedProperty(ctx, existing.propertyId, "operations"))) {
    return { ok: false, error: "Asset not found." }
  }
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
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to delete assets." }
  }
  const [existing] = await db.select({ propertyId: infrastructureAsset.propertyId }).from(infrastructureAsset)
    .where(and(eq(infrastructureAsset.id, id), eq(infrastructureAsset.organizationId, ctx.organizationId))).limit(1)
  if (!existing || !(await getAuthorizedProperty(ctx, existing.propertyId, "operations"))) {
    return { ok: false, error: "Asset not found." }
  }
  const [asset] = await db
    .delete(infrastructureAsset)
    .where(and(eq(infrastructureAsset.id, id), eq(infrastructureAsset.organizationId, ctx.organizationId)))
    .returning({ propertyId: infrastructureAsset.propertyId })
  if (asset) revalidatePath(`/dashboard/properties/${asset.propertyId}`)
  return { ok: true, data: undefined }
}
