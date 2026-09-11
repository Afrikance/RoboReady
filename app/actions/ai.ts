"use server"

import { desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { aiJob } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { assertRole, requireOrgContext } from "@/lib/tenancy"
import { approveJob } from "@/lib/ai/orchestrator"
import type { ActionResult } from "@/app/actions/properties"

export async function listActivity() {
  const ctx = await requireOrgContext()
  return db
    .select()
    .from(aiJob)
    .where(eq(aiJob.organizationId, ctx.organizationId))
    .orderBy(desc(aiJob.createdAt))
}

export async function approveAiJob(jobId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "admin")
  } catch {
    return { ok: false, error: "Only admins and owners can approve AI output." }
  }
  try {
    await approveJob(ctx, jobId)
  } catch {
    return { ok: false, error: "Could not approve this job." }
  }
  revalidatePath("/dashboard/activity")
  return { ok: true, data: undefined }
}
