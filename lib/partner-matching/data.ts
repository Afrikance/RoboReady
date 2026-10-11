import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { assessment, lead, partnerReferral, property, solutionPartner } from "@/lib/db/schema"
import type { OrgContext } from "@/lib/tenancy"
import { deriveOpportunityNeeds, isPartnerCategory } from "./core"
import type {
  MatchOpportunity,
  PartnerProfile,
  PartnerReferralView,
  PartnerWorkspace,
  ReferralStatus,
} from "./types"

const QUALIFIED_PROPERTY_STATUSES = ["assessed", "proposal", "active"] as const

function asPartner(row: typeof solutionPartner.$inferSelect): PartnerProfile | null {
  const coverage = row.coverage
  if (!isPartnerCategory(row.category) || !coverage || typeof coverage !== "object") return null
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    capabilities: Array.isArray(row.capabilities) ? row.capabilities.filter((item): item is string => typeof item === "string") : [],
    coverage,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    active: row.active,
  }
}

export async function loadPartnerWorkspace(ctx: OrgContext): Promise<PartnerWorkspace> {
  const [partnerRows, propertyRows, leadRows, assessmentRows, referralRows] = await Promise.all([
    db.select().from(solutionPartner)
      .where(eq(solutionPartner.organizationId, ctx.organizationId))
      .orderBy(solutionPartner.name),
    db.select().from(property)
      .where(and(eq(property.organizationId, ctx.organizationId), inArray(property.status, [...QUALIFIED_PROPERTY_STATUSES])))
      .orderBy(desc(property.updatedAt)),
    db.select({ id: lead.id, company: lead.company, linkedPropertyId: lead.linkedPropertyId, stage: lead.stage })
      .from(lead)
      .where(and(eq(lead.organizationId, ctx.organizationId), eq(lead.stage, "qualified"), inArray(lead.linkedPropertyId, db.select({ id: property.id }).from(property).where(eq(property.organizationId, ctx.organizationId)))))
      .orderBy(desc(lead.updatedAt)),
    db.select({ propertyId: assessment.propertyId, score: assessment.roboReadyScore, premiumBreakdown: assessment.premiumBreakdown, version: assessment.version })
      .from(assessment)
      .where(and(eq(assessment.organizationId, ctx.organizationId), eq(assessment.status, "completed")))
      .orderBy(desc(assessment.version)),
    db.select({ referral: partnerReferral, partnerName: solutionPartner.name, propertyName: property.name, leadCompany: lead.company })
      .from(partnerReferral)
      .innerJoin(solutionPartner, and(eq(solutionPartner.id, partnerReferral.partnerId), eq(solutionPartner.organizationId, ctx.organizationId)))
      .innerJoin(property, and(eq(property.id, partnerReferral.propertyId), eq(property.organizationId, ctx.organizationId)))
      .leftJoin(lead, and(eq(lead.id, partnerReferral.leadId), eq(lead.organizationId, ctx.organizationId)))
      .where(eq(partnerReferral.organizationId, ctx.organizationId))
      .orderBy(desc(partnerReferral.updatedAt), desc(partnerReferral.createdAt)),
  ])

  const latestAssessment = new Map<string, (typeof assessmentRows)[number]>()
  for (const row of assessmentRows) if (!latestAssessment.has(row.propertyId)) latestAssessment.set(row.propertyId, row)

  const qualifiedLeadByProperty = new Map<string, (typeof leadRows)[number]>()
  for (const row of leadRows) {
    if (row.linkedPropertyId && !qualifiedLeadByProperty.has(row.linkedPropertyId)) qualifiedLeadByProperty.set(row.linkedPropertyId, row)
  }

  const opportunities: MatchOpportunity[] = propertyRows.flatMap((row) => {
    const currentAssessment = latestAssessment.get(row.id)
    const linkedLead = qualifiedLeadByProperty.get(row.id)
    const score = currentAssessment?.score ?? null
    if (!linkedLead && !(score !== null && score >= 50)) return []
    return [{
      propertyId: row.id,
      leadId: linkedLead?.id ?? null,
      propertyName: row.name,
      leadCompany: linkedLead?.company ?? null,
      city: row.city,
      region: row.region,
      country: row.country,
      needs: deriveOpportunityNeeds(currentAssessment?.premiumBreakdown),
    }]
  })

  const referrals: PartnerReferralView[] = referralRows.map(({ referral, partnerName, propertyName, leadCompany }) => ({
    id: referral.id,
    partnerId: referral.partnerId,
    partnerName,
    propertyId: referral.propertyId,
    propertyName,
    leadCompany,
    propertySnapshot: referral.propertySnapshot,
    matchReasons: referral.matchReasons,
    status: referral.status as ReferralStatus,
    notes: referral.notes,
    consentObtainedAt: referral.consentObtainedAt,
    consentObtainedByUserId: referral.consentObtainedByUserId,
    consentMethod: referral.consentMethod,
    consentReference: referral.consentReference,
    sentAt: referral.sentAt,
    respondedAt: referral.respondedAt,
    closedAt: referral.closedAt,
    createdAt: referral.createdAt,
    updatedAt: referral.updatedAt,
  }))

  return {
    partners: partnerRows.flatMap((row) => {
      const partner = asPartner(row)
      return partner ? [partner] : []
    }),
    opportunities,
    referrals,
  }
}

