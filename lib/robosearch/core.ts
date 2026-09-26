import "server-only"

import { and, count, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  robosearchClaim,
  robosearchEdge,
  robosearchEntity,
  robosearchResearchJob,
  robosearchSource,
} from "@/lib/db/schema"
import type { OrgContext } from "@/lib/tenancy"

import { dedupeKey, newId, slugify } from "./ids"
import { findDuplicateCandidates, type DuplicateCandidate } from "./resolution"
import type {
  Confidence,
  DiscoveryProposal,
  EntityKind,
  GraphCounts,
  RoboClaimView,
  RoboEntityView,
} from "./types"
import { ENTITY_KINDS } from "./types"

// ---------------------------------------------------------------------------
// RoboSearch Core — the RoboGraph store.
//
// This is the module's data boundary. It is the ONLY place that reads/writes
// the robosearch_* tables, so the graph could later move behind a service API
// without touching callers ("detach test"). It never touches RoboReady's
// operational tables. Promotion of AI proposals into the graph lives here and
// is the single enforcement point for "AI may propose. Evidence establishes."
// ---------------------------------------------------------------------------

function isEntityKind(value: string): value is EntityKind {
  return (ENTITY_KINDS as readonly string[]).includes(value)
}

function toEntityView(row: typeof robosearchEntity.$inferSelect): RoboEntityView {
  return {
    id: row.id,
    kind: row.kind as EntityKind,
    canonicalName: row.canonicalName,
    slug: row.slug,
    summary: row.summary,
    status: row.status as RoboEntityView["status"],
    verification: row.verification as RoboEntityView["verification"],
    confidence: row.confidence as Confidence,
    attributes: (row.attributes as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
  }
}

export type EntityFilter = {
  kind?: EntityKind
  status?: RoboEntityView["status"]
  limit?: number
}

/** Lists entities in the graph, newest first. Defaults to active entities. */
export async function listEntities(filter: EntityFilter = {}): Promise<RoboEntityView[]> {
  const conditions = []
  if (filter.kind) conditions.push(eq(robosearchEntity.kind, filter.kind))
  if (filter.status) conditions.push(eq(robosearchEntity.status, filter.status))
  const rows = await db
    .select()
    .from(robosearchEntity)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(robosearchEntity.createdAt))
    .limit(Math.min(filter.limit ?? 200, 500))
  return rows.map(toEntityView)
}

export async function getEntity(
  id: string,
): Promise<{ entity: RoboEntityView; claims: RoboClaimView[] } | null> {
  const [row] = await db.select().from(robosearchEntity).where(eq(robosearchEntity.id, id)).limit(1)
  if (!row) return null
  const claimRows = await db
    .select({
      claim: robosearchClaim,
      source: robosearchSource,
    })
    .from(robosearchClaim)
    .leftJoin(robosearchSource, eq(robosearchClaim.sourceId, robosearchSource.id))
    .where(eq(robosearchClaim.entityId, id))
    .orderBy(desc(robosearchClaim.createdAt))
  const claims: RoboClaimView[] = claimRows.map(({ claim, source }) => ({
    id: claim.id,
    predicate: claim.predicate,
    value: claim.objectValue,
    confidence: claim.confidence as Confidence,
    verification: claim.verification as RoboClaimView["verification"],
    evidence: claim.evidence,
    status: claim.status as RoboClaimView["status"],
    sourceUrl: source?.url ?? null,
    sourceTitle: source?.title ?? null,
  }))
  return { entity: toEntityView(row), claims }
}

/** Aggregate counts for the RoboOps dashboard header. */
export async function graphCounts(): Promise<GraphCounts> {
  const [
    [entities],
    [active],
    [candidates],
    [claims],
    [unverifiedClaims],
    [sources],
    [edges],
  ] = await Promise.all([
    db.select({ n: count() }).from(robosearchEntity),
    db.select({ n: count() }).from(robosearchEntity).where(eq(robosearchEntity.status, "active")),
    db.select({ n: count() }).from(robosearchEntity).where(eq(robosearchEntity.status, "candidate")),
    db.select({ n: count() }).from(robosearchClaim),
    db.select({ n: count() }).from(robosearchClaim).where(eq(robosearchClaim.verification, "unverified")),
    db.select({ n: count() }).from(robosearchSource),
    db.select({ n: count() }).from(robosearchEdge),
  ])
  return {
    entities: entities?.n ?? 0,
    activeEntities: active?.n ?? 0,
    candidateEntities: candidates?.n ?? 0,
    claims: claims?.n ?? 0,
    awaitingVerification: unverifiedClaims?.n ?? 0,
    sources: sources?.n ?? 0,
    edges: edges?.n ?? 0,
    // Filled by the research layer to avoid a circular import.
    researchJobs: 0,
    proposalsAwaitingReview: 0,
  }
}

