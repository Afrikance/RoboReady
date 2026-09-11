"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { generateImage } from "ai"
import { gateway } from "@ai-sdk/gateway"
import { put } from "@vercel/blob"
import { db } from "@/lib/db"
import { property, propertyPlan, document } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext, type OrgContext } from "@/lib/tenancy"
import { runJob } from "@/lib/ai/orchestrator"
import type { SitePlanDesignOutput } from "@/lib/ai/schemas"
import { getIntake } from "@/app/actions/intake"
import { getLatestAssessment, getLatestConcept } from "@/app/actions/assessment"
import type { ActionResult } from "@/app/actions/properties"

// Text-to-image model used for the illustrative plan renders. If this call
// fails for any reason, the plan still ships with its SVG schematic.
const IMAGE_MODEL = "bytedance/seedream-4.0"

export async function getPlan(propertyId: string) {
  const ctx = await requireOrgContext()
  const rows = await db
    .select()
    .from(propertyPlan)
    .where(and(eq(propertyPlan.propertyId, propertyId), eq(propertyPlan.organizationId, ctx.organizationId)))
    .orderBy(desc(propertyPlan.version))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Generates an illustrative render, stores it as a private Blob, and registers
 * a document row (so it appears under Documents and is served through the
 * authorized /api/documents/file proxy). Returns the blob pathname, or null on
 * any failure — the schematic is always the source of truth.
 */
async function renderPlanImage(
  ctx: OrgContext,
  propertyId: string,
  prompt: string,
  label: string,
  category: string,
): Promise<string | null> {
  try {
    const { image } = await generateImage({
      model: gateway.imageModel(IMAGE_MODEL),
      prompt,
    })
    const pathname = `orgs/${ctx.organizationId}/properties/${propertyId}/plans/${crypto.randomUUID()}-${category}.png`
    const blob = await put(pathname, Buffer.from(image.uint8Array), {
      access: "private",
      contentType: image.mediaType ?? "image/png",
    })

    await db.insert(document).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      name: label,
      category,
      url: blob.pathname,
      contentType: "image/png",
      sizeBytes: image.uint8Array.byteLength,
    })

    return blob.pathname
  } catch (err) {
    console.log("[v0] renderPlanImage failed:", (err as Error).message)
    return null
  }
}

/**
 * Produces a Floor plan (interior) + Site plan (exterior) for a property:
 *   1. the site designer lays out both schematics on a 0-100 grid
 *   2. two AI illustrations are rendered from the designer's image prompts
 *   3. everything is persisted as a versioned property_plan row
 * The AI images also land in Documents. Intended to run once the intake is
 * submitted; the score/concept, if present, sharpen the layout.
 */
export async function runPlans(propertyId: string): Promise<ActionResult<{ floorSpaces: number; siteElements: number }>> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to generate plans." }
  }

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  const [intake, assessment, concept] = await Promise.all([
    getIntake(propertyId),
    getLatestAssessment(propertyId),
    getLatestConcept(propertyId),
  ])

  const context = {
    property: {
      name: prop.name,
      type: prop.propertyType,
      squareFootage: prop.squareFootage,
      floors: prop.floors,
      yearBuilt: prop.yearBuilt,
      location: [prop.city, prop.region, prop.country].filter(Boolean).join(", "),
    },
    intakeAnswers: (intake?.answers as Record<string, unknown>) ?? {},
    assessment: assessment ? { score: assessment.roboReadyScore, summary: assessment.summary } : null,
    concept: concept ? { title: concept.title, pickupZones: concept.pickupZones } : null,
  }

  try {
    const job = await runJob<typeof context, SitePlanDesignOutput>({
      ctx,
      propertyId,
      employeeSlug: "site-designer",
      jobType: "site-plan",
      input: context,
    })

    // Render both illustrations in parallel; failures degrade to schematic-only.
    const [floorPlanImageUrl, sitePlanImageUrl] = await Promise.all([
      renderPlanImage(ctx, propertyId, job.output.floorPlanImagePrompt, "AI floor plan (interior)", "floor-plan"),
      renderPlanImage(ctx, propertyId, job.output.sitePlanImagePrompt, "AI site plan (exterior)", "site-plan"),
    ])

    const narrative = [job.output.floorPlan?.summary, job.output.sitePlan?.summary].filter(Boolean).join("\n\n")
    const prev = (await getPlan(propertyId))?.version ?? 0

    await db.insert(propertyPlan).values({
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      aiJobId: job.jobId,
      narrative,
      floorPlan: job.output.floorPlan,
      sitePlan: job.output.sitePlan,
      floorPlanImageUrl,
      sitePlanImageUrl,
      version: prev + 1,
    })

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "plans.completed",
      entityType: "property_plan",
      entityId: propertyId,
    })

    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath("/dashboard/activity")
    return {
      ok: true,
      data: {
        floorSpaces: job.output.floorPlan?.spaces?.length ?? 0,
        siteElements: job.output.sitePlan?.elements?.length ?? 0,
      },
    }
  } catch (err) {
    console.log("[v0] runPlans failed:", (err as Error).message)
    return { ok: false, error: "The plans could not be generated. Please try again." }
  }
}