export async function findPartnerForOrganization(partnerId: string, organizationId: string) {
  const [row] = await db.select().from(solutionPartner)
    .where(and(eq(solutionPartner.id, partnerId), eq(solutionPartner.organizationId, organizationId)))
    .limit(1)
  return row ?? null
}

export async function findReferralForOrganization(referralId: string, organizationId: string) {
  const [row] = await db.select().from(partnerReferral)
    .where(and(eq(partnerReferral.id, referralId), eq(partnerReferral.organizationId, organizationId)))
    .limit(1)
  return row ?? null
}

export async function getEligibleOpportunity(ctx: OrgContext, propertyId: string, leadId: string | null) {
  const workspace = await loadPartnerWorkspace(ctx)
  return workspace.opportunities.find((item) => item.propertyId === propertyId && item.leadId === leadId) ?? null
}

export async function getOpportunityProperty(ctx: OrgContext, propertyId: string) {
  const [row] = await db.select().from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  return row ?? null
}

export async function getOpportunityLead(ctx: OrgContext, leadId: string) {
  const [row] = await db.select({ id: lead.id, company: lead.company, linkedPropertyId: lead.linkedPropertyId, stage: lead.stage })
    .from(lead)
    .where(and(eq(lead.id, leadId), eq(lead.organizationId, ctx.organizationId)))
    .limit(1)
  return row ?? null
}

export async function getLatestCompletedAssessment(ctx: OrgContext, propertyId: string) {
  const [row] = await db.select({ id: assessment.id, score: assessment.roboReadyScore, premiumBreakdown: assessment.premiumBreakdown })
    .from(assessment)
    .where(and(eq(assessment.propertyId, propertyId), eq(assessment.organizationId, ctx.organizationId), eq(assessment.status, "completed")))
    .orderBy(desc(assessment.version))
    .limit(1)
  return row ?? null
}

export async function getMatchingPartners(ctx: OrgContext, opportunity: MatchOpportunity) {
  const rows = await db.select().from(solutionPartner).where(eq(solutionPartner.organizationId, ctx.organizationId))
  return rows.flatMap((row) => {
    const partner = asPartner(row)
    return partner ? [partner] : []
  })
}

export function isQualifiedPropertyStatus(status: string): boolean {
  return (QUALIFIED_PROPERTY_STATUSES as readonly string[]).includes(status)
}

export function isQualifiedLeadStage(stage: string): boolean {
  return stage === "qualified"
}

export function snapshotForProperty(row: typeof property.$inferSelect) {
  return { name: row.name, city: row.city, region: row.region, country: row.country }
}

export function referralStatus(value: string): ReferralStatus {
  return value as ReferralStatus
}

export function partnerCoverageMatchesStoredValue(value: unknown): value is PartnerProfile["coverage"] {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

export function opportunityNeeds(value: unknown): string[] {
  return deriveOpportunityNeeds(value)
}

export function partnerInputCategory(value: string) {
  return isPartnerCategory(value) ? value : null
}
