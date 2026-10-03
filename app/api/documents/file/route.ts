import { type NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { document } from "@/lib/db/schema"
import { getAuthorizedProperty, requireOrgContext } from "@/lib/tenancy"

export async function GET(request: NextRequest) {
  let ctx
  try {
    ctx = await requireOrgContext()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const pathname = request.nextUrl.searchParams.get("pathname")
  if (!pathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 })
  }

  // Authorize: the pathname must correspond to a document row in the caller's org.
  const [doc] = await db
    .select({ id: document.id, propertyId: document.propertyId, name: document.name })
    .from(document)
    .where(and(eq(document.url, pathname), eq(document.organizationId, ctx.organizationId)))
    .limit(1)

  if (!doc || !(await getAuthorizedProperty(ctx, doc.propertyId, "documents"))) {
    return new NextResponse("Not found", { status: 404 })
  }

  try {
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    })

    if (!result) return new NextResponse("Not found", { status: 404 })

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" },
      })
    }

    const filename = (doc.name || "download").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "download"
    const inlineTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"])

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Content-Disposition": `${inlineTypes.has(result.blob.contentType) ? "inline" : "attachment"}; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    })
  } catch (error) {
    console.error("[v0] serve document failed:", error)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}
