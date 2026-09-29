import { del, put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { BLOG_MEDIA_EXTENSION, BLOG_UPLOAD_MAX_BYTES, BLOG_UPLOAD_TYPES } from "@/lib/blog/validation"
import { requireBlogAdmin, safeMediaPathname } from "@/lib/blog/admin"
import { consumeBlogApiRateLimit } from "@/lib/blog/data"
import { recordAudit } from "@/lib/tenancy"

export const runtime = "nodejs"

const allowedTypes = new Set<string>(BLOG_UPLOAD_TYPES)

function hasSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  return Boolean(origin && origin === request.nextUrl.origin)
}

function matchesSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === "image/png") return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))
  if (type === "video/mp4") return String.fromCharCode(...bytes.slice(4, 8)) === "ftyp"
  if (type === "video/webm") return bytes.slice(0, 4).join(",") === "26,69,223,163"
  return false
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  let context
  try {
    context = await requireBlogAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!(await consumeBlogApiRateLimit(`blog-upload:${context.user.id}`, 20))) {
    return NextResponse.json({ error: "Upload limit reached. Try again shortly." }, { status: 429 })
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > BLOG_UPLOAD_MAX_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "Upload exceeds the 50 MB limit." }, { status: 413 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Choose a valid file to upload." }, { status: 400 })
  }
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 })
  if (file.size === 0 || file.size > BLOG_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "Files must be between 1 byte and 50 MB." }, { status: 400 })
  }
  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Use JPEG, PNG, WEBP, GIF, MP4, or WebM media." }, { status: 400 })
  }

  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (!matchesSignature(file.type, signature)) {
    return NextResponse.json({ error: "The file contents do not match the selected media type." }, { status: 400 })
  }

  const extension = BLOG_MEDIA_EXTENSION[file.type as keyof typeof BLOG_MEDIA_EXTENSION]
  const pathname = `blog/${Date.now()}-${crypto.randomUUID()}.${extension}`
  try {
    const blob = await put(pathname, file, { access: "public", contentType: file.type })
    await recordAudit({
      organizationId: context.organizationId,
      userId: context.user.id,
      action: "blog.media_uploaded",
      entityType: "blog_media",
      entityId: pathname,
      metadata: { contentType: file.type, sizeBytes: file.size },
    })
    return NextResponse.json({ url: blob.url, pathname: blob.pathname, contentType: file.type })
  } catch (error) {
    console.error("[v0] blog media upload failed:", error)
    return NextResponse.json({ error: "Media upload failed. Please try again." }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  try {
    await requireBlogAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let pathname: string
  try {
    const body = await request.json()
    pathname = typeof body?.pathname === "string" ? body.pathname : ""
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
  if (!safeMediaPathname(pathname)) return NextResponse.json({ error: "Invalid media path." }, { status: 400 })

  try {
    await del(pathname)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] blog media deletion failed:", error)
    return NextResponse.json({ error: "Media could not be deleted." }, { status: 500 })
  }
}