/**
 * Promotes a reviewed discovery proposal into the RoboGraph. Called ONLY after
 * a human approves the research job. For each proposed entity it:
 *  - resolves against existing active entities by dedupeKey (kind + name),
 *    reusing the survivor instead of creating a duplicate;
 *  - creates the entity as `active` (verification stays `unverified` —
 *    promotion establishes existence, not verification);
 *  - records each claim with its own source, confidence, and evidence as
 *    `accepted`, and folds scalar claims into the entity's attributes for fast
 *    filtering.
 * Returns the number of entities promoted (created or enriched).
 */
export async function promoteProposal(args: {
  proposal: DiscoveryProposal
  jobId: string
  reviewerUserId: string
}): Promise<number> {
  const { proposal, jobId, reviewerUserId } = args
  const now = new Date()
  let promoted = 0

  for (const proposed of proposal.entities ?? []) {
    if (!proposed?.name || !isEntityKind(proposed.kind)) continue
    const key = dedupeKey(proposed.name)

    // Entity resolution (lite): reuse an existing active entity of the same
    // kind + normalized name rather than creating a duplicate.
    const [existing] = await db
      .select()
      .from(robosearchEntity)
      .where(
        and(
          eq(robosearchEntity.kind, proposed.kind),
          eq(robosearchEntity.dedupeKey, key),
          eq(robosearchEntity.status, "active"),
        ),
      )
      .limit(1)

    const attributes: Record<string, unknown> = existing
      ? { ...((existing.attributes as Record<string, unknown>) ?? {}) }
      : {}
    for (const claim of proposed.claims ?? []) {
      if (claim?.predicate && claim.value != null) attributes[claim.predicate] = claim.value
    }

    let entityId: string
    if (existing) {
      entityId = existing.id
      await db
        .update(robosearchEntity)
        .set({ attributes, reviewedByUserId: reviewerUserId, reviewedAt: now, updatedAt: now })
        .where(eq(robosearchEntity.id, existing.id))
    } else {
      entityId = newId()
      await db.insert(robosearchEntity).values({
        id: entityId,
        kind: proposed.kind,
        canonicalName: proposed.name,
        slug: slugify(proposed.name),
        summary: proposed.summary ?? null,
        attributes,
        status: "active",
        verification: "unverified",
        confidence: proposed.confidence ?? "low",
        dedupeKey: key,
        discoveredByJobId: jobId,
        reviewedByUserId: reviewerUserId,
        reviewedAt: now,
      })
    }

    for (const claim of proposed.claims ?? []) {
      if (!claim?.predicate) continue
      let sourceId: string | null = null
      const hasUrl = typeof claim.sourceUrl === "string" && claim.sourceUrl.trim().length > 0
      const sid = newId()
      await db.insert(robosearchSource).values({
        id: sid,
        url: hasUrl ? claim.sourceUrl.trim() : null,
        title: claim.sourceTitle?.trim() || null,
        sourceType: hasUrl ? "website" : "ai_inference",
        snapshot: claim.evidence ?? null,
        retrievedAt: now,
      })
      sourceId = sid

      await db.insert(robosearchClaim).values({
        id: newId(),
        entityId,
        predicate: claim.predicate,
        objectValue: claim.value ?? null,
        sourceId,
        confidence: claim.confidence ?? "low",
        verification: "unverified",
        evidence: claim.evidence ?? null,
        status: "accepted",
        discoveredAt: now,
        lastCheckedAt: now,
        createdByJobId: jobId,
        reviewedByUserId: reviewerUserId,
        reviewedAt: now,
      })
    }
    promoted += 1
  }

  return promoted
}

function duplicatePairKey(leftId: string, rightId: string): string {
  return [leftId, rightId].sort().join(":")
}

/** Returns likely duplicate pairs, excluding pairs this organization dismissed. */
export async function listDuplicateCandidates(ctx: OrgContext): Promise<DuplicateCandidate[]> {
  const [entities, decisions] = await Promise.all([
    listEntities({ limit: 500 }),
    db
      .select({ input: robosearchResearchJob.input })
      .from(robosearchResearchJob)
      .where(
        and(
          eq(robosearchResearchJob.organizationId, ctx.organizationId),
          eq(robosearchResearchJob.jobKind, "RESOLVE_DUPLICATE"),
        ),
      )
      .orderBy(desc(robosearchResearchJob.createdAt))
      .limit(2000),
  ])

  const dismissed = new Set<string>()
  for (const { input } of decisions) {
    if (!input || typeof input !== "object") continue
    const record = input as Record<string, unknown>
    if (record.action !== "not_duplicate") continue
    if (typeof record.leftEntityId !== "string" || typeof record.rightEntityId !== "string") continue
    dismissed.add(duplicatePairKey(record.leftEntityId, record.rightEntityId))
  }

  return findDuplicateCandidates(entities, 0.76, 250).filter(
    ({ left, right }) => !dismissed.has(duplicatePairKey(left.id, right.id)),
  )
}

