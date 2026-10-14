ALTER TABLE "solution_partner"
  ADD COLUMN "roboticsSourceStatus" text NOT NULL DEFAULT 'unverified',
  ADD COLUMN "roboticsSourceType" text NOT NULL DEFAULT 'integrator',
  ADD COLUMN "roboticsSourcePriority" integer NOT NULL DEFAULT 100,
  ADD CONSTRAINT "solution_partner_robotics_status_check"
    CHECK ("roboticsSourceStatus" IN ('unverified', 'paused', 'participating', 'full_partner')),
  ADD CONSTRAINT "solution_partner_robotics_type_check"
    CHECK ("roboticsSourceType" IN ('manufacturer', 'distributor', 'retailer', 'rental', 'raas', 'integrator')),
  ADD CONSTRAINT "solution_partner_robotics_priority_check"
    CHECK ("roboticsSourcePriority" >= 0);

CREATE TABLE "robotics_manufacturer" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "name" text NOT NULL,
  "websiteUrl" text,
  "country" text,
  "verificationStatus" text NOT NULL DEFAULT 'unverified' CHECK ("verificationStatus" IN ('verified', 'unverified', 'unknown')),
  "lastVerifiedAt" timestamp without time zone,
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now()
);
CREATE INDEX "robotics_manufacturer_org_name_idx" ON "robotics_manufacturer" ("organizationId", "name");

CREATE TABLE "robotics_model" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "manufacturerId" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "productUrl" text,
  "commercialStatus" text NOT NULL DEFAULT 'unknown' CHECK ("commercialStatus" IN ('commercial', 'pilot', 'preorder', 'prototype', 'retired', 'unknown')),
  "verificationStatus" text NOT NULL DEFAULT 'unverified' CHECK ("verificationStatus" IN ('verified', 'unverified', 'unknown')),
  "lastVerifiedAt" timestamp without time zone,
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now()
);
CREATE INDEX "robotics_model_org_manufacturer_idx" ON "robotics_model" ("organizationId", "manufacturerId");
CREATE INDEX "robotics_model_org_status_idx" ON "robotics_model" ("organizationId", "verificationStatus");

CREATE TABLE "robotics_model_capability" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "modelId" text NOT NULL,
  "capabilityKey" text NOT NULL,
  "capabilityValue" text,
  "evidenceUrl" text,
  "evidenceTitle" text,
  "verificationStatus" text NOT NULL DEFAULT 'unknown' CHECK ("verificationStatus" IN ('verified', 'unverified', 'unknown')),
  "confidence" integer,
  "lastVerifiedAt" timestamp without time zone,
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "robotics_model_capability_confidence_check" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 100),
  CONSTRAINT "robotics_model_capability_verified_evidence_check" CHECK ("verificationStatus" <> 'verified' OR ("evidenceUrl" IS NOT NULL AND "lastVerifiedAt" IS NOT NULL))
);
CREATE INDEX "robotics_model_capability_model_idx" ON "robotics_model_capability" ("organizationId", "modelId", "verificationStatus");

CREATE TABLE "robotics_source_offering" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "partnerId" text NOT NULL,
  "modelId" text NOT NULL,
  "sourceType" text NOT NULL CHECK ("sourceType" IN ('manufacturer', 'distributor', 'retailer', 'rental', 'raas', 'integrator')),
  "sourceUrl" text,
  "availability" text NOT NULL DEFAULT 'unknown' CHECK ("availability" IN ('available', 'pilot', 'preorder', 'waitlist', 'unavailable', 'unknown')),
  "priceCents" integer,
  "priceCurrency" text,
  "priceBasis" text CHECK ("priceBasis" IS NULL OR "priceBasis" IN ('one_time', 'monthly', 'annual', 'quote')),
  "pricingEvidenceUrl" text,
  "verificationStatus" text NOT NULL DEFAULT 'unverified' CHECK ("verificationStatus" IN ('verified', 'unverified', 'unknown')),
  "lastVerifiedAt" timestamp without time zone,
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "robotics_source_offering_price_check" CHECK ("priceCents" IS NULL OR "priceCents" >= 0),
  CONSTRAINT "robotics_source_offering_verified_evidence_check" CHECK ("verificationStatus" <> 'verified' OR ("sourceUrl" IS NOT NULL AND "lastVerifiedAt" IS NOT NULL))
);
CREATE INDEX "robotics_source_offering_org_model_idx" ON "robotics_source_offering" ("organizationId", "modelId");
CREATE INDEX "robotics_source_offering_org_partner_idx" ON "robotics_source_offering" ("organizationId", "partnerId");

