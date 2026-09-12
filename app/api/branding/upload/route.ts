import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { organization } from "@/lib/db/schema"
import { requireOrgContext, recordAudit } from "@/lib/tenancy"
import { canManageTeam } from "@/lib/access"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"])

export async function POST(request: NextRequest) {
  let ctx
  try {
    ctx = await requireOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!canManageTeam(ctx.role)) {
    return NextResponse.json({ error: "You do not have permission to change the logo." }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Missing file." }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Logo must be 5 MB or smaller." }, { status: 400 })
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Use a PNG, JPG, WEBP, SVG, or GIF image." }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
  const pathname = `orgs/${ctx.organizationId}/branding/${crypto.randomUUID()}-${safeName}`

  try {
    // Public: the logo renders as a plain <img src> in the app shell, with no
    // auth proxy in front of it.
    const blob = await put(pathname, file, { access: "public" })

    await db
      .update(organization)
      .set({ logoUrl: blob.url, updatedAt: new Date() })
      .where(eq(organization.id, ctx.organizationId))

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "organization.logo_updated",
      entityType: "organization",
      entityId: ctx.organizationId,
    })

    return NextResponse.json({ ok: true, url: blob.url })
  } catch (error) {
    console.error("[v0] logo upload failed:", error)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}
