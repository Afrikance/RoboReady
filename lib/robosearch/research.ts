import "server-only"

import { and, count, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { robosearchResearchJob } from "@/lib/db/schema"
import { runJob } from "@/lib/ai/orchestrator"
import type { OrgContext } from "@/lib/tenancy"
import type { RobosearchDiscoveryOutput } from "@/lib/ai/schemas"

import { newId } from "./ids"
import { graphCounts, promoteProposal } from "./core"
import {
  ENTITY_KINDS,
  type DiscoveryProposal,
  type EntityKind,
  type GraphCounts,
  type JobKind,
  type ProposedEntity,
  type ResearchJobView,
} from "./types"

// ---------------------------------------------------------------------------
// RoboSearch research engine — the StaffGPT ↔ RoboGraph pipeline.
//
// A research job dispatches RoboSearch's AI workforce (via the StaffGPT
// `robosearch` department, with graceful AI-Gateway fallback), stores the
// result as a PROPOSAL, and stops. Nothing enters the graph until a human
// approves the proposal here (which calls core.promoteProposal). This is the
// operational expression of "AI may propose. Evidence establishes."
// ---------------------------------------------------------------------------

// The RoboSearch-family employee slug (routes to the `robosearch` StaffGPT
// department; the dispatch resolves to RoboScout there, AI-Gateway fallback
// uses this persona locally).
const DISCOVERY_EMPLOYEE = "network-navigator" as const

const MAX_ENTITIES = 12
const MAX_CLAIMS = 10

function clampConfidence(v: unknown): "low" | "medium" | "high" {
  return v === "high" || v === "medium" ? v : "low"
}

function isEntityKind(value: string): value is EntityKind {
  return (ENTITY_KINDS as readonly string[]).includes(value)
}

/** Normalizes the raw AI output into a stored proposal (kinds validated, arrays clamped). */
function normalizeProposal(raw: RobosearchDiscoveryOutput): DiscoveryProposal {
  const entities: ProposedEntity[] = (raw.entities ?? [])
    .filter((e) => e?.name && isEntityKind(e.kind))
    .slice(0, MAX_ENTITIES)
    .map((e) => ({
      kind: e.kind as EntityKind,
      name: String(e.name).slice(0, 200),
      summary: String(e.summary ?? "").slice(0, 600),
      confidence: clampConfidence(e.confidence),
      claims: (e.claims ?? []).slice(0, MAX_CLAIMS).map((c) => ({
        predicate: String(c.predicate ?? "").slice(0, 80),
        value: String(c.value ?? "").slice(0, 400),
        confidence: clampConfidence(c.confidence),
        evidence: String(c.evidence ?? "").slice(0, 600),
        sourceUrl: String(c.sourceUrl ?? "").slice(0, 500),
        sourceTitle: String(c.sourceTitle ?? "").slice(0, 200),
      })),
    }))
  return {
    interpretation: String(raw.interpretation ?? "").slice(0, 600),
    note: String(raw.note ?? "").slice(0, 800),
    entities,
  }
}

function toJobView(row: typeof robosearchResearchJob.$inferSelect): ResearchJobView {
  return {
    id: row.id,
    jobKind: row.jobKind as JobKind,
    status: row.status as ResearchJobView["status"],
    input: (row.input as Record<string, unknown>) ?? null,
    proposal: (row.proposal as DiscoveryProposal) ?? null,
    summary: row.summary,
    error: row.error,
    employeeSlug: row.employeeSlug,
    promotedEntityCount: row.promotedEntityCount,
    createdByUserId: row.createdByUserId,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
  }
}

export async function listResearchJobs(ctx: OrgContext, limit = 50): Promise<ResearchJobView[]> {
  const rows = await db
    .select()
    .from(robosearchResearchJob)
    .where(eq(robosearchResearchJob.organizationId, ctx.organizationId))
    .orderBy(desc(robosearchResearchJob.createdAt))
    .limit(Math.min(limit, 200))
  return rows.map(toJobView)
}

export async function getResearchJob(ctx: OrgContext, id: string): Promise<ResearchJobView | null> {
  const [row] = await db
    .select()
    .from(robosearchResearchJob)
    .where(and(eq(robosearchResearchJob.id, id), eq(robosearchResearchJob.organizationId, ctx.organizationId)))
    .limit(1)
  return row ? toJobView(row) : null
}

/** graphCounts + the research-job counts (kept here to avoid a circular import in core). */
export async function robosearchOverview(ctx: OrgContext): Promise<GraphCounts> {
  const [base, [jobs], [pending]] = await Promise.all([
    graphCounts(),
    db
      .select({ n: count() })
      .from(robosearchResearchJob)
      .where(eq(robosearchResearchJob.organizationId, ctx.organizationId)),
    db
      .select({ n: count() })
      .from(robosearchResearchJob)
      .where(
        and(
          eq(robosearchResearchJob.organizationId, ctx.organizationId),
          eq(robosearchResearchJob.status, "proposed"),
        ),
      ),
  ])
  return { ...base, researchJobs: jobs?.n ?? 0, proposalsAwaitingReview: pending?.n ?? 0 }
}

export type DiscoveryInput = { market: string; entityKind: EntityKind; count: number }

/**
 * Runs a DISCOVER_ENTITY research job: dispatch RoboScout, store the proposal,
 * and STOP at status `proposed`. Never writes to the graph. Returns the job id
 * so the caller can route the reviewer to it.
 */
export async function runDiscovery(ctx: OrgContext, input: DiscoveryInput): Promise<ResearchJobView> {
  const jobId = newId()
  const now = new Date()
  const market = input.market.trim().slice(0, 200)
  const entityKind = isEntityKind(input.entityKind) ? input.entityKind : "company"
  const wanted = Math.max(1, Math.min(Math.round(input.count || 6), MAX_ENTITIES))

  await db.insert(robosearchResearchJob).values({
    id: jobId,
    organizationId: ctx.organizationId,
    jobKind: "DISCOVER_ENTITY",
    status: "running",
    input: { market, entityKind, count: wanted },
    employeeSlug: DISCOVERY_EMPLOYEE,
    createdByUserId: ctx.user.id,
  })

  try {
    const result = await runJob<DiscoveryInput, RobosearchDiscoveryOutput>({
      ctx,
      employeeSlug: DISCOVERY_EMPLOYEE,
      jobType: "discover-entity",
      input: { market, entityKind, count: wanted },
    })
    const proposal = normalizeProposal(result.output)
    await db
      .update(robosearchResearchJob)
      .set({
        status: "proposed",
        proposal,
        aiJobId: result.jobId,
        summary: proposal.interpretation || `Discovered ${proposal.entities.length} candidate ${entityKind}(s).`,
        updatedAt: new Date(),
      })
      .where(eq(robosearchResearchJob.id, jobId))
  } catch (err) {
    const message = (err as Error).message
    console.log("[v0] RoboSearch discovery failed:", jobId, message)
    await db
      .update(robosearchResearchJob)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(robosearchResearchJob.id, jobId))
  }

  const view = await getResearchJob(ctx, jobId)
  if (!view) throw new Error("Research job vanished after creation.")
  return view
}

