"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { assessment, siteConcept, infrastructureAsset, property } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { runJob } from "@/lib/ai/orchestrator"
import type { ReportOutput } from "@/lib/ai/schemas"
import type { ActionResult } from "@/app/actions/properties"
import type { ReportContext } from "@/components/report/report-view"

/**
 * Assembles the full ReportContext for a property from the latest assessment,
 * concept, and assets. Used by the in-app report tab and the client portal.
 * Returns null if the property is not in the caller's org.
 */
export async function buildReportContext(propertyId: string): Promise<ReportContext | null> {
  const ctx = await requireOrgContext()

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return null

  const [assess] = await db
    .select()
    .from(assessment)
    .where(and(eq(assessment.propertyId, propertyId), eq(assessment.organizationId, ctx.organizationId)))
    .orderBy(desc(assessment.version))
    .limit(1)

  const [concept] = await db
    .select()
    .from(siteConcept)
    .where(and(eq(siteConcept.propertyId, propertyId), eq(siteConcept.organizationId, ctx.organizationId)))
    .orderBy(desc(siteConcept.version))
    .limit(1)

  const assets = await db
    .select()
    .from(infrastructureAsset)
    .where(
      and(
        eq(infrastructureAsset.propertyId, propertyId),
        eq(infrastructureAsset.organizationId, ctx.organizationId),
      ),
    )

  const meta = prop.metadata as Record<string, unknown> | null
  const report = (meta?.report as ReportContext["report"]) ?? null

  return {
    propertyName: prop.name,
    address: [prop.addressLine1, prop.city, prop.region, prop.country].filter(Boolean).join(", "),
    organizationName: ctx.organizationName,
    score: assess?.roboReadyScore ?? null,
    scoreSummary: assess?.summary ?? null,
    breakdown: (assess?.scoreBreakdown as ReportContext["breakdown"]) ?? [],
    findings: (assess?.findings as ReportContext["findings"]) ?? [],
    recommendations: (assess?.recommendations as ReportContext["recommendations"]) ?? [],
    conceptTitle: concept?.title ?? null,
    conceptNarrative: concept?.narrative ?? null,
    assets: assets.map((a) => ({
      label: a.label,
      assetType: a.assetType,
      quantity: a.quantity,
      unitCost: a.unitCost,
    })),
    report,
  }
}

/**
 * Generates a client-ready narrative report from the property's latest
 * assessment, site concept, and infrastructure assets. Stored back onto the
 * site_concept row's narrative is NOT appropriate, so we keep the report on the
 * assessment's recommendations? No — we return it and persist to a lightweight
 * field. For MVP we store it in the assessment.summary-adjacent way via the
 * concept's metadata is messy; instead we regenerate on demand and also cache
 * the last report text on the property.metadata.
 */
export async function generateReport(propertyId: string): Promise<ActionResult<{ ok: true }>> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to generate reports." }
  }

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  const [assess] = await db
    .select()
    .from(assessment)
    .where(and(eq(assessment.propertyId, propertyId), eq(assessment.organizationId, ctx.organizationId)))
    .orderBy(desc(assessment.version))
    .limit(1)
  if (!assess) return { ok: false, error: "Run an assessment before generating a report." }

  const [concept] = await db
    .select()
    .from(siteConcept)
    .where(and(eq(siteConcept.propertyId, propertyId), eq(siteConcept.organizationId, ctx.organizationId)))
    .orderBy(desc(siteConcept.version))
    .limit(1)

  const assets = await db
    .select()
    .from(infrastructureAsset)
    .where(
      and(
        eq(infrastructureAsset.propertyId, propertyId),
        eq(infrastructureAsset.organizationId, ctx.organizationId),
      ),
    )

  const input = {
    property: { name: prop.name, type: prop.propertyType },
    assessment: {
      score: assess.roboReadyScore,
      summary: assess.summary,
      findings: assess.findings,
      recommendations: assess.recommendations,
    },
    concept: concept ? { title: concept.title, narrative: concept.narrative, zones: concept.zones } : null,
    assets: assets.map((a) => ({ type: a.assetType, label: a.label, quantity: a.quantity, unitCost: a.unitCost })),
  }

  try {
    const report = await runJob<typeof input, ReportOutput>({
      ctx,
      propertyId,
      employeeSlug: "report-writer",
      jobType: "report",
      input,
    })

    const metadata = { ...(prop.metadata as Record<string, unknown> | null), report: { ...report.output, generatedAt: new Date().toISOString() } }
    await db
      .update(property)
      .set({ metadata, status: "proposed", updatedAt: new Date() })
      .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "report.generated",
      entityType: "property",
      entityId: propertyId,
    })

    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath("/dashboard/reports")
    return { ok: true, data: { ok: true } }
  } catch (err) {
    console.log("[v0] generateReport failed:", (err as Error).message)
    return { ok: false, error: "The report could not be generated. Please try again." }
  }
}
