import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { db } from "@/lib/db"
import { document } from "@/lib/db/schema"
import { requireOrgContext, recordAudit } from "@/lib/tenancy"
import { getProperty } from "@/app/actions/properties"

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain",
])

export async function POST(request: NextRequest) {
  let ctx
  try {
    ctx = await requireOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get("file") as File | null
  const propertyId = form.get("propertyId") as string | null
  const category = (form.get("category") as string | null) || "general"

  if (!file || !propertyId) {
    return NextResponse.json({ error: "Missing file or property." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 25 MB limit." }, { status: 400 })
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 })
  }

  // Ownership: the property must belong to the caller's org.
  const prop = await getProperty(propertyId)
  if (!prop) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
  const pathname = `orgs/${ctx.organizationId}/properties/${propertyId}/${crypto.randomUUID()}-${safeName}`

  try {
    const blob = await put(pathname, file, { access: "private" })

    const id = crypto.randomUUID()
    await db.insert(document).values({
      id,
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      name: file.name.slice(0, 200),
      category,
      url: blob.pathname, // store the pathname; served via /api/documents/file
      contentType: file.type || null,
      sizeBytes: file.size,
    })

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "document.uploaded",
      entityType: "document",
      entityId: id,
      metadata: { propertyId, name: file.name },
    })

    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error("[v0] document upload failed:", error)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}
