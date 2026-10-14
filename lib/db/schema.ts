import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

// ---------------------------------------------------------------------------
// Better Auth tables (camelCase columns are required by Better Auth defaults)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  phone: text("phone"),
  addressLine1: text("addressLine1"),
  addressLine2: text("addressLine2"),
  city: text("city"),
  region: text("region"),
  postalCode: text("postalCode"),
  country: text("country"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const solutionPartner = pgTable(
  "solution_partner",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
    coverage: jsonb("coverage")
      .$type<{ nationwide: boolean; country: string | null; areas: string[] }>()
      .notNull()
      .default({ nationwide: false, country: null, areas: [] }),
    contactName: text("contactName"),
    contactEmail: text("contactEmail"),
    contactPhone: text("contactPhone"),
    active: boolean("active").notNull().default(true),
    roboticsSourceStatus: text("roboticsSourceStatus").notNull().default("unverified"),
    roboticsSourceType: text("roboticsSourceType").notNull().default("integrator"),
    roboticsSourcePriority: integer("roboticsSourcePriority").notNull().default(100),
    createdByUserId: text("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    orgActive: index("solution_partner_org_active_idx").on(t.organizationId, t.active),
    orgRoboticsSource: index("solution_partner_org_robotics_source_idx").on(t.organizationId, t.roboticsSourceStatus, t.roboticsSourcePriority),
    validCategory: check("solution_partner_category_check", sql`${t.category} IN ('robotics', 'charging', 'both')`),
    capabilitiesArray: check("solution_partner_capabilities_check", sql`jsonb_typeof(${t.capabilities}) = 'array'`),
    coverageObject: check("solution_partner_coverage_check", sql`jsonb_typeof(${t.coverage}) = 'object'`),
    validRoboticsSourceStatus: check("solution_partner_robotics_status_check", sql`${t.roboticsSourceStatus} IN ('unverified', 'paused', 'participating', 'full_partner')`),
    validRoboticsSourceType: check("solution_partner_robotics_type_check", sql`${t.roboticsSourceType} IN ('manufacturer', 'distributor', 'retailer', 'rental', 'raas', 'integrator')`),
    validRoboticsSourcePriority: check("solution_partner_robotics_priority_check", sql`${t.roboticsSourcePriority} >= 0`),
  }),
)

export type RoboticsVerificationStatus = "verified" | "unverified" | "unknown"
export type RoboticsSourceType = "manufacturer" | "distributor" | "retailer" | "rental" | "raas" | "integrator"
export type RoboticsCollaborationStatus =
  | "consent_pending"
  | "selected"
  | "shared"
  | "source_response"
  | "fit_confirmed"
  | "fit_rejected"
  | "pilot_planning"
  | "pilot_in_progress"
  | "pilot_completed"
  | "deployment_planning"
  | "deployment_in_progress"
  | "deployment_completed"
  | "closed"
  | "owner_declined"
  | "withdrawn"

export type RoboticsMatchOffer = {
  offeringId: string
  partnerId: string
  partnerName: string
  sourceType: RoboticsSourceType
  partnershipStatus: "full_partner" | "participating" | "paused" | "unverified"
  sourcePriority: number
  availability: string
  sourceUrl: string | null
  lastVerifiedAt: string | null
  matchReasons: string[]
  unmetRequirements: string[]
  unknownEvidence: string[]
}

export type RoboticsMatchCandidate = {
  modelId: string
  manufacturerName: string
  modelName: string
  category: string
  eligible: boolean
  fitScore: number
  matchReasons: string[]
  unmetRequirements: string[]
  unknownEvidence: string[]
  roboticsAssessmentEvidence: Array<{ keyPointId: string; points: number; explanation: string; evidence: string[]; confidence: string }>
  offers: RoboticsMatchOffer[]
}

export type RoboticsRecommendationResults = {
  outcome: "verified_fit" | "follow_up_required" | "no_verified_fit"
  candidates: RoboticsMatchCandidate[]
  summary: string
  generatedAt: string
}

export type RoboticsConsentScope = {
  providerName: string
  modelName: string
  includedFields: string[]
  excludedFields: string[]
  overrideBasis: "partner_unable" | "owner_requested" | null
  overrideReason: string | null
}

export type RoboticsSharedSnapshot = {
  property: { name: string; city: string | null; region: string | null; country: string | null }
  requirements: Record<string, unknown>
  assessment: Record<string, unknown>
  model: { manufacturerName: string; modelName: string; category: string; productUrl: string | null }
  offering: { sourceName: string; sourceType: string; availability: string; sourceUrl: string | null }
  preparedAt: string
}

export const roboticsManufacturer = pgTable(
  "robotics_manufacturer",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    websiteUrl: text("websiteUrl"),
    country: text("country"),
    verificationStatus: text("verificationStatus").$type<RoboticsVerificationStatus>().notNull().default("unverified"),
    lastVerifiedAt: timestamp("lastVerifiedAt"),
    createdByUserId: text("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    orgName: index("robotics_manufacturer_org_name_idx").on(t.organizationId, t.name),
    validStatus: check("robotics_manufacturer_status_check", sql`${t.verificationStatus} IN ('verified', 'unverified', 'unknown')`),
  }),
)

export const roboticsModel = pgTable(
  "robotics_model",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    manufacturerId: text("manufacturerId").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    productUrl: text("productUrl"),
    commercialStatus: text("commercialStatus").notNull().default("unknown"),
    verificationStatus: text("verificationStatus").$type<RoboticsVerificationStatus>().notNull().default("unverified"),
    lastVerifiedAt: timestamp("lastVerifiedAt"),
    createdByUserId: text("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    orgManufacturer: index("robotics_model_org_manufacturer_idx").on(t.organizationId, t.manufacturerId),
    orgStatus: index("robotics_model_org_status_idx").on(t.organizationId, t.verificationStatus),
    validCommercialStatus: check("robotics_model_commercial_status_check", sql`${t.commercialStatus} IN ('commercial', 'pilot', 'preorder', 'prototype', 'retired', 'unknown')`),
    validStatus: check("robotics_model_status_check", sql`${t.verificationStatus} IN ('verified', 'unverified', 'unknown')`),
  }),
)