CREATE TABLE "robotics_recommendation_run" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "interestId" text NOT NULL,
  "assessmentId" text NOT NULL,
  "assessmentVersion" integer NOT NULL,
  "runNumber" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'current' CHECK ("status" IN ('current', 'superseded')),
  "reason" text,
  "interestSnapshot" jsonb NOT NULL,
  "assessmentSnapshot" jsonb NOT NULL,
  "results" jsonb NOT NULL DEFAULT '{"outcome":"no_verified_fit","candidates":[],"summary":"","generatedAt":""}'::jsonb,
  "createdByUserId" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "supersededAt" timestamp without time zone,
  CONSTRAINT "robotics_recommendation_run_number_check" CHECK ("runNumber" > 0),
  CONSTRAINT "robotics_recommendation_run_interest_number_unique" UNIQUE ("organizationId", "interestId", "runNumber")
);
CREATE INDEX "robotics_recommendation_run_interest_created_idx" ON "robotics_recommendation_run" ("organizationId", "interestId", "createdAt");

CREATE TABLE "robotics_source_collaboration" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "interestId" text NOT NULL,
  "recommendationRunId" text NOT NULL,
  "assessmentId" text NOT NULL,
  "modelId" text NOT NULL,
  "offeringId" text NOT NULL,
  "partnerId" text NOT NULL,
  "status" text NOT NULL DEFAULT 'consent_pending' CHECK ("status" IN ('consent_pending', 'selected', 'shared', 'source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'pilot_in_progress', 'pilot_completed', 'deployment_planning', 'deployment_in_progress', 'deployment_completed', 'closed', 'owner_declined', 'withdrawn')),
  "consentScope" jsonb NOT NULL,
  "ownerConsentAt" timestamp without time zone,
  "ownerConsentByUserId" text,
  "ownerConsentDecision" text CHECK ("ownerConsentDecision" IS NULL OR "ownerConsentDecision" IN ('approved', 'declined')),
  "ownerConsentMethod" text,
  "ownerConsentReference" text,
  "overrideBasis" text CHECK ("overrideBasis" IS NULL OR "overrideBasis" IN ('partner_unable', 'owner_requested')),
  "overrideReason" text,
  "selectedByAdminUserId" text NOT NULL,
  "sharedAt" timestamp without time zone,
  "sharedByUserId" text,
  "shareMethod" text,
  "shareReference" text,
  "sharedSnapshot" jsonb,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "robotics_source_collaboration_consent_check" CHECK ("status" NOT IN ('selected', 'shared', 'source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'pilot_in_progress', 'pilot_completed', 'deployment_planning', 'deployment_in_progress', 'deployment_completed', 'closed') OR ("ownerConsentAt" IS NOT NULL AND "ownerConsentByUserId" IS NOT NULL AND "ownerConsentDecision" = 'approved')),
  CONSTRAINT "robotics_source_collaboration_share_check" CHECK ("status" NOT IN ('shared', 'source_response', 'fit_confirmed', 'fit_rejected', 'pilot_planning', 'pilot_in_progress', 'pilot_completed', 'deployment_planning', 'deployment_in_progress', 'deployment_completed', 'closed') OR ("sharedAt" IS NOT NULL AND "sharedByUserId" IS NOT NULL AND "sharedSnapshot" IS NOT NULL))
);
CREATE INDEX "robotics_source_collaboration_interest_idx" ON "robotics_source_collaboration" ("organizationId", "interestId", "createdAt");
CREATE INDEX "robotics_source_collaboration_partner_idx" ON "robotics_source_collaboration" ("organizationId", "partnerId", "status");

CREATE TABLE "robotics_source_collaboration_event" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL,
  "collaborationId" text NOT NULL,
  "eventType" text NOT NULL,
  "actorType" text NOT NULL CHECK ("actorType" IN ('admin', 'owner')),
  "actorUserId" text NOT NULL,
  "note" text,
  "detail" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now()
);
CREATE INDEX "robotics_source_collaboration_event_timeline_idx" ON "robotics_source_collaboration_event" ("organizationId", "collaborationId", "createdAt");

-- Additive and reversible: existing partners start as unverified and cannot be
-- selected for source collaboration until an Admin explicitly qualifies them.
-- Rollback: drop the robotics sourcing tables, then the three source columns and
-- their six constraints from solution_partner.
