"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { siteSettings } from "@/lib/db/schema"
import { isAdminRole } from "@/lib/access"
import { getOrgContext, recordAudit } from "@/lib/tenancy"

export async function updateRoboDefaultOpen(defaultOpen: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof defaultOpen !== "boolean") {
    return { ok: false, error: "Invalid Robo display setting." }
  }

  const ctx = await getOrgContext()
  if (!ctx || !isAdminRole(ctx.role)) {
    return { ok: false, error: "You do not have permission to change this setting." }
  }

  const updatedAt = new Date()
  await db
    .insert(siteSettings)
    .values({
      id: "global",
      roboDefaultOpen: defaultOpen,
      updatedByUserId: ctx.user.id,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { roboDefaultOpen: defaultOpen, updatedByUserId: ctx.user.id, updatedAt },
    })

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "site_settings.robo_default_open_updated",
    entityType: "site_settings",
    entityId: "global",
    metadata: { defaultOpen },
  })

  revalidatePath("/dashboard/settings")
  return { ok: true }
}
