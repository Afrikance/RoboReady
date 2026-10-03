"use server"

import { del, put } from "@vercel/blob"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { sitePartner, siteSettings } from "@/lib/db/schema"
import { isAdminRole } from "@/lib/access"
import { getOrgContext, recordAudit } from "@/lib/tenancy"

type ActionResult = { ok: true; id?: string; logoUrl?: string | null } | { ok: false; error: string }

const MAX_LOGO_BYTES = 3 * 1024 * 1024
const IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
])

const partnerFieldsSchema = z.object({
  name: z.string().trim().min(2, "Partner name must be at least 2 characters.").max(80),
  destinationUrl: z.string().max(2048),
  visible: z.boolean(),
  linkActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
})

async function getAdminContext() {
  const ctx = await getOrgContext()
  return ctx && isAdminRole(ctx.role) ? ctx : null
}

function normalizeDestinationUrl(value: string): string | null | undefined {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (url.protocol !== "https:" || url.username || url.password) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

async function validateLogo(file: File): Promise<string | null> {
  if (file.size > MAX_LOGO_BYTES) return "Partner logos must be 3 MB or smaller."
  const extension = IMAGE_TYPES.get(file.type)
  if (!extension) return "Use a PNG, JPG, or WEBP image."

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const png = file.type === "image/png" && bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  const jpeg = file.type === "image/jpeg" && bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const webp = file.type === "image/webp" && bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"

  return png || jpeg || webp ? null : "The selected file does not match its image type."
}

export async function saveSitePartner(formData: FormData): Promise<ActionResult> {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: "You do not have permission to manage partners." }

  const id = String(formData.get("id") ?? "").trim()
  const name = String(formData.get("name") ?? "")
  const destinationInput = String(formData.get("destinationUrl") ?? "")
  const visible = formData.get("visible") === "true"
  const linkActive = formData.get("linkActive") === "true"
  const sortOrder = Number(formData.get("sortOrder"))
  const parsed = partnerFieldsSchema.safeParse({ name, destinationUrl: destinationInput, visible, linkActive, sortOrder })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the partner details." }

  const destinationUrl = normalizeDestinationUrl(parsed.data.destinationUrl)
  if (destinationUrl === undefined) return { ok: false, error: "Enter a valid HTTPS destination URL." }
  if (parsed.data.linkActive && !destinationUrl) {
    return { ok: false, error: "Add a destination URL before activating the partner link." }
  }

  const existing = id
    ? (await db.select().from(sitePartner).where(eq(sitePartner.id, id)).limit(1))[0]
    : undefined
  if (id && !existing) return { ok: false, error: "Partner not found." }

  const logoEntry = formData.get("logo")
  const logoFile = logoEntry && typeof logoEntry !== "string" && logoEntry.size > 0 ? logoEntry : null
  if (logoFile) {
    const logoError = await validateLogo(logoFile)
    if (logoError) return { ok: false, error: logoError }
  }

  let uploaded: { url: string; pathname: string } | null = null
  if (logoFile) {
    try {
      const extension = IMAGE_TYPES.get(logoFile.type)!
      uploaded = await put(`site-partners/${crypto.randomUUID()}.${extension}`, logoFile, { access: "public" })
    } catch (error) {
      console.error("[v0] partner logo upload failed:", error)
      return { ok: false, error: "Logo upload failed. Please try again." }
    }
  }

  const partnerId = id || crypto.randomUUID()
  const now = new Date()
  try {
    if (existing) {
      await db
        .update(sitePartner)
        .set({
          name: parsed.data.name,
          destinationUrl,
          visible: parsed.data.visible,
          linkActive: parsed.data.linkActive,
          sortOrder: parsed.data.sortOrder,
          ...(uploaded ? { logoUrl: uploaded.url, logoPathname: uploaded.pathname } : {}),
          updatedAt: now,
        })
        .where(eq(sitePartner.id, partnerId))
    } else {
      await db.insert(sitePartner).values({
        id: partnerId,
        name: parsed.data.name,
        destinationUrl,
        visible: parsed.data.visible,
        linkActive: parsed.data.linkActive,
        sortOrder: parsed.data.sortOrder,
        logoUrl: uploaded?.url ?? null,
        logoPathname: uploaded?.pathname ?? null,
        createdAt: now,
        updatedAt: now,
      })
    }
  } catch (error) {
    if (uploaded) await del(uploaded.pathname).catch((cleanupError) => console.error("[v0] orphan logo cleanup failed:", cleanupError))
    console.error("[v0] partner save failed:", error)
    return { ok: false, error: "Could not save this partner. Please try again." }
  }

  if (uploaded && existing?.logoPathname) {
    await del(existing.logoPathname).catch((error) => console.error("[v0] replaced partner logo cleanup failed:", error))
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: existing ? "site_partner.updated" : "site_partner.created",
    entityType: "site_partner",
    entityId: partnerId,
    metadata: {
      name: parsed.data.name,
      visible: parsed.data.visible,
      linkActive: parsed.data.linkActive,
      destinationUrl,
      sortOrder: parsed.data.sortOrder,
      logoReplaced: Boolean(uploaded),
    },
  })

  revalidatePath("/")
  revalidatePath("/dashboard/settings")
  return { ok: true, id: partnerId, logoUrl: uploaded?.url ?? existing?.logoUrl ?? null }
}

export async function deleteSitePartner(id: string): Promise<ActionResult> {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: "You do not have permission to manage partners." }
  if (typeof id !== "string" || !id.trim() || id.length > 100) {
    return { ok: false, error: "Invalid partner." }
  }

  const partner = (await db.select().from(sitePartner).where(eq(sitePartner.id, id)).limit(1))[0]
  if (!partner) return { ok: false, error: "Partner not found." }

  await db.delete(sitePartner).where(eq(sitePartner.id, id))
  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "site_partner.deleted",
    entityType: "site_partner",
    entityId: id,
    metadata: { name: partner.name },
  })

  if (partner.logoPathname) {
    await del(partner.logoPathname).catch((error) => console.error("[v0] deleted partner logo cleanup failed:", error))
  }

  revalidatePath("/")
  revalidatePath("/dashboard/settings")
  return { ok: true }
}

export async function updatePartnerDisplaySettings(input: {
  visible: boolean
  marquee: boolean
}): Promise<ActionResult> {
  const ctx = await getAdminContext()
  if (!ctx) return { ok: false, error: "You do not have permission to manage partners." }
  if (!input || typeof input.visible !== "boolean" || typeof input.marquee !== "boolean") {
    return { ok: false, error: "Invalid partner display settings." }
  }

  const now = new Date()
  await db
    .insert(siteSettings)
    .values({
      id: "global",
      partnersVisible: input.visible,
      partnerMarquee: input.marquee,
      updatedByUserId: ctx.user.id,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        partnersVisible: input.visible,
        partnerMarquee: input.marquee,
        updatedByUserId: ctx.user.id,
        updatedAt: now,
      },
    })

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "site_settings.partner_display_updated",
    entityType: "site_settings",
    entityId: "global",
    metadata: { partnersVisible: input.visible, partnerMarquee: input.marquee },
  })

  revalidatePath("/")
  revalidatePath("/dashboard/settings")
  return { ok: true }
}