export const roboticsModelCapability = pgTable(
  "robotics_model_capability",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    modelId: text("modelId").notNull(),
    capabilityKey: text("capabilityKey").notNull(),
    capabilityValue: text("capabilityValue"),
    evidenceUrl: text("evidenceUrl"),
    evidenceTitle: text("evidenceTitle"),
    verificationStatus: text("verificationStatus").$type<RoboticsVerificationStatus>().notNull().default("unknown"),
    confidence: integer("confidence"),
    lastVerifiedAt: timestamp("lastVerifiedAt"),
    createdByUserId: text("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    modelStatus: index("robotics_model_capability_model_idx").on(t.organizationId, t.modelId, t.verificationStatus),
    confidenceRange: check("robotics_model_capability_confidence_check", sql`${t.confidence} IS NULL OR ${t.confidence} BETWEEN 0 AND 100`),
    verifiedEvidence: check("robotics_model_capability_verified_evidence_check", sql`${t.verificationStatus} <> 'verified' OR (${t.evidenceUrl} IS NOT NULL AND ${t.lastVerifiedAt} IS NOT NULL)`),
  }),
)

export const roboticsSourceOffering = pgTable(
  "robotics_source_offering",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    partnerId: text("partnerId").notNull(),
    modelId: text("modelId").notNull(),
    sourceType: text("sourceType").$type<RoboticsSourceType>().notNull(),
    sourceUrl: text("sourceUrl"),
    availability: text("availability").notNull().default("unknown"),
    priceCents: integer("priceCents"),
    priceCurrency: text("priceCurrency"),
    priceBasis: text("priceBasis"),
    pricingEvidenceUrl: text("pricingEvidenceUrl"),
    verificationStatus: text("verificationStatus").$type<RoboticsVerificationStatus>().notNull().default("unverified"),
    lastVerifiedAt: timestamp("lastVerifiedAt"),
    createdByUserId: text("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    orgModel: index("robotics_source_offering_org_model_idx").on(t.organizationId, t.modelId),
    orgPartner: index("robotics_source_offering_org_partner_idx").on(t.organizationId, t.partnerId),
    validSourceType: check("robotics_source_offering_type_check", sql`${t.sourceType} IN ('manufacturer', 'distributor', 'retailer', 'rental', 'raas', 'integrator')`),
    validAvailability: check("robotics_source_offering_availability_check", sql`${t.availability} IN ('available', 'pilot', 'preorder', 'waitlist', 'unavailable', 'unknown')`),
    validPrice: check("robotics_source_offering_price_check", sql`${t.priceCents} IS NULL OR ${t.priceCents} >= 0`),
    validPriceBasis: check("robotics_source_offering_price_basis_check", sql`${t.priceBasis} IS NULL OR ${t.priceBasis} IN ('one_time', 'monthly', 'annual', 'quote')`),
    validStatus: check("robotics_source_offering_status_check", sql`${t.verificationStatus} IN ('verified', 'unverified', 'unknown')`),
    verifiedEvidence: check("robotics_source_offering_verified_evidence_check", sql`${t.verificationStatus} <> 'verified' OR (${t.sourceUrl} IS NOT NULL AND ${t.lastVerifiedAt} IS NOT NULL)`),
  }),
)

export const roboticsRecommendationRun = pgTable(
  "robotics_recommendation_run",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    interestId: text("interestId").notNull(),
    assessmentId: text("assessmentId").notNull(),
    assessmentVersion: integer("assessmentVersion").notNull(),
    runNumber: integer("runNumber").notNull(),
    status: text("status").notNull().default("current"),
    reason: text("reason"),
    interestSnapshot: jsonb("interestSnapshot").$type<Record<string, unknown>>().notNull(),
    assessmentSnapshot: jsonb("assessmentSnapshot").$type<Record<string, unknown>>().notNull(),
    results: jsonb("results").$type<RoboticsRecommendationResults>().notNull().default({ outcome: "no_verified_fit", candidates: [], summary: "", generatedAt: "" }),
    createdByUserId: text("createdByUserId"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    supersededAt: timestamp("supersededAt"),
  },
  (t) => ({
    orgInterestCreated: index("robotics_recommendation_run_interest_created_idx").on(t.organizationId, t.interestId, t.createdAt),
    interestRunNumber: unique().on(t.organizationId, t.interestId, t.runNumber),
    validStatus: check("robotics_recommendation_run_status_check", sql`${t.status} IN ('current', 'superseded')`),
    positiveRunNumber: check("robotics_recommendation_run_number_check", sql`${t.runNumber} > 0`),
    snapshotsObject: check("robotics_recommendation_run_snapshots_check", sql`jsonb_typeof(${t.interestSnapshot}) = 'object' AND jsonb_typeof(${t.assessmentSnapshot}) = 'object' AND jsonb_typeof(${t.results}) = 'object'`),
  }),
)

