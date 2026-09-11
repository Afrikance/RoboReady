"use server"

import { and, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { intakeSubmission, property } from "@/lib/db/schema"
import { assertRole, hasRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { runJob } from "@/lib/ai/orchestrator"
import { INTAKE_SECTIONS, type IntakeField } from "@/lib/intake/questions"
import type { IntakePrefillOutput, ProspectPropertiesOutput } from "@/lib/ai/schemas"
import type { ActionResult } from "@/app/actions/properties"

// The metadata.pipeline shape stored on a property throughout the funnel.
type Pipeline = {
  source?: "ai" | "manual"
  prospectJobId?: string
  prefill?: { jobId: string; filled: string[]; leftBlank: string[]; summary: string; at: string }
  verification?: { byUserId: string; at: string; note?: string }
  returnedToField?: { byUserId: string; at: string; note: string }
}

function readPipeline(metadata: unknown): Pipeline {
  if (metadata && typeof metadata === "object" && "pipeline" in metadata) {
    return ((metadata as { pipeline?: Pipeline }).pipeline ?? {}) as Pipeline
  }
  return {}
}

function mergePipeline(metadata: unknown, next: Pipeline): Record<string, unknown> {
  const base = (metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {}) ?? {}
  const current = readPipeline(metadata)
  return { ...base, pipeline: { ...current, ...next } }
}

const FIELD_BY_ID = new Map<string, IntakeField>(
  INTAKE_SECTIONS.flatMap((s) => s.fields).map((f) => [f.id, f]),
)

/** Coerces a stringified AI answer to the intake field's real value type. */
function coerceAnswer(field: IntakeField, raw: string): unknown {
  const v = raw.trim()
  if (v === "") return undefined
  switch (field.type) {
    case "number": {
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }
    case "boolean":
      return v.toLowerCase() === "true" || v.toLowerCase() === "yes"
    case "multiselect": {
      const picked = v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => (field.options ? field.options.includes(s) : true))
      return picked.length ? picked : undefined
    }
    case "select":
      return field.options && !field.options.includes(v) ? undefined : v
    default:
      return v
  }
}

// ---------------------------------------------------------------------------
// AI prospecting (admin)
// ---------------------------------------------------------------------------

export async function prospectProperties(input: {
  city: string
  region: string
  propertyType: string
  count: number
}): Promise<ActionResult<{ created: number }>> {
  const ctx = await requireOrgContext()
  if (!hasRole(ctx, "admin")) {
    return { ok: false, error: "Only admins can run AI prospecting." }
  }
  const city = input.city?.trim()
  const region = input.region?.trim()
  if (!city || !region) return { ok: false, error: "City and state are required." }
  const count = Math.max(1, Math.min(12, Math.round(input.count || 5)))

  try {
    const job = await runJob<Record<string, unknown>, ProspectPropertiesOutput>({
      ctx,
      employeeSlug: "property-prospector",
      jobType: "prospect-properties",
      input: { city, region, propertyType: input.propertyType || "any", count },
    })

    // Dedupe against existing org properties by name (case-insensitive).
    const existing = await db
      .select({ name: property.name })
      .from(property)
      .where(eq(property.organizationId, ctx.organizationId))
    const seen = new Set(existing.map((e) => e.name.trim().toLowerCase()))

    let created = 0
    for (const c of job.output.candidates.slice(0, count)) {
      const name = c.name?.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      const lat = Number.isFinite(c.latitude) && c.latitude !== 0 ? c.latitude : null
      const lng = Number.isFinite(c.longitude) && c.longitude !== 0 ? c.longitude : null

      await db.insert(property).values({
        id: crypto.randomUUID(),
        organizationId: ctx.organizationId,
        createdByUserId: ctx.user.id,
        name,
        propertyType: c.propertyType || "commercial",
        addressLine1: c.addressLine1?.trim() || null,
        city: c.city?.trim() || city,
        region: c.region?.trim() || region,
        postalCode: c.postalCode?.trim() || null,
        phone: c.phone?.trim() || null,
        latitude: lat,
        longitude: lng,
        status: "prospect",
        metadata: { pipeline: { source: "ai", prospectJobId: job.jobId }, prospectNote: c.note ?? null },
      })
      created++
    }

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "prospect.generated",
      entityType: "property",
      metadata: { city, region, propertyType: input.propertyType, created },
    })

    revalidatePath("/dashboard/properties/database")
    return { ok: true, data: { created } }
  } catch (err) {
    console.log("[v0] prospectProperties failed:", (err as Error).message)
    return { ok: false, error: "AI prospecting could not be completed. Please try again." }
  }
}

// ---------------------------------------------------------------------------
// AI pre-fill + handover (admin/member)
// ---------------------------------------------------------------------------

