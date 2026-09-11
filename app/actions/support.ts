"use server"

import { revalidatePath } from "next/cache"
import { requireOrgContext } from "@/lib/tenancy"
import { canAccessSupport } from "@/lib/access"
import { listInquiries, setInquiryStatus } from "@/lib/support/data"
import { isInquiryStatus, type InquiryStatus } from "@/lib/support/types"
import type { ActionResult } from "@/app/actions/properties"

// The support inbox is the RoboReady operator console's shared view of every
// inquiry Robo captured. Inquiries are platform-level (not org-scoped); only
// admins/owners may read and triage them.
export async function getInquiries() {
  const ctx = await requireOrgContext()
  if (!canAccessSupport(ctx.role)) throw new Error("FORBIDDEN")
  return listInquiries()
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!canAccessSupport(ctx.role)) return { ok: false, error: "You do not have permission to do that." }
  if (!isInquiryStatus(status)) return { ok: false, error: "Unknown status." }
  try {
    await setInquiryStatus(id, status)
    revalidatePath("/dashboard/support")
    return { ok: true, data: undefined }
  } catch (err) {
    console.log("[v0] updateInquiryStatus failed:", (err as Error).message)
    return { ok: false, error: "Could not update the inquiry." }
  }
}
