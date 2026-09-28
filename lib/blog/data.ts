import "server-only"

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { blogApiRateBucket, blogMedia, blogPost, blogSettings } from "@/lib/db/schema"
import type { BlogMediaItem, BlogPost, BlogPostInput, BlogSettings, BlogSource } from "@/lib/blog/types"

const DEFAULT_SETTINGS: BlogSettings = { visible: false, staffgptAutoPublish: false }

type PostRow = typeof blogPost.$inferSelect

function mapPost(row: PostRow, media: BlogMediaItem[] = []): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    body: row.body,
    category: row.category as BlogPost["category"],
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    authorName: row.authorName,
    authorRole: row.authorRole,
    sources: Array.isArray(row.sources) ? (row.sources as BlogSource[]) : [],
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    canonicalUrl: row.canonicalUrl,
    status: row.status as BlogPost["status"],
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    media,
  }
}

async function loadMedia(postIds: string[]) {
  if (!postIds.length) return new Map<string, BlogMediaItem[]>()
  const rows = await db.select().from(blogMedia).where(inArray(blogMedia.postId, postIds)).orderBy(blogMedia.sortOrder, blogMedia.createdAt)
  const grouped = new Map<string, BlogMediaItem[]>()
  for (const row of rows) {
    const items = grouped.get(row.postId) ?? []
    items.push({
      id: row.id,
      postId: row.postId,
      url: row.url,
      pathname: row.pathname,
      contentType: row.contentType,
      mediaType: row.mediaType as BlogMediaItem["mediaType"],
      altText: row.altText,
      caption: row.caption,
      transcript: row.transcript,
      sortOrder: row.sortOrder,
    })
    grouped.set(row.postId, items)
  }
  return grouped
}

export async function getBlogSettings(): Promise<BlogSettings> {
  const [row] = await db.select().from(blogSettings).where(eq(blogSettings.id, "global")).limit(1)
  return row ? { visible: row.visible, staffgptAutoPublish: row.staffgptAutoPublish } : DEFAULT_SETTINGS
}

export async function updateBlogSettings(values: Partial<BlogSettings>, userId: string) {
  const current = await getBlogSettings()
  await db.insert(blogSettings).values({
    id: "global",
    visible: values.visible ?? current.visible,
    staffgptAutoPublish: values.staffgptAutoPublish ?? current.staffgptAutoPublish,
    updatedByUserId: userId,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: blogSettings.id,
    set: {
      visible: values.visible ?? current.visible,
      staffgptAutoPublish: values.staffgptAutoPublish ?? current.staffgptAutoPublish,
      updatedByUserId: userId,
      updatedAt: new Date(),
    },
  })
}

export async function listBlogPosts(options: { admin?: boolean; category?: string; limit?: number } = {}) {
  const filters = []
  if (!options.admin) filters.push(eq(blogPost.status, "published"))
  if (options.category) filters.push(eq(blogPost.category, options.category))
  const rows = await db.select().from(blogPost).where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(blogPost.publishedAt), desc(blogPost.updatedAt)).limit(options.limit ?? 100)
  const mediaByPost = await loadMedia(rows.map((row) => row.id))
  return rows.map((row) => mapPost(row, mediaByPost.get(row.id) ?? []))
}

export async function getBlogPostBySlug(slug: string, includeUnpublished = false) {
  const filters = [eq(blogPost.slug, slug)]
  if (!includeUnpublished) filters.push(eq(blogPost.status, "published"))
  const [row] = await db.select().from(blogPost).where(and(...filters)).limit(1)
  if (!row) return null
  const mediaByPost = await loadMedia([row.id])
  return mapPost(row, mediaByPost.get(row.id) ?? [])
}

export async function getBlogPostById(id: string) {
  const [row] = await db.select().from(blogPost).where(eq(blogPost.id, id)).limit(1)
  if (!row) return null
  const mediaByPost = await loadMedia([row.id])
  return mapPost(row, mediaByPost.get(row.id) ?? [])
}

export async function saveBlogPost(input: BlogPostInput, userId: string, id?: string) {
  const now = new Date()
  const publishedAt = input.status === "published" ? (id ? undefined : now) : null
  const values = {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    body: input.body,
    category: input.category,
    tags: input.tags,
    authorName: input.authorName,
    authorRole: input.authorRole ?? null,
    sources: input.sources,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    canonicalUrl: input.canonicalUrl ?? null,
    status: input.status,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
    publishedAt,
    updatedByUserId: userId,
    updatedAt: now,
  }
  if (id) {
    await db.update(blogPost).set(values).where(eq(blogPost.id, id))
    return id
  }
  const newId = crypto.randomUUID()
  await db.insert(blogPost).values({ ...values, id: newId, creationSource: "manual", createdByUserId: userId })
  return newId
}

export async function setBlogPostStatus(id: string, status: BlogPost["status"], userId: string) {
  const now = new Date()
  await db.update(blogPost).set({
    status,
    publishedAt: status === "published" ? now : null,
    updatedByUserId: userId,
    updatedAt: now,
  }).where(eq(blogPost.id, id))
}

export async function deleteBlogPost(id: string) {
  await db.delete(blogPost).where(eq(blogPost.id, id))
}

export async function addBlogMedia(input: Omit<BlogMediaItem, "id">) {
  const id = crypto.randomUUID()
  await db.insert(blogMedia).values({ ...input, id })
  return id
}

export async function removeBlogMedia(id: string) {
  await db.delete(blogMedia).where(eq(blogMedia.id, id))
}

export async function consumeBlogApiRateLimit(rateKey: string, limit = 30) {
  const now = new Date()
  const bucketStart = new Date(now)
  bucketStart.setUTCSeconds(0, 0)
  const [row] = await db.insert(blogApiRateBucket).values({ rateKey, bucketStart, requestCount: 1 })
    .onConflictDoUpdate({
      target: [blogApiRateBucket.rateKey, blogApiRateBucket.bucketStart],
      set: { requestCount: sql`${blogApiRateBucket.requestCount} + 1` },
    }).returning({ requestCount: blogApiRateBucket.requestCount })
  await db.delete(blogApiRateBucket).where(lt(blogApiRateBucket.bucketStart, new Date(now.getTime() - 48 * 60 * 60 * 1000)))
  return row.requestCount <= limit
}

export async function saveStaffGptPost(input: BlogPostInput, idempotencyKey: string, autoPublish: boolean) {
  const now = new Date()
  const existing = await db.select({ id: blogPost.id, publishedAt: blogPost.publishedAt }).from(blogPost)
    .where(eq(blogPost.externalIdempotencyKey, idempotencyKey)).limit(1)
  const id = existing[0]?.id ?? crypto.randomUUID()
  const status = autoPublish ? "published" : "draft"
  const values = {
    id,
    ...input,
    status,
    scheduledAt: null,
    publishedAt: autoPublish ? existing[0]?.publishedAt ?? now : null,
    externalIdempotencyKey: idempotencyKey,
    creationSource: "staffgpt" as const,
    updatedAt: now,
  }
  await db.insert(blogPost).values({ ...values, createdByUserId: null, updatedByUserId: null })
    .onConflictDoUpdate({
      target: blogPost.externalIdempotencyKey,
      set: {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        body: input.body,
        category: input.category,
        tags: input.tags,
        authorName: input.authorName,
        authorRole: input.authorRole ?? null,
        sources: input.sources,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        canonicalUrl: input.canonicalUrl ?? null,
        status,
        publishedAt: autoPublish ? existing[0]?.publishedAt ?? now : null,
        updatedAt: now,
      },
    })
  return { id, status }
}