/** Merges one entity into a chosen survivor and records the review atomically. */
export async function mergeDuplicateEntities(
  ctx: OrgContext,
  survivorId: string,
  duplicateId: string,
): Promise<void> {
  if (!survivorId || !duplicateId || survivorId === duplicateId) {
    throw new Error("Choose two different entities to merge.")
  }

  await db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(robosearchEntity)
      .where(inArray(robosearchEntity.id, [survivorId, duplicateId].sort()))
      .orderBy(robosearchEntity.id)
      .for("update")
    const survivor = locked.find((entity) => entity.id === survivorId)
    const duplicate = locked.find((entity) => entity.id === duplicateId)
    if (!survivor || !duplicate) throw new Error("One of these entities no longer exists.")
    if (survivor.kind !== duplicate.kind) throw new Error("Only entities of the same kind can be merged.")
    if (!(["active", "candidate"] as string[]).includes(survivor.status)) {
      throw new Error("The selected survivor is no longer active.")
    }
    if (!(["active", "candidate"] as string[]).includes(duplicate.status)) {
      throw new Error("The selected duplicate has already been resolved.")
    }

    const survivorAttributes = (survivor.attributes as Record<string, unknown>) ?? {}
    const duplicateAttributes = (duplicate.attributes as Record<string, unknown>) ?? {}
    const mergedAttributes = { ...duplicateAttributes, ...survivorAttributes }
    const confidenceRank: Record<string, number> = { low: 0, medium: 1, high: 2 }
    const verificationRank: Record<string, number> = {
      unverified: 0,
      business_verified: 1,
      roboready_verified: 2,
    }
    const confidence =
      (confidenceRank[duplicate.confidence] ?? 0) > (confidenceRank[survivor.confidence] ?? 0)
        ? duplicate.confidence
        : survivor.confidence
    const verification =
      (verificationRank[duplicate.verification] ?? 0) > (verificationRank[survivor.verification] ?? 0)
        ? duplicate.verification
        : survivor.verification
    const now = new Date()

    await tx
      .update(robosearchEntity)
      .set({
        attributes: mergedAttributes,
        summary: survivor.summary ?? duplicate.summary,
        status: survivor.status === "active" || duplicate.status === "active" ? "active" : "candidate",
        confidence,
        verification,
        updatedAt: now,
      })
      .where(eq(robosearchEntity.id, survivorId))
    await tx
      .update(robosearchClaim)
      .set({ entityId: survivorId, updatedAt: now })
      .where(eq(robosearchClaim.entityId, duplicateId))
    await tx
      .update(robosearchEdge)
      .set({ subjectEntityId: survivorId })
      .where(eq(robosearchEdge.subjectEntityId, duplicateId))
    await tx
      .update(robosearchEdge)
      .set({ objectEntityId: survivorId })
      .where(eq(robosearchEdge.objectEntityId, duplicateId))
    await tx
      .update(robosearchEntity)
      .set({ status: "merged", mergedIntoId: survivorId, updatedAt: now })
      .where(eq(robosearchEntity.id, duplicateId))
    await tx.insert(robosearchResearchJob).values({
      id: newId(),
      organizationId: ctx.organizationId,
      jobKind: "RESOLVE_DUPLICATE",
      status: "approved",
      input: { action: "merge", survivorId, duplicateId },
      summary: `Merged ${duplicate.canonicalName} into ${survivor.canonicalName}.`,
      promotedEntityCount: 1,
      createdByUserId: ctx.user.id,
      reviewedByUserId: ctx.user.id,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  })
}

/** Records a human decision that a suggested pair represents distinct entities. */
export async function dismissDuplicatePair(
  ctx: OrgContext,
  leftId: string,
  rightId: string,
): Promise<void> {
  if (!leftId || !rightId || leftId === rightId) throw new Error("Choose two different entities.")
  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(robosearchEntity)
      .where(inArray(robosearchEntity.id, [leftId, rightId].sort()))
      .orderBy(robosearchEntity.id)
      .for("update")
    const left = rows.find((entity) => entity.id === leftId)
    const right = rows.find((entity) => entity.id === rightId)
    if (!left || !right) throw new Error("One of these entities no longer exists.")
    if (left.kind !== right.kind) throw new Error("Only entities of the same kind can be compared.")
    if (!["active", "candidate"].includes(left.status) || !["active", "candidate"].includes(right.status)) {
      throw new Error("This pair has already been resolved.")
    }

    const now = new Date()
    await tx.insert(robosearchResearchJob).values({
      id: newId(),
      organizationId: ctx.organizationId,
      jobKind: "RESOLVE_DUPLICATE",
      status: "rejected",
      input: { action: "not_duplicate", leftEntityId: leftId, rightEntityId: rightId },
      summary: `Kept ${left.canonicalName} and ${right.canonicalName} as distinct entities.`,
      createdByUserId: ctx.user.id,
      reviewedByUserId: ctx.user.id,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  })
}
