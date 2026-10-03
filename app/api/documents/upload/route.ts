import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { db } from "@/lib/db"
import { document } from "@/lib/db/schema"
import { requireOrgContext, recordAudit } from "@/lib/tenancy"
import { getProperty } from "@/app/actions/properties"
import { consumeRateLimit } from "@/lib/rate-limit"

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB for docs & images
const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200 MB for video

const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/csv",
  "text/plain",
  // Video
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // CAD (browsers frequently report these; often also arrive as octet-stream)
  "image/vnd.dxf",
  "application/dxf",
  "application/dwg",
  "image/vnd.dwg",
])

// CAD and some media files arrive with an empty or generic MIME type, so we
// also accept a small allow-list of extensions as a fallback.
const ALLOWED_EXTENSIONS = new Set(["dxf", "dwg", "mp4", "mov", "webm", "heic", "heif"])

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ""
}

export async function POST(request: NextRequest) {
  let ctx
  try {
    ctx = await requireOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!(await consumeRateLimit(`document-upload:${ctx.user.id}`, 6))) {
    return NextResponse.json({ error: "Too many uploads. Please try again shortly." }, { status: 429 })
  }
  const contentLength = Number(request.headers.get("content-length"))
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return NextResponse.json({ error: "A bounded upload size is required." }, { status: 411 })
  }
  if (contentLength > MAX_VIDEO_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "Upload exceeds the maximum request size." }, { status: 413 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart upload." }, { status: 400 })
  }
  const fileValue = form.get("file")
  const file = fileValue instanceof File ? fileValue : null
  const propertyIdValue = form.get("propertyId")
  const propertyId = typeof propertyIdValue === "string" ? propertyIdValue.trim() : ""
  const categoryValue = form.get("category")
  const category = (typeof categoryValue === "string" ? categoryValue : "general")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || "general"

  if (!file || !propertyId) {
    return NextResponse.json({ error: "Missing file or property." }, { status: 400 })
  }

  const ext = extensionOf(file.name)
  const isVideo = (file.type && file.type.startsWith("video/")) || ["mp4", "mov", "webm"].includes(ext)
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_BYTES
  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 })
  }
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024))
    return NextResponse.json({ error: `File exceeds the ${mb} MB limit.` }, { status: 400 })
  }

  // Accept when the MIME type is allowed, or (for CAD/media whose MIME is often
  // blank or generic) when the file extension is on the allow-list.
  const typeOk = file.type ? ALLOWED.has(file.type) : false
  const extOk = ALLOWED_EXTENSIONS.has(ext)
  if (!typeOk && !extOk) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 })
  }

  // Ownership: the property must belong to the caller's org.
  const prop = await getProperty(propertyId)
  if (!prop) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload"
  const displayName = safeName.slice(0, 200)
  const pathname = `orgs/${ctx.organizationId}/properties/${propertyId}/${crypto.randomUUID()}-${safeName}`

  try {
    const blob = await put(pathname, file, { access: "private" })

    const id = crypto.randomUUID()
    await db.insert(document).values({
      id,
      organizationId: ctx.organizationId,
      propertyId,
      createdByUserId: ctx.user.id,
      name: displayName,
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
