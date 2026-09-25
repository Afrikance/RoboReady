import "server-only"

import { and, count, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { robosearchClaim, robosearchEdge, robosearchEntity, robosearchSource } from "@/lib/db/schema"

import { dedupeKey, newId, slugify } from "./ids"
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