export const roboticsSourceCollaboration = pgTable(
  "robotics_source_collaboration",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    interestId: text("interestId").notNull(),
    recommendationRunId: text("recommendationRunId").notNull(),
    assessmentId: text("assessmentId").notNull(),
    modelId: text("modelId").notNull(),
    offeringId: text("offeringId").notNull(),
    partnerId: text("partnerId").notNull(),
    status: text("status").$type<RoboticsCollaborationStatus>().notNull().default("consent_pending"),
    consentScope: jsonb("consentScope").$type<RoboticsConsentScope>().notNull(),
    ownerConsentAt: timestamp("ownerConsentAt"),
    ownerConsentByUserId: text("ownerConsentByUserId"),
    ownerConsentDecision: text("ownerConsentDecision"),
    ownerConsentMethod: text("ownerConsentMethod"),
    ownerConsentReference: text("ownerConsentReference"),
    overrideBasis: text("overrideBasis"),
    overrideReason: text("overrideReason"),
    selectedByAdminUserId: text("selectedByAdminUserId").notNull(),
    sharedAt: timestamp("sharedAt"),
    sharedByUserId: text("sharedByUserId"),
    shareMethod: text("shareMethod"),
    shareReference: text("shareReference"),
    sharedSnapshot: jsonb("sharedSnapshot").$type<RoboticsSharedSnapshot>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    orgInterest: index("robotics_source_collaboration_interest_idx").on(t.organizationId, t.interestId, t.createdAt),
    orgPartnerStatus: index("robotics_source_collaboration_partner_idx").on(t.organizationId, t.partnerId, t.status),
    validStatus: check("robotics_source_collaboration_status_check", sql`${t.status} IN ('consent_pending', 'selected', 'shared', 'source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'pilot_in_progress', 'pilot_completed', 'deployment_planning', 'deployment_in_progress', 'deployment_completed', 'closed', 'owner_declined', 'withdrawn')`),
    validConsentDecision: check("robotics_source_collaboration_consent_decision_check", sql`${t.ownerConsentDecision} IS NULL OR ${t.ownerConsentDecision} IN ('approved', 'declined')`),
    approvedBeforeSelected: check("robotics_source_collaboration_consent_check", sql`${t.status} NOT IN ('selected', 'shared', 'source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'pilot_in_progress', 'pilot_completed', 'deployment_planning', 'deployment_in_progress', 'deployment_completed', 'closed') OR (${t.ownerConsentAt} IS NOT NULL AND ${t.ownerConsentByUserId} IS NOT NULL AND ${t.ownerConsentDecision} = 'approved')`),
    sharedBeforeProgress: check("robotics_source_collaboration_share_check", sql`${t.status} NOT IN ('shared', 'source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'pilot_in_progress', 'pilot_completed', 'deployment_planning', 'deployment_in_progress', 'deployment_completed', 'closed') OR (${t.sharedAt} IS NOT NULL AND ${t.sharedByUserId} IS NOT NULL AND ${t.sharedSnapshot} IS NOT NULL)`),
    scopeObject: check("robotics_source_collaboration_scope_check", sql`jsonb_typeof(${t.consentScope}) = 'object'`),
  }),
)

export const roboticsSourceCollaborationEvent = pgTable(
  "robotics_source_collaboration_event",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    collaborationId: text("collaborationId").notNull(),
    eventType: text("eventType").notNull(),
    actorType: text("actorType").notNull(),
    actorUserId: text("actorUserId").notNull(),
    note: text("note"),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    timeline: index("robotics_source_collaboration_event_timeline_idx").on(t.organizationId, t.collaborationId, t.createdAt),
    validActor: check("robotics_source_collaboration_event_actor_check", sql`${t.actorType} IN ('admin', 'owner')`),
    detailObject: check("robotics_source_collaboration_event_detail_check", sql`jsonb_typeof(${t.detail}) = 'object'`),
  }),
)

export type RoboticsInterestRecommendation = {
  partnerId: string
  partnerName: string
  category: string
  tagCoverage: number
  matchedCapabilities: string[]
  reasons: string[]
}

// Customer-submitted robotics requirements stay separate from field intake and
// partner referrals. Recommendations are internal review aids until an admin
// confirms a selection; partner contact still requires the separate referral
// consent workflow.
export const roboticsInterest = pgTable(
  "robotics_interest",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    propertyId: text("propertyId").notNull(),
    createdByUserId: text("createdByUserId").notNull(),
    useCase: text("useCase").notNull(),
    tasks: jsonb("tasks").$type<string[]>().notNull().default([]),
    environment: jsonb("environment")
      .$type<{ location: string; access: string; operatingHours: string }>()
      .notNull()
      .default({ location: "mixed", access: "restricted", operatingHours: "" }),
    operatingConditions: text("operatingConditions"),
    humanHandoff: text("humanHandoff"),
    safetyRequirements: text("safetyRequirements"),
    integrationNeeds: text("integrationNeeds"),
    serviceNeeds: text("serviceNeeds"),
    budgetRange: text("budgetRange"),
    targetTimeline: text("targetTimeline"),
    additionalContext: text("additionalContext"),
    contactName: text("contactName"),
    contactEmail: text("contactEmail"),
    contactPhone: text("contactPhone"),
    contactPreference: text("contactPreference"),
    contactConsentAt: timestamp("contactConsentAt"),
    contactConsentByUserId: text("contactConsentByUserId"),
    // submitted | under_review | needs_info | recommended | closed
    status: text("status").notNull().default("submitted"),
    recommendations: jsonb("recommendations")
      .$type<RoboticsInterestRecommendation[]>()
      .notNull()
      .default([]),
    selectedPartnerId: text("selectedPartnerId"),
    reviewNotes: text("reviewNotes"),
    reviewedByUserId: text("reviewedByUserId"),
    submittedAt: timestamp("submittedAt").notNull().defaultNow(),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    orgStatusSubmitted: index("robotics_interest_org_status_submitted_idx").on(t.organizationId, t.status, t.submittedAt),
    orgPropertySubmitted: index("robotics_interest_org_property_submitted_idx").on(t.organizationId, t.propertyId, t.submittedAt),
    validStatus: check(
      "robotics_interest_status_check",
      sql`${t.status} IN ('submitted', 'under_review', 'needs_info', 'recommended', 'closed')`,
    ),
    tasksArray: check("robotics_interest_tasks_array_check", sql`jsonb_typeof(${t.tasks}) = 'array'`),
    environmentObject: check("robotics_interest_environment_object_check", sql`jsonb_typeof(${t.environment}) = 'object'`),
    recommendationsArray: check("robotics_interest_recommendations_array_check", sql`jsonb_typeof(${t.recommendations}) = 'array'`),
  }),
)

