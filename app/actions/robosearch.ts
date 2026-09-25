"use server"

import { revalidatePath } from "next/cache"

import { getOrgContext } from "@/lib/tenancy"
import { isAdminRole } from "@/lib/access"
import {
  approveResearchJob,
  rejectResearchJob,
  runDiscovery,
  type DiscoveryInput,
} from "@/lib/robosearch/research"
import { ENTITY_KINDS, type EntityKind, type ResearchJobView } from "@/lib/robosearch/types"

export type RobosearchActionResult =
  | { ok: true; job: ResearchJobView }
  | { ok: false; reason: "signin" | "forbidden" | "invalid" | "error"; message: string }

function isEntityKind(value: string): value is EntityKind {
  return (ENTITY_KINDS as readonly string[]).includes(value)
}

/**
 * Kicks off a RoboSearch discovery job. Admin/owner only — this writes AI
 * proposals into the RoboGraph review queue. The job stops at `proposed`;
 * nothing enters the graph until it is approved.
 */
export async function startDiscovery(formData: FormData): Promise<RobosearchActionResult> {
  const ctx = await getOrgContext()
  if (!ctx) return { ok: false, reason: "signin", message: "Sign in to run RoboSearch." }
  if (!isAdminRole(ctx.role)) {
    return { ok: false, reason: "forbidden", message: "RoboSearch is an admin-only tool." }
  }

  const market = String(formData.get("market") ?? "").trim()
  const kindRaw = String(formData.get("entityKind") ?? "company").trim()
  const countRaw = Number(formData.get("count") ?? 6)

  if (market.length < 2) {
    return { ok: false, reason: "invalid", message: "Describe the market or region to search." }
  }
  const input: DiscoveryInput = {
    market,
    entityKind: isEntityKind(kindRaw) ? kindRaw : "company",
    count: Number.isFinite(countRaw) ? countRaw : 6,
  }

  try {
    const job = await runDiscovery(ctx, input)
    revalidatePath("/dashboard/robosearch")
    return { ok: true, job }
  } catch (err) {
    console.log("[v0] startDiscovery failed:", (err as Error).message)
    return { ok: false, reason: "error", message: "RoboSearch could not complete this run." }
  }
}

export async function approveDiscovery(jobId: string): Promise<RobosearchActionResult> {
  const ctx = await getOrgContext()
  if (!ctx) return { ok: false, reason: "signin", message: "Sign in to review proposals." }
  if (!isAdminRole(ctx.role)) {
    return { ok: false, reason: "forbidden", message: "Only admins can approve proposals." }
  }
  try {
    const job = await approveResearchJob(ctx, jobId)
    revalidatePath("/dashboard/robosearch")
    return { ok: true, job }
  } catch (err) {
    return { ok: false, reason: "error", message: (err as Error).message }
  }
}

export async function rejectDiscovery(jobId: string): Promise<RobosearchActionResult> {
  const ctx = await getOrgContext()
  if (!ctx) return { ok: false, reason: "signin", message: "Sign in to review proposals." }
  if (!isAdminRole(ctx.role)) {
    return { ok: false, reason: "forbidden", message: "Only admins can reject proposals." }
  }
  try {
    const job = await rejectResearchJob(ctx, jobId)
    revalidatePath("/dashboard/robosearch")
    return { ok: true, job }
  } catch (err) {
    return { ok: false, reason: "error", message: (err as Error).message }
  }
}
