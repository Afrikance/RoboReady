"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { organization } from "@/lib/db/schema"
import { recordAudit, requireOrgContext } from "@/lib/tenancy"
import { canManageTeam } from "@/lib/access"
import type { ActionResult } from "@/app/actions/properties"

export async function removeOrgLogo(): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!canManageTeam(ctx.role)) return { ok: false, error: "You do not have permission to change the logo." }

  await db
    .update(organization)
    .set({ logoUrl: null, updatedAt: new Date() })
    .where(eq(organization.id, ctx.organizationId))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "organization.logo_removed",
    entityType: "organization",
    entityId: ctx.organizationId,
  })

  revalidatePath("/dashboard", "layout")
  return { ok: true, data: undefined }
}