export const partnerReferral = pgTable(
  "partner_referral",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    partnerId: text("partnerId").notNull(),
    propertyId: text("propertyId").notNull(),
    leadId: text("leadId"),
    propertySnapshot: jsonb("propertySnapshot")
      .$type<{ name: string; city: string | null; region: string | null; country: string | null }>()
      .notNull(),
    matchReasons: jsonb("matchReasons").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("draft"),
    notes: text("notes"),
    consentObtainedAt: timestamp("consentObtainedAt"),
    consentObtainedByUserId: text("consentObtainedByUserId"),
    consentMethod: text("consentMethod"),
    consentReference: text("consentReference"),
    sentAt: timestamp("sentAt"),
    respondedAt: timestamp("respondedAt"),
    closedAt: timestamp("closedAt"),
    createdByUserId: text("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    orgStatusUpdated: index("partner_referral_org_status_updated_idx").on(t.organizationId, t.status, t.updatedAt),
    orgPartner: index("partner_referral_org_partner_idx").on(t.organizationId, t.partnerId),
    orgProperty: index("partner_referral_org_property_idx").on(t.organizationId, t.propertyId),
    validStatus: check(
      "partner_referral_status_check",
      sql`${t.status} IN ('draft', 'under_review', 'sent', 'accepted', 'declined', 'in_progress', 'won', 'lost', 'withdrawn')`,
    ),
    reasonsArray: check("partner_referral_match_reasons_check", sql`jsonb_typeof(${t.matchReasons}) = 'array'`),
    snapshotObject: check("partner_referral_property_snapshot_check", sql`jsonb_typeof(${t.propertySnapshot}) = 'object'`),
    consentBeforeSend: check(
      "partner_referral_consent_before_send_check",
      sql`${t.status} NOT IN ('sent', 'accepted', 'declined', 'in_progress', 'won', 'lost') OR (${t.consentObtainedAt} IS NOT NULL AND ${t.consentObtainedByUserId} IS NOT NULL AND ${t.consentMethod} IS NOT NULL)`,
    ),
  }),
)


export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// RoboReady tenancy layer
// ---------------------------------------------------------------------------

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdByUserId: text("createdByUserId").notNull(),
  // Optional custom logo image (Vercel Blob URL). Falls back to the built-in
  // RoboReady wordmark when null.
  logoUrl: text("logoUrl"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const membership = pgTable(
  "membership",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    // owner | admin | member | operator | client | vendor | contractor
    role: text("role").notNull().default("member"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    orgUser: unique().on(t.organizationId, t.userId),
  }),
)

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId"),
  userId: text("userId"),
  action: text("action").notNull(),
  entityType: text("entityType"),
  entityId: text("entityId"),
  metadata: jsonb("metadata"),
  ipAddress: text("ipAddress"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const blogPost = pgTable(
  "blog_post",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    category: text("category").notNull().default("field-notes"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    authorName: text("authorName").notNull(),
    authorRole: text("authorRole"),
    sources: jsonb("sources").$type<{ label: string; url: string; publishedAt?: string }[]>().notNull().default([]),
    seoTitle: text("seoTitle"),
    seoDescription: text("seoDescription"),
    canonicalUrl: text("canonicalUrl"),
    status: text("status").notNull().default("draft"),
    creationSource: text("creationSource").notNull().default("manual"),
    externalIdempotencyKey: text("externalIdempotencyKey").unique(),
    scheduledAt: timestamp("scheduledAt"),
    publishedAt: timestamp("publishedAt"),
    createdByUserId: text("createdByUserId"),
    updatedByUserId: text("updatedByUserId"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    statusPublished: index("blog_post_status_published_idx").on(table.status, table.publishedAt),
    categoryStatus: index("blog_post_category_status_idx").on(table.category, table.status),
    validStatus: check("blog_post_status_check", sql`${table.status} IN ('draft', 'scheduled', 'published', 'archived')`),
    validSource: check("blog_post_source_check", sql`${table.creationSource} IN ('manual', 'staffgpt')`),
  }),
)

export const blogMedia = pgTable(
  "blog_media",
  {
    id: text("id").primaryKey(),
    postId: text("postId").notNull().references(() => blogPost.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    pathname: text("pathname"),
    contentType: text("contentType").notNull(),
    mediaType: text("mediaType").notNull(),
    altText: text("altText").notNull().default(""),
    caption: text("caption"),
    transcript: text("transcript"),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    postSort: index("blog_media_post_sort_idx").on(table.postId, table.sortOrder),
    validType: check("blog_media_type_check", sql`${table.mediaType} IN ('image', 'video')`),
  }),
)

export const blogSettings = pgTable(
  "blog_settings",
  {
    id: text("id").primaryKey().default("global"),
    visible: boolean("visible").notNull().default(false),
    staffgptAutoPublish: boolean("staffgptAutoPublish").notNull().default(false),
    updatedByUserId: text("updatedByUserId"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    singleton: check("blog_settings_singleton_check", sql`${table.id} = 'global'`),
  }),
)

export const siteSettings = pgTable(
  "site_settings",
  {
    id: text("id").primaryKey().default("global"),
    roboDefaultOpen: boolean("roboDefaultOpen").notNull().default(false),
    partnersVisible: boolean("partnersVisible").notNull().default(true),
    partnerMarquee: boolean("partnerMarquee").notNull().default(false),
    updatedByUserId: text("updatedByUserId"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    singleton: check("site_settings_singleton_check", sql`${table.id} = 'global'`),
  }),
)

export const sitePartner = pgTable(
  "site_partner",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    logoUrl: text("logoUrl"),
    logoPathname: text("logoPathname"),
    destinationUrl: text("destinationUrl"),
    visible: boolean("visible").notNull().default(true),
    linkActive: boolean("linkActive").notNull().default(false),
    sortOrder: integer("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    sort: index("site_partner_visible_sort_idx").on(table.visible, table.sortOrder, table.name),
    secureDestination: check(
      "site_partner_destination_https_check",
      sql`${table.destinationUrl} IS NULL OR ${table.destinationUrl} LIKE 'https://%'`,
    ),
    activeLinkHasDestination: check(
      "site_partner_active_link_check",
      sql`NOT ${table.linkActive} OR ${table.destinationUrl} IS NOT NULL`,
    ),
  }),
)