/**
 * Human approval: promotes the stored proposal into the RoboGraph, then marks
 * the job approved. Idempotent-guarded — only a `proposed` job can be approved.
 */
export async function approveResearchJob(ctx: OrgContext, jobId: string): Promise<ResearchJobView> {
  const job = await getResearchJob(ctx, jobId)
  if (!job) throw new Error("Research job not found.")
  if (job.status !== "proposed") throw new Error("Only a proposed job can be approved.")
  if (!job.proposal) throw new Error("This job has no proposal to promote.")

  const promoted = await promoteProposal({ proposal: job.proposal, jobId, reviewerUserId: ctx.user.id })
  await db
    .update(robosearchResearchJob)
    .set({
      status: "approved",
      promotedEntityCount: promoted,
      reviewedByUserId: ctx.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(robosearchResearchJob.id, jobId))
  const view = await getResearchJob(ctx, jobId)
  return view as ResearchJobView
}

export async function rejectResearchJob(ctx: OrgContext, jobId: string): Promise<ResearchJobView> {
  const job = await getResearchJob(ctx, jobId)
  if (!job) throw new Error("Research job not found.")
  if (job.status !== "proposed") throw new Error("Only a proposed job can be rejected.")
  await db
    .update(robosearchResearchJob)
    .set({ status: "rejected", reviewedByUserId: ctx.user.id, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(robosearchResearchJob.id, jobId))
  const view = await getResearchJob(ctx, jobId)
  return view as ResearchJobView
}
