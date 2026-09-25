// RoboSearch Core — shared, client-safe types + taxonomy.
//
// This file has NO server-only dependencies so both the RoboSearch services
// and the RoboReady UI can import the same vocabulary. It is the contract of
// the detachable module: the canonical entity kinds, provenance vocabulary,
// the StaffGPT job kinds, and the shape of a discovery proposal.

export const ENTITY_KINDS = [
  "company",
  "robot",
  "autonomous_vehicle",
  "property",
  "location",
  "operator",
  "service",
  "infrastructure",
  "amenity",
  "media",
] as const
export type EntityKind = (typeof ENTITY_KINDS)[number]

export const ENTITY_KIND_LABELS: Record<EntityKind, string> = {
  company: "Company",
  robot: "Robot",
  autonomous_vehicle: "Autonomous vehicle",
  property: "Property",
  location: "Location",
  operator: "Operator",
  service: "Service",
  infrastructure: "Infrastructure",
  amenity: "Amenity",
  media: "Media",
}

// candidate → active is the promotion boundary a human controls.
export type EntityStatus = "candidate" | "active" | "merged" | "rejected"
export type ClaimStatus = "proposed" | "accepted" | "rejected" | "superseded"
export type Confidence = "low" | "medium" | "high"
export type Verification = "unverified" | "business_verified" | "roboready_verified"

export const VERIFICATION_LABELS: Record<Verification, string> = {
  unverified: "Unverified",
  business_verified: "Business verified",
  roboready_verified: "RoboReady verified",
}

// The formal StaffGPT ↔ RoboSearch job interface (strategy §15). Only
// DISCOVER_ENTITY is wired in this foundation pass; the rest are declared so
// the review surface and types are ready for follow-up flows.
export const JOB_KINDS = [
  "DISCOVER_ENTITY",
  "RESEARCH_ENTITY",
  "VERIFY_ENTITY",
  "RESOLVE_DUPLICATE",
  "ANALYZE_PROPERTY",
  "UPDATE_ENTITY",
  "CREATE_CONTENT",
  "FIND_LEADS",
  "ANALYZE_SEARCHES",
] as const
export type JobKind = (typeof JOB_KINDS)[number]

export type ResearchJobStatus = "queued" | "running" | "proposed" | "approved" | "rejected" | "failed"

// The structured proposal an AI research job produces and a human reviews. This
// is exactly what is stored in robosearch_research_job.proposal, mirroring the
// AI schema output but normalized (kind guaranteed valid, arrays clamped).
export type ProposedClaim = {
  predicate: string
  value: string
  confidence: Confidence
  evidence: string
  sourceUrl: string
  sourceTitle: string
}

export type ProposedEntity = {
  kind: EntityKind
  name: string
  summary: string
  confidence: Confidence
  claims: ProposedClaim[]
}

export type DiscoveryProposal = {
  interpretation: string
  note: string
  entities: ProposedEntity[]
}

// Read-model views returned by the core to callers (UI, actions).
export type RoboEntityView = {
  id: string
  kind: EntityKind
  canonicalName: string
  slug: string | null
  summary: string | null
  status: EntityStatus
  verification: Verification
  confidence: Confidence
  attributes: Record<string, unknown>
  createdAt: Date
}

export type RoboClaimView = {
  id: string
  predicate: string
  value: unknown
  confidence: Confidence
  verification: Verification
  evidence: string | null
  status: ClaimStatus
  sourceUrl: string | null
  sourceTitle: string | null
}

export type ResearchJobView = {
  id: string
  jobKind: JobKind
  status: ResearchJobStatus
  input: Record<string, unknown> | null
  proposal: DiscoveryProposal | null
  summary: string | null
  error: string | null
  employeeSlug: string | null
  promotedEntityCount: number
  createdByUserId: string
  reviewedByUserId: string | null
  reviewedAt: Date | null
  createdAt: Date
}

export type GraphCounts = {
  entities: number
  activeEntities: number
  candidateEntities: number
  claims: number
  awaitingVerification: number
  sources: number
  edges: number
  researchJobs: number
  proposalsAwaitingReview: number
}
