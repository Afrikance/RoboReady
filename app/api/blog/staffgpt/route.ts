import { createHash } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { recordAudit, PLATFORM_ORG_ID } from "@/lib/tenancy"
import { BLOG_API_BODY_LIMIT, staffGptArticleSchema } from "@/lib/blog/validation"
import { hasStaffGptBlogSecret, safeTokenEqual, STAFFGPT_BLOG_SECRET } from "@/lib/blog/admin"
import { consumeBlogApiRateLimit, getBlogSettings, saveStaffGptPost } from "@/lib/blog/data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function rateKey(request: NextRequest) {
  const source = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
  return createHash("sha256").update(source).digest("hex").slice(0, 32)
}

async function readBoundedBody(request: Request, maxBytes: number) {
  const reader = request.body?.getReader()
  if (!reader) return ""
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error("BODY_TOO_LARGE")
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function tokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? ""
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim()
  return request.headers.get("x-staffgpt-blog-secret") ?? ""
}

export async function GET() {
  return NextResponse.json({
    name: "RoboReady Blog Publishing API",
    version: 1,
    method: "POST",
    authentication: "Authorization: Bearer <STAFFGPT_BLOG_SECRET>",
    idempotency: "Send a stable idempotencyKey with each article revision; repeated keys return the original post.",
    required: ["version", "idempotencyKey", "article"],
    response: { ok: true, postId: "uuid", status: "draft|published", duplicate: false },
  }, { headers: { "Cache-Control": "public, max-age=3600" } })
}

export async function POST(request: NextRequest) {
  if (!(await consumeBlogApiRateLimit(`staffgpt:${rateKey(request)}`, 30))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  if (!hasStaffGptBlogSecret() || !STAFFGPT_BLOG_SECRET) {
    return NextResponse.json({ error: "publishing_not_configured" }, { status: 503 })
  }
  const supplied = tokenFromRequest(request)
  if (!supplied || !safeTokenEqual(supplied, STAFFGPT_BLOG_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > BLOG_API_BODY_LIMIT) return NextResponse.json({ error: "payload_too_large" }, { status: 413 })

  let payload: unknown
  try {
    const text = await readBoundedBody(request, BLOG_API_BODY_LIMIT)
    payload = JSON.parse(text)
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "BODY_TOO_LARGE"
    return NextResponse.json({ error: tooLarge ? "payload_too_large" : "invalid_json" }, { status: tooLarge ? 413 : 400 })
  }

  const parsed = staffGptArticleSchema.safeParse(payload)
  if (!parsed.success) {
    await recordAudit({
      organizationId: PLATFORM_ORG_ID,
      userId: null,
      action: "blog.staffgpt_rejected",
      entityType: "blog_post",
      metadata: { reason: "validation", issueCount: parsed.error.issues.length },
    })
    return NextResponse.json({ error: "invalid_payload", issues: parsed.error.issues.map(({ path, message }) => ({ path, message })) }, { status: 422 })
  }

  try {
    const settings = await getBlogSettings()
    const result = await saveStaffGptPost(parsed.data.article, parsed.data.idempotencyKey, settings.staffgptAutoPublish)
    await recordAudit({
      organizationId: PLATFORM_ORG_ID,
      userId: null,
      action: result.duplicate ? "blog.staffgpt_duplicate" : result.status === "published" ? "blog.staffgpt_published" : "blog.staffgpt_draft_created",
      entityType: "blog_post",
      entityId: result.id,
      metadata: { idempotencyKey: parsed.data.idempotencyKey, status: result.status },
    })
    return NextResponse.json({ ok: true, postId: result.id, status: result.status, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    console.error("[v0] StaffGPT blog import failed:", message)
    return NextResponse.json({ error: message.includes("unique constraint") ? "slug_conflict" : "import_failed" }, { status: message.includes("unique constraint") ? 409 : 500 })
  }
}