export async function prefillProperty(propertyId: string): Promise<ActionResult<{ filled: number; blank: number }>> {
  const ctx = await requireOrgContext()
  try {
    assertRole(ctx, "member")
  } catch {
    return { ok: false, error: "You do not have permission to pre-fill intakes." }
  }

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  const fields = INTAKE_SECTIONS.flatMap((s) =>
    s.fields.map((f) => ({ id: f.id, label: f.label, type: f.type, options: f.options ?? null })),
  )

  try {
    const job = await runJob<Record<string, unknown>, IntakePrefillOutput>({
      ctx,
      propertyId,
      employeeSlug: "intake-prefiller",
      jobType: "prefill-intake",
      input: {
        property: {
          name: prop.name,
          type: prop.propertyType,
          location: [prop.city, prop.region, prop.country].filter(Boolean).join(", "),
        },
        fields,
      },
    })

    // Coerce AI answers (medium/high confidence only) into the intake map.
    const aiAnswers: Record<string, unknown> = {}
    const filled: string[] = []
    for (const a of job.output.answers ?? []) {
      const field = FIELD_BY_ID.get(a.fieldId)
      if (!field) continue
      if (a.confidence === "low") continue
      const value = coerceAnswer(field, String(a.value ?? ""))
      if (value === undefined) continue
      aiAnswers[a.fieldId] = value
      filled.push(a.fieldId)
    }
    const leftBlank = (job.output.leftBlank ?? []).filter((id) => FIELD_BY_ID.has(id) && !filled.includes(id))

    // Merge onto any existing draft answers (never clobber human-entered data).
    const existing = await db
      .select()
      .from(intakeSubmission)
      .where(and(eq(intakeSubmission.propertyId, propertyId), eq(intakeSubmission.organizationId, ctx.organizationId)))
      .orderBy(desc(intakeSubmission.updatedAt))
      .limit(1)
    const prior = (existing[0]?.answers as Record<string, unknown>) ?? {}
    const answers = { ...prior, ...aiAnswers }

    if (existing[0]) {
      await db
        .update(intakeSubmission)
        .set({ answers, status: "draft", updatedAt: new Date() })
        .where(eq(intakeSubmission.id, existing[0].id))
    } else {
      await db.insert(intakeSubmission).values({
        id: crypto.randomUUID(),
        organizationId: ctx.organizationId,
        propertyId,
        createdByUserId: ctx.user.id,
        answers,
        status: "draft",
      })
    }

    await db
      .update(property)
      .set({
        status: "handover",
        metadata: mergePipeline(prop.metadata, {
          prefill: { jobId: job.jobId, filled, leftBlank, summary: job.output.summary ?? "", at: new Date().toISOString() },
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "prospect.prefilled",
      entityType: "property",
      entityId: propertyId,
      metadata: { filled: filled.length, blank: leftBlank.length },
    })

    revalidatePath("/dashboard/properties/database")
    revalidatePath("/dashboard/handover")
    revalidatePath(`/dashboard/properties/${propertyId}`)
    return { ok: true, data: { filled: filled.length, blank: leftBlank.length } }
  } catch (err) {
    console.log("[v0] prefillProperty failed:", (err as Error).message)
    return { ok: false, error: "AI pre-fill could not be completed. Please try again." }
  }
}

// ---------------------------------------------------------------------------
// Admin verification queue
// ---------------------------------------------------------------------------

export async function verifyProperty(propertyId: string, note?: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!hasRole(ctx, "admin")) return { ok: false, error: "Only admins can verify properties." }

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  await db
    .update(property)
    .set({
      status: "verified",
      metadata: mergePipeline(prop.metadata, {
        verification: { byUserId: ctx.user.id, at: new Date().toISOString(), note: note?.trim() || undefined },
      }),
      updatedAt: new Date(),
    })
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "property.verified",
    entityType: "property",
    entityId: propertyId,
  })

  revalidatePath("/dashboard/verification")
  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { ok: true, data: undefined }
}

export async function returnToField(propertyId: string, note: string): Promise<ActionResult> {
  const ctx = await requireOrgContext()
  if (!hasRole(ctx, "admin")) return { ok: false, error: "Only admins can return properties to the field." }
  const reason = note?.trim()
  if (!reason) return { ok: false, error: "Please add a note explaining what needs more work." }

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) return { ok: false, error: "Property not found." }

  // Reopen the submitted intake so the field operator can edit it again.
  await db
    .update(intakeSubmission)
    .set({ status: "draft", completedAt: null, updatedAt: new Date() })
    .where(and(eq(intakeSubmission.propertyId, propertyId), eq(intakeSubmission.organizationId, ctx.organizationId)))

  await db
    .update(property)
    .set({
      status: "handover",
      metadata: mergePipeline(prop.metadata, {
        returnedToField: { byUserId: ctx.user.id, at: new Date().toISOString(), note: reason },
      }),
      updatedAt: new Date(),
    })
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "property.returned_to_field",
    entityType: "property",
    entityId: propertyId,
    metadata: { note: reason },
  })

  revalidatePath("/dashboard/verification")
  revalidatePath("/dashboard/handover")
  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Queue list helpers (filtering happens client-side via lib/prospecting/filter)
// ---------------------------------------------------------------------------

async function listByStatus(statuses: string[]) {
  const ctx = await requireOrgContext()
  return db
    .select()
    .from(property)
    .where(and(eq(property.organizationId, ctx.organizationId), inArray(property.status, statuses)))
    .orderBy(desc(property.updatedAt))
}

export async function listProspects() {
  return listByStatus(["prospect"])
}

export async function listHandoverQueue() {
  return listByStatus(["handover"])
}

export async function listVerificationQueue() {
  return listByStatus(["pending_verification"])
}