export type SitePartner = typeof sitePartner.$inferSelect
export type NewSitePartner = typeof sitePartner.$inferInsert

export type PublicSitePartner = Pick<
  SitePartner,
  "id" | "name" | "logoUrl" | "destinationUrl" | "linkActive" | "sortOrder"
>

export type AdminSitePartner = Pick<
  SitePartner,
  "id" | "name" | "logoUrl" | "destinationUrl" | "visible" | "linkActive" | "sortOrder"
>

export const blogApiRateBucket = pgTable(
  "blog_api_rate_bucket",
  {
    rateKey: text("rateKey").notNull(),
    bucketStart: timestamp("bucketStart").notNull(),
    requestCount: integer("requestCount").notNull().default(0),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.rateKey, table.bucketStart] }),
    bucketStart: index("blog_api_rate_bucket_start_idx").on(table.bucketStart),
  }),
)


// ---------------------------------------------------------------------------
// RoboReady domain
// ---------------------------------------------------------------------------

export const property = pgTable("property", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  name: text("name").notNull(),
  propertyType: text("propertyType").notNull().default("commercial"),
  addressLine1: text("addressLine1"),
  addressLine2: text("addressLine2"),
  city: text("city"),
  region: text("region"),
  postalCode: text("postalCode"),
  country: text("country"),
  phone: text("phone"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  squareFootage: integer("squareFootage"),
  floors: integer("floors"),
  yearBuilt: integer("yearBuilt"),
  // Front-of-funnel prospecting states precede the assessment flow:
  // prospect | handover | pending_verification | verified
  // then the existing: intake | assessing | assessed | proposal | active
  status: text("status").notNull().default("intake"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const intakeSubmission = pgTable("intake_submission", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  answers: jsonb("answers").notNull().default({}),
  status: text("status").notNull().default("draft"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const document = pgTable("document", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("general"),
  url: text("url").notNull(),
  contentType: text("contentType"),
  sizeBytes: integer("sizeBytes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const aiJob = pgTable("ai_job", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId"),
  createdByUserId: text("createdByUserId").notNull(),
  employeeSlug: text("employeeSlug").notNull(),
  employeeName: text("employeeName").notNull(),
  jobType: text("jobType").notNull(),
  // queued | running | needs_approval | approved | completed | failed
  status: text("status").notNull().default("queued"),
  // local | staffgpt
  adapterKind: text("adapterKind").notNull().default("local"),
  input: jsonb("input"),
  output: jsonb("output"),
  rawResponse: jsonb("rawResponse"),
  reasoning: text("reasoning"),
  requiresApproval: boolean("requiresApproval").notNull().default(false),
  approvedByUserId: text("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  errorDetail: text("errorDetail"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const assessment = pgTable("assessment", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  aiJobId: text("aiJobId"),
  status: text("status").notNull().default("draft"),
  roboReadyScore: integer("roboReadyScore"),
  scoreBreakdown: jsonb("scoreBreakdown"),
  // Premium-tier multi-domain roll-up (arrival + EV + robotics + delivery +
  // AI-ops), null for non-premium assessments. See computePremiumScore.
  premiumBreakdown: jsonb("premiumBreakdown"),
  findings: jsonb("findings"),
  recommendations: jsonb("recommendations"),
  summary: text("summary"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Tracks one paid AI assessment from payment to a downloadable report. This is
// the state machine the client watches on their progress tracker. Stage order:
// queued -> analyzing -> designing -> planning -> reporting -> ready. The
// lockedAt column is a short self-heal lock so a stalled run can be reclaimed
// and resumed (see lib/assessment/lifecycle.ts).
export const assessmentRun = pgTable("assessment_run", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  // Which payment unlocked this run (kind='assessment').
  paymentId: text("paymentId"),
  // basic | standard | pro (mirrors the purchased tier).
  tier: text("tier").notNull().default("basic"),
  // queued | analyzing | designing | planning | reporting | ready | failed
  stage: text("stage").notNull().default("queued"),
  // The assessment row produced once reporting completes.
  assessmentId: text("assessmentId"),
  error: text("error"),
  // Self-heal lock: a worker stamps this when it starts a step; a stale stamp
  // (older than the lock window) means the worker died and the run can resume.
  lockedAt: timestamp("lockedAt"),
  startedAt: timestamp("startedAt"),
  readyAt: timestamp("readyAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const siteConcept = pgTable("site_concept", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  assessmentId: text("assessmentId"),
  createdByUserId: text("createdByUserId").notNull(),
  aiJobId: text("aiJobId"),
  title: text("title").notNull(),
  narrative: text("narrative"),
  zones: jsonb("zones"),
  pickupZones: jsonb("pickupZones"),
  imageUrl: text("imageUrl"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const infrastructureAsset = pgTable("infrastructure_asset", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  // ev_charger | landing_pad | robo_charge | drone_pad (expandable)
  assetType: text("assetType").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("proposed"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  quantity: integer("quantity").notNull().default(1),
  unitCost: numeric("unitCost", { precision: 12, scale: 2 }),
  specs: jsonb("specs"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// MVP 2: CRM, proposals, payments, and additional AI planners
// ---------------------------------------------------------------------------

export const lead = pgTable("lead", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  ownerUserId: text("ownerUserId"),
  company: text("company").notNull(),
  contactName: text("contactName"),
  contactEmail: text("contactEmail"),
  contactPhone: text("contactPhone"),
  source: text("source").notNull().default("manual"),
  // new | qualifying | qualified | proposal | won | lost
  stage: text("stage").notNull().default("new"),
  estimatedValue: numeric("estimatedValue", { precision: 12, scale: 2 }),
  notes: text("notes"),
  qualification: jsonb("qualification"),
  qualificationJobId: text("qualificationJobId"),
  linkedPropertyId: text("linkedPropertyId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const proposal = pgTable("proposal", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  lineItems: jsonb("lineItems").notNull().default([]),
  subtotalCents: integer("subtotalCents").notNull().default(0),
  depositRate: numeric("depositRate", { precision: 4, scale: 3 }).notNull().default("0.100"),
  depositCents: integer("depositCents").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  // draft | sent | accepted | deposit_paid
  status: text("status").notNull().default("draft"),
  aiJobId: text("aiJobId"),
  version: integer("version").notNull().default(1),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  propertyId: text("propertyId"),
  proposalId: text("proposalId"),
  // assessment | proposal_deposit
  kind: text("kind").notNull(),
  // For kind='assessment': which tier was bought (basic | standard | pro).
  tier: text("tier"),
  amountCents: integer("amountCents").notNull(),
  currency: text("currency").notNull().default("usd"),
  // pending | paid | failed
  status: text("status").notNull().default("pending"),
  stripeSessionId: text("stripeSessionId"),
  stripePaymentIntentId: text("stripePaymentIntentId"),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const wayfindingPlan = pgTable("wayfinding_plan", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  aiJobId: text("aiJobId"),
  summary: text("summary"),
  routes: jsonb("routes"),
  signage: jsonb("signage"),
  passengerJourney: jsonb("passengerJourney"),
  boardingSignals: jsonb("boardingSignals"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const accessibilityAudit = pgTable("accessibility_audit", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  aiJobId: text("aiJobId"),
  score: integer("score"),
  summary: text("summary"),
  findings: jsonb("findings"),
  requiresVerification: boolean("requiresVerification").notNull().default(true),
  verifiedByUserId: text("verifiedByUserId"),
  verifiedAt: timestamp("verifiedAt"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const propertyPlan = pgTable("property_plan", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  aiJobId: text("aiJobId"),
  narrative: text("narrative"),
  // Structured schematic layouts (normalized 0-100 grid) rendered as SVG diagrams.
  floorPlan: jsonb("floorPlan"),
  sitePlan: jsonb("sitePlan"),
  // AI-generated illustrative renders, stored as private Blob pathnames served
  // through /api/documents/file.
  floorPlanImageUrl: text("floorPlanImageUrl"),
  sitePlanImageUrl: text("sitePlanImageUrl"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// MVP 3: recurring Concierge + Maintenance service plans
// ---------------------------------------------------------------------------

// One active recurring plan per property (enforced by a partial unique index on
// status='active', created in the migration). Amount + plan definition are
// server-controlled; Stripe holds the recurring billing via a subscription.
export const serviceSubscription = pgTable("service_subscription", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  propertyId: text("propertyId").notNull(),
  // References a plan id from lib/service-plans.ts (source of truth for price).
  planId: text("planId").notNull(),
  // month | year
  interval: text("interval").notNull().default("month"),
  amountCents: integer("amountCents").notNull(),
  currency: text("currency").notNull().default("usd"),
  // pending | active | canceled
  status: text("status").notNull().default("pending"),
  stripeSessionId: text("stripeSessionId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  stripeCustomerId: text("stripeCustomerId"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
  canceledAt: timestamp("canceledAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Support: inquiries captured by Robo, the contact & support AI agent
// ---------------------------------------------------------------------------

// Platform-level (not org-scoped): these come from anonymous marketing-site
// visitors as well as signed-in users. The RoboReady operator console reads
// them from a single global inbox at /dashboard/support.
export const supportInquiry = pgTable("support_inquiry", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  // question | demo | pricing | support | partnership | other
  topic: text("topic").notNull().default("other"),
  message: text("message").notNull(),
  // The chat transcript that produced this inquiry, for context in the inbox.
  conversation: jsonb("conversation").notNull().default([]),
  // new | in_progress | resolved
  status: text("status").notNull().default("new"),
  source: text("source").notNull().default("robo"),
  pageUrl: text("pageUrl"),
  userId: text("userId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Access: invitations and per-property field-staff assignments
// ---------------------------------------------------------------------------

// An owner/admin invites an email into their org with a chosen role. When that
// person signs in (or up) with the matching email, the pending invite is what
// joins them to the org with the assigned role — this is how someone logs in
// as a Client, Field Operator, Vendor, or Contractor.
export const invite = pgTable("invite", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  email: text("email").notNull(),
  // owner | admin | member | operator | client | vendor | contractor
  role: text("role").notNull().default("member"),
  // pending | accepted | revoked
  status: text("status").notNull().default("pending"),
  invitedByUserId: text("invitedByUserId").notNull(),
  acceptedByUserId: text("acceptedByUserId"),
  // Solicited flow: staff pre-assess a property and invite the owner to buy an
  // assessment for it. These carry which property the invite is about and which
  // tier is being offered, so acceptance links the client to that property.
  propertyId: text("propertyId"),
  offeredTier: text("offeredTier"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  acceptedAt: timestamp("acceptedAt"),
})

// Assigns a field-staff member (operator/vendor/contractor) to a specific
// property so they can build out its assessment and report. Field roles only
// see properties they are assigned to.
export const propertyAssignment = pgTable(
  "property_assignment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    propertyId: text("propertyId").notNull(),
    userId: text("userId").notNull(),
    role: text("role").notNull().default("operator"),
    assignedByUserId: text("assignedByUserId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    propertyUser: unique().on(t.propertyId, t.userId),
  }),
)

export const evPlan = pgTable("ev_plan", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  aiJobId: text("aiJobId"),
  summary: text("summary"),
  stations: jsonb("stations"),
  loadSummary: jsonb("loadSummary"),
  totalCostCents: integer("totalCostCents"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// In-app notifications (bell + feed). Written whenever a client- or staff-
// facing event happens (assessment paid, stage advanced, report ready, an
// assessment offered). Email delivery is layered on best-effort separately.
// ---------------------------------------------------------------------------
export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  // Recipient.
  userId: text("userId").notNull(),
  // assessment_paid | assessment_stage | assessment_ready | assessment_offer | assessment_failed | cyber_fleet_eligible
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  // Optional deep link (e.g. /dashboard/properties/<id> or /portal/<id>).
  href: text("href"),
  propertyId: text("propertyId"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Partner monetization: Cyber Fleet Services referrals
//
// After an assessment finalizes, properties whose RoboReady Score falls in the
// org's qualifying range are offered a referral to the security/robotics
// partner (Cyber Fleet Services). The economics ($500 lead fee, $2,500
// development fee, 2% revenue share) live in docs/partnerships and are NOT
// tracked in-app yet — this table only models the referral handoff pipeline.
// ---------------------------------------------------------------------------
export const cyberFleetReferral = pgTable(
  "cyber_fleet_referral",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    propertyId: text("propertyId").notNull(),
    // The assessment + score snapshot that made this property eligible.
    assessmentId: text("assessmentId"),
    roboReadyScore: integer("roboReadyScore"),
    // The property owner this referral belongs to (nullable for staff-created props).
    ownerUserId: text("ownerUserId"),
    createdByUserId: text("createdByUserId").notNull(),
    // eligible | requested | accepted | rejected | deal | dismissed
    status: text("status").notNull().default("eligible"),
    // Contact details captured when the owner requests the evaluation.
    contactName: text("contactName"),
    contactEmail: text("contactEmail"),
    contactPhone: text("contactPhone"),
    notes: text("notes"),
    requestedAt: timestamp("requestedAt"),
    decidedAt: timestamp("decidedAt"),
    // Throttles the manual "send reminder" admin action.
    lastReminderAt: timestamp("lastReminderAt"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    // One referral per property; the finalize step upserts on this.
    onesPerProperty: unique().on(t.propertyId),
  }),
)

// Org-level, admin-editable partner configuration. One row per organization.
export const partnerSetting = pgTable(
  "partner_setting",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    // Whether the Cyber Fleet referral offer is active for this workspace.
    cyberFleetEnabled: boolean("cyberFleetEnabled").notNull().default(true),
    // Inclusive RoboReady Score range that qualifies a property (default 50-100).
    qualifyMinScore: integer("qualifyMinScore").notNull().default(50),
    qualifyMaxScore: integer("qualifyMaxScore").notNull().default(100),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    onePerOrg: unique().on(t.organizationId),
  }),
)

// ---------------------------------------------------------------------------
// Autonomous Ready Properties Network — powered by RoboArrival
//
// A standalone, cross-org directory that assessed properties populate. Kept as
// its own table (not columns on `property`) because the network is public-
// capable and its visibility/amenity/telemetry lifecycle is independent of the
// internal assessment workflow. One listing per property.
// ---------------------------------------------------------------------------
export const networkListing = pgTable(
  "network_listing",
  {
    id: text("id").primaryKey(),
    // FK-by-convention to property.id (one listing per property).
    propertyId: text("propertyId").notNull(),
    // Provenance — always the shared RoboReady platform org today.
    organizationId: text("organizationId").notNull(),
    // none | care_plan | signed_in | public. Admin-controlled. `none` = not
    // listed; the network never returns it to a browsing audience.
    visibility: text("visibility").notNull().default("none"),
    // Resolved amenity id list actually shown (derived ∪ added − removed).
    amenities: jsonb("amenities").notNull().default([]),
    // Last auto-derived amenity set, kept for diffing / re-derive.
    derivedAmenities: jsonb("derivedAmenities").notNull().default([]),
    // Admin edits layered over the derived set: { added: string[], removed: string[] }.
    amenityOverrides: jsonb("amenityOverrides").notNull().default({}),
    // Optional admin-editable marketing copy for the public card.
    headline: text("headline"),
    blurb: text("blurb"),
    // Snapshotted from the property for fast map/list queries without a join.
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    city: text("city"),
    region: text("region"),
    country: text("country"),
    roboReadyScore: integer("roboReadyScore"),
    // Cached latest AV telemetry: { arriving, departing, idle, source, at, live }.
    liveStatus: jsonb("liveStatus").notNull().default({}),
    publishedAt: timestamp("publishedAt"),
    publishedByUserId: text("publishedByUserId"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    oneListingPerProperty: unique().on(t.propertyId),
  }),
)

// Append-only AV arrival/departure/idle log. Written manually today (admin
// "record AV event") and by the Tesla Fleet/Business/satellite adapter when
// connected. Reduced into networkListing.liveStatus for display.
export const networkAvEvent = pgTable("network_av_event", {
  id: text("id").primaryKey(),
  listingId: text("listingId").notNull(),
  propertyId: text("propertyId").notNull(),
  // arriving | departing | idle | arrived | departed
  kind: text("kind").notNull(),
  // Opaque AV identifier (VIN / fleet id from Tesla; freeform label when manual).
  vehicleRef: text("vehicleRef").notNull(),
  // manual | tesla_fleet | tesla_business | satellite
  source: text("source").notNull().default("manual"),
  detail: jsonb("detail"),
  occurredAt: timestamp("occurredAt").notNull().defaultNow(),
  createdByUserId: text("createdByUserId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// RoboGraph — the RoboSearch intelligence layer (detachable module)
//
// These tables belong to RoboSearch, NOT to RoboReady's operational domain.
// They model the canonical knowledge graph of the autonomous world (entities +
// relationships) plus the provenance system that makes it a living knowledge
// base rather than an AI-generated directory. The governing rule is
// "AI may propose. Evidence establishes." — AI research produces a *proposal*
// (a robosearch_research_job) that a human reviews before anything is promoted
// into the graph as active/accepted. Every table is prefixed `robosearch_` to
// keep the module boundary explicit and additive: nothing here references or
// mutates the existing RoboReady tables, so RoboSearch could later detach into
// its own service without a rewrite (the "detach test").
// ---------------------------------------------------------------------------

// A canonical node in the RoboGraph. Polymorphic by `kind` with typed facts
// carried as claims (see robosearch_claim) rather than rigid columns, so the
// graph can grow new entity kinds without migrations.
export const robosearchEntity = pgTable(
  "robosearch_entity",
  {
    id: text("id").primaryKey(),
    // company | robot | autonomous_vehicle | property | location | operator |
    // service | infrastructure | amenity | media
    kind: text("kind").notNull(),
    canonicalName: text("canonicalName").notNull(),
    // URL-safe handle for /robosearch/<kind>/<slug>; unique within a kind.
    slug: text("slug"),
    summary: text("summary"),
    // Lightweight denormalized facets for fast filtering (city, region,
    // category, etc). The authoritative, provenance-bearing facts are claims.
    attributes: jsonb("attributes").notNull().default({}),
    // candidate | active | merged | rejected. A discovery proposal creates
    // `candidate` rows; human approval promotes them to `active`.
    status: text("status").notNull().default("candidate"),
    // unverified | business_verified | roboready_verified
    verification: text("verification").notNull().default("unverified"),
    // low | medium | high — aggregate confidence in the entity's existence.
    confidence: text("confidence").notNull().default("low"),
    // Normalized key the resolver uses to detect duplicates (lowercased name).
    dedupeKey: text("dedupeKey"),
    // When status='merged', the surviving entity this one folded into.
    mergedIntoId: text("mergedIntoId"),
    // The research job that first proposed this entity (traceability).
    discoveredByJobId: text("discoveredByJobId"),
    createdByUserId: text("createdByUserId"),
    reviewedByUserId: text("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    slugPerKind: unique().on(t.kind, t.slug),
  }),
)

// An evidence source backing one or more claims. Provenance is first-class:
// every established fact points at where it came from.
export const robosearchSource = pgTable("robosearch_source", {
  id: text("id").primaryKey(),
  url: text("url"),
  title: text("title"),
  publisher: text("publisher"),
  // website | news | filing | manual | ai_inference
  sourceType: text("sourceType").notNull().default("ai_inference"),
  // Verbatim excerpt / snapshot supporting the claim, for later re-checking.
  snapshot: text("snapshot"),
  retrievedAt: timestamp("retrievedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// A single fact about an entity, with full provenance. This is what turns the
// graph into a living knowledge base: not "Hotel has EV charging" but that
// claim + its source + confidence + verification + recheck window.
export const robosearchClaim = pgTable("robosearch_claim", {
  id: text("id").primaryKey(),
  entityId: text("entityId").notNull(),
  // Machine predicate, e.g. has_ev_charging | category | operates_in |
  // robot_delivery | payload_kg. Free-form but curated by the taxonomy.
  predicate: text("predicate").notNull(),
  // The claim's value (string | number | boolean | structured), as JSON.
  objectValue: jsonb("objectValue"),
  sourceId: text("sourceId"),
  // low | medium | high
  confidence: text("confidence").notNull().default("low"),
  // unverified | business_verified | roboready_verified
  verification: text("verification").notNull().default("unverified"),
  // Human-readable justification the AI or curator recorded.
  evidence: text("evidence"),
  // proposed | accepted | rejected | superseded
  status: text("status").notNull().default("proposed"),
  discoveredAt: timestamp("discoveredAt"),
  lastCheckedAt: timestamp("lastCheckedAt"),
  expiresAt: timestamp("expiresAt"),
  createdByJobId: text("createdByJobId"),
  reviewedByUserId: text("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// A directed relationship between two entities (the "graph" edges). Carries its
// own confidence + source so relationships are provenance-bearing too.
export const robosearchEdge = pgTable("robosearch_edge", {
  id: text("id").primaryKey(),
  subjectEntityId: text("subjectEntityId").notNull(),
  // manufactures | operates | rents | owns | located_at | supports | near |
  // picks_up_at | compatible_with | manufactured_by
  predicate: text("predicate").notNull(),
  objectEntityId: text("objectEntityId").notNull(),
  confidence: text("confidence").notNull().default("low"),
  sourceId: text("sourceId"),
  // proposed | accepted | rejected
  status: text("status").notNull().default("proposed"),
  createdByJobId: text("createdByJobId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// The StaffGPT ↔ RoboSearch job interface. A research job records what the AI
// workforce was asked to do and the *proposal* it produced. It is NEVER
// auto-applied to the graph: a human reviews `proposal` and approves or
// rejects, and only on approval are entities/claims/sources promoted. This is
// the enforcement point for "AI may propose. Evidence establishes."
export const robosearchResearchJob = pgTable("robosearch_research_job", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  // DISCOVER_ENTITY | RESEARCH_ENTITY | VERIFY_ENTITY | RESOLVE_DUPLICATE |
  // ANALYZE_PROPERTY | UPDATE_ENTITY | CREATE_CONTENT | FIND_LEADS |
  // ANALYZE_SEARCHES
  jobKind: text("jobKind").notNull(),
  // queued | running | proposed | approved | rejected | failed
  status: text("status").notNull().default("queued"),
  // The request parameters (e.g. { market, entityKind, count }).
  input: jsonb("input"),
  // The AI's structured proposal: candidate entities, claims, sources, notes.
  proposal: jsonb("proposal"),
  // Link to the traceable ai_job row the dispatch created.
  aiJobId: text("aiJobId"),
  // Which specialist produced it (RoboScout, RoboResearcher, ...).
  employeeSlug: text("employeeSlug"),
  summary: text("summary"),
  error: text("error"),
  // How many entities the approval promoted into the graph (audit convenience).
  promotedEntityCount: integer("promotedEntityCount").notNull().default(0),
  createdByUserId: text("createdByUserId").notNull(),
  reviewedByUserId: text("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})
