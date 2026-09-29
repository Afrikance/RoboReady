import "server-only"

import { and, count, desc, eq, inArray, lt, lte, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { blogApiRateBucket, blogMedia, blogPost, blogSettings } from "@/lib/db/schema"
import type { BlogMediaItem, BlogPost, BlogPostInput, BlogSettings, BlogSource } from "@/lib/blog/types"
import type { StaffGptArticleInput } from "@/lib/blog/validation"

const DEFAULT_SETTINGS: BlogSettings = { visible: false, staffgptAutoPublish: false }

type PostRow = typeof blogPost.$inferSelect

function mapPost(row: PostRow, media: BlogMediaItem[] = [], now = new Date()): BlogPost {
  const isScheduledAndLive = row.status === "scheduled" && Boolean(row.scheduledAt && row.scheduledAt <= now)
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
    status: isScheduledAndLive ? "published" : row.status as BlogPost["status"],
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt ?? (isScheduledAndLive ? row.scheduledAt : null),
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
      pathname: row.pathname ?? "",
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
  const updates = {
    ...(values.visible === undefined ? {} : { visible: values.visible }),
    ...(values.staffgptAutoPublish === undefined ? {} : { staffgptAutoPublish: values.staffgptAutoPublish }),
    updatedByUserId: userId,
    updatedAt: new Date(),
  }
  if (values.visible === undefined && values.staffgptAutoPublish === undefined) return

  await db.insert(blogSettings).values({
    id: "global",
    visible: values.visible ?? false,
    staffgptAutoPublish: values.staffgptAutoPublish ?? false,
    updatedByUserId: userId,
    updatedAt: new Date(),
  }).onConflictDoUpdate({ target: blogSettings.id, set: updates })
}

function publicPostFilter(now: Date) {
  return or(
    eq(blogPost.status, "published"),
    and(eq(blogPost.status, "scheduled"), lte(blogPost.scheduledAt, now)),
  )
}

function postFilters(options: { admin?: boolean; category?: string }, now: Date) {
  const filters = []
  if (!options.admin) filters.push(publicPostFilter(now))
  if (options.category) filters.push(eq(blogPost.category, options.category))
  return filters
}

export async function countBlogPosts(options: { admin?: boolean; category?: string } = {}) {
  const now = new Date()
  const filters = postFilters(options, now)
  const [row] = await db.select({ total: count() }).from(blogPost).where(filters.length ? and(...filters) : undefined)
  return row?.total ?? 0
}

export async function listBlogPosts(options: { admin?: boolean; category?: string; limit?: number; offset?: number } = {}) {
  const now = new Date()
  const filters = postFilters(options, now)
  const rows = await db.select().from(blogPost).where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(sql`coalesce(${blogPost.publishedAt}, ${blogPost.scheduledAt}, ${blogPost.updatedAt})`))
    .limit(Math.min(Math.max(options.limit ?? 100, 1), 100)).offset(Math.max(options.offset ?? 0, 0))
  const mediaByPost = await loadMedia(rows.map((row) => row.id))
  return rows.map((row) => mapPost(row, mediaByPost.get(row.id) ?? [], now))
}

export async function getBlogPostBySlug(slug: string, includeUnpublished = false) {
  const filters = [eq(blogPost.slug, slug)]
  if (!includeUnpublished) filters.push(publicPostFilter(new Date()))
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

function postValues(input: BlogPostInput, userId: string, publishedAt: Date | null, now: Date) {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    body: input.body,
    category: input.category,
    tags: input.tags,
    authorName: input.authorName,
    authorRole: input.authorRole || null,
    sources: input.sources,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    canonicalUrl: input.canonicalUrl || null,
    status: input.status,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
    publishedAt,
    updatedByUserId: userId,
    updatedAt: now,
  }
}

export async function saveBlogPost(input: BlogPostInput, userId: string, id?: string) {
  const now = new Date()
  return db.transaction(async (tx) => {
    let existing: PostRow | undefined
    if (id) {
      const [row] = await tx.select().from(blogPost).where(eq(blogPost.id, id)).limit(1)
      if (!row) throw new Error("BLOG_POST_NOT_FOUND")
      existing = row
    }

    const publishedAt = input.status === "published"
      ? existing?.publishedAt ?? now
      : null
    const values = postValues(input, userId, publishedAt, now)
    const postId = id ?? crypto.randomUUID()

    if (id) {
      await tx.update(blogPost).set(values).where(eq(blogPost.id, id))
    } else {
      await tx.insert(blogPost).values({ ...values, id: postId, creationSource: "manual", createdByUserId: userId })
    }

    await tx.delete(blogMedia).where(eq(blogMedia.postId, postId))
    if (input.media.length) {
      await tx.insert(blogMedia).values(input.media.map((media) => ({ ...media, id: crypto.randomUUID(), postId })))
    }
    return postId
  })
}

export async function setBlogPostStatus(id: string, status: BlogPost["status"], userId: string) {
  const now = new Date()
  const [existing] = await db.select({ publishedAt: blogPost.publishedAt }).from(blogPost).where(eq(blogPost.id, id)).limit(1)
  if (!existing) throw new Error("BLOG_POST_NOT_FOUND")
  await db.update(blogPost).set({
    status,
    scheduledAt: status === "scheduled" ? undefined : null,
    publishedAt: status === "published" ? existing.publishedAt ?? now : null,
    updatedByUserId: userId,
    updatedAt: now,
  }).where(eq(blogPost.id, id))
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

export async function saveStaffGptPost(input: StaffGptArticleInput["article"], idempotencyKey: string, autoPublish: boolean) {
  const now = new Date()
  const id = crypto.randomUUID()
  const status = autoPublish ? "published" : "draft"
  const [inserted] = await db.transaction(async (tx) => {
    const rows = await tx.insert(blogPost).values({
      id,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body: input.body,
      category: input.category,
      tags: input.tags,
      authorName: input.authorName,
      authorRole: input.authorRole || null,
      sources: input.sources,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      canonicalUrl: input.canonicalUrl || null,
      status,
      scheduledAt: null,
      publishedAt: autoPublish ? now : null,
      externalIdempotencyKey: idempotencyKey,
      creationSource: "staffgpt",
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing({ target: blogPost.externalIdempotencyKey })
      .returning({ id: blogPost.id, status: blogPost.status })

    if (rows[0] && input.media.length) {
      await tx.insert(blogMedia).values(input.media.map((media) => ({ ...media, id: crypto.randomUUID(), postId: rows[0].id })))
    }
    return rows
  })

  if (inserted) return { id: inserted.id, status: inserted.status as BlogPost["status"], duplicate: false }

  const [existing] = await db.select({ id: blogPost.id, status: blogPost.status })
    .from(blogPost).where(eq(blogPost.externalIdempotencyKey, idempotencyKey)).limit(1)
  if (!existing) throw new Error("BLOG_IDEMPOTENCY_LOOKUP_FAILED")
  return { id: existing.id, status: existing.status as BlogPost["status"], duplicate: true }
}

export async function getPublishedBlogSlugs() {
  const now = new Date()
  return db.select({ slug: blogPost.slug, updatedAt: blogPost.updatedAt }).from(blogPost)
    .where(publicPostFilter(now))
    .orderBy(desc(blogPost.updatedAt))
}

export async function getPublishedBlogMedia() {
  const now = new Date()
  const posts = await db.select({ id: blogPost.id }).from(blogPost).where(publicPostFilter(now))
  if (!posts.length) return []
  return db.select().from(blogMedia).where(inArray(blogMedia.postId, posts.map((post) => post.id)))
}

export async function replaceBlogMediaForPost(postId: string, media: BlogPostInput["media"]) {
  await db.transaction(async (tx) => {
    await tx.delete(blogMedia).where(eq(blogMedia.postId, postId))
    if (media.length) {
      await tx.insert(blogMedia).values(media.map((item) => ({ ...item, id: crypto.randomUUID(), postId })))
    }
  })
}

export async function removeBlogMedia(id: string) {
  await db.delete(blogMedia).where(eq(blogMedia.id, id))
}

export async function getBlogPostStatusCounts() {
  const rows = await db.select({ status: blogPost.status, total: count() }).from(blogPost).groupBy(blogPost.status)
  return Object.fromEntries(rows.map((row) => [row.status, row.total])) as Record<string, number>
}

export async function addBlogMedia(input: Omit<BlogMediaItem, "id">) {
  const id = crypto.randomUUID()
  await db.insert(blogMedia).values({ ...input, id })
  return id
}

export async function deleteBlogPost(id: string) {
  await db.delete(blogPost).where(eq(blogPost.id, id))
}

export async function getBlogPostMediaIds(postId: string) {
  return db.select({ id: blogMedia.id, url: blogMedia.url, pathname: blogMedia.pathname }).from(blogMedia).where(eq(blogMedia.postId, postId))
}

export async function getPublishedBlogSummary() {
  const now = new Date()
  const [row] = await db.select({ total: count() }).from(blogPost).where(publicPostFilter(now))
  return row?.total ?? 0
}

export async function getPublishedBlogPostsForSitemap() {
  return getPublishedBlogSlugs()
}

export async function updateBlogSettingsAndReturn(values: Partial<BlogSettings>, userId: string) {
  await updateBlogSettings(values, userId)
  return getBlogSettings()
}

export async function getBlogStatus(id: string) {
  const [row] = await db.select({ status: blogPost.status }).from(blogPost).where(eq(blogPost.id, id)).limit(1)
  return row?.status as BlogPost["status"] | undefined
}

export async function listBlogMedia() {
  return db.select().from(blogMedia).orderBy(desc(blogMedia.createdAt))
}

export async function setBlogPostStatusBySlug(slug: string, status: BlogPost["status"], userId: string) {
  const [row] = await db.select({ id: blogPost.id }).from(blogPost).where(eq(blogPost.slug, slug)).limit(1)
  if (!row) throw new Error("BLOG_POST_NOT_FOUND")
  await setBlogPostStatus(row.id, status, userId)
  return row.id
}

export async function getBlogCategoryCounts() {
  return db.select({ category: blogPost.category, total: count() }).from(blogPost)
    .where(publicPostFilter(new Date())).groupBy(blogPost.category)
}

export async function getBlogPostCategories() {
  return db.selectDistinct({ category: blogPost.category }).from(blogPost)
    .where(publicPostFilter(new Date()))
}

export async function setBlogPostPublishedAtIfMissing(id: string) {
  await db.update(blogPost).set({ publishedAt: new Date() })
    .where(and(eq(blogPost.id, id), eq(blogPost.status, "published"), sql`${blogPost.publishedAt} IS NULL`))
}

export async function getBlogPostForPreview(id: string) {
  return getBlogPostById(id)
}

export async function getBlogPostsByIds(ids: string[]) {
  if (!ids.length) return []
  const rows = await db.select().from(blogPost).where(inArray(blogPost.id, ids))
  const mediaByPost = await loadMedia(rows.map((row) => row.id))
  return rows.map((row) => mapPost(row, mediaByPost.get(row.id) ?? []))
}

export async function getBlogPostCountByStatus(status: BlogPost["status"]) {
  const [row] = await db.select({ total: count() }).from(blogPost).where(eq(blogPost.status, status))
  return row?.total ?? 0
}

export async function listBlogGalleryMedia() {
  const now = new Date()
  const posts = await db.select({ id: blogPost.id }).from(blogPost).where(publicPostFilter(now))
  if (!posts.length) return []
  const postIds = posts.map((post) => post.id)
  const rows = await db.select().from(blogMedia).where(inArray(blogMedia.postId, postIds)).orderBy(blogMedia.sortOrder, blogMedia.createdAt)
  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    url: row.url,
    pathname: row.pathname ?? "",
    contentType: row.contentType,
    mediaType: row.mediaType as BlogMediaItem["mediaType"],
    altText: row.altText,
    caption: row.caption,
    transcript: row.transcript,
    sortOrder: row.sortOrder,
  }))
}

export async function hasBlogPosts() {
  return (await getPublishedBlogSummary()) > 0
}

export async function listBlogPostsForAdmin() {
  return listBlogPosts({ admin: true, limit: 100 })
}

export async function getBlogSettingsOrDefault() {
  return getBlogSettings()
}

export async function getBlogPostBySlugPublic(slug: string) {
  return getBlogPostBySlug(slug, false)
}

export async function countBlogPostsByCategory(category: string) {
  return countBlogPosts({ category })
}

export async function getBlogPostForAdmin(id: string) {
  return getBlogPostById(id)
}

export async function clearBlogApiRateLimitBuckets() {
  await db.delete(blogApiRateBucket).where(lt(blogApiRateBucket.bucketStart, new Date(Date.now() - 48 * 60 * 60 * 1000)))
}

export async function incrementBlogApiRateBucket(rateKey: string) {
  return consumeBlogApiRateLimit(rateKey)
}

export async function listBlogPostsPaginated(options: { category?: string; page: number; pageSize: number }) {
  const [posts, total] = await Promise.all([
    listBlogPosts({ category: options.category, limit: options.pageSize, offset: (options.page - 1) * options.pageSize }),
    countBlogPosts({ category: options.category }),
  ])
  return { posts, total }
}

export async function saveStaffGptPostDraft(input: StaffGptArticleInput["article"], idempotencyKey: string) {
  return saveStaffGptPost(input, idempotencyKey, false)
}

export async function publishStaffGptPost(input: StaffGptArticleInput["article"], idempotencyKey: string) {
  return saveStaffGptPost(input, idempotencyKey, true)
}

export async function createBlogMedia(input: Omit<BlogMediaItem, "id">) {
  return addBlogMedia(input)
}

export async function saveBlogSettings(values: Partial<BlogSettings>, userId: string) {
  return updateBlogSettings(values, userId)
}

export async function countAllBlogPosts() {
  return countBlogPosts({ admin: true })
}

export async function listAllBlogPosts() {
  return listBlogPosts({ admin: true })
}

export async function getBlogPostBySlugForAdmin(slug: string) {
  return getBlogPostBySlug(slug, true)
}

export async function getBlogMediaForPost(postId: string) {
  return loadMedia([postId]).then((media) => media.get(postId) ?? [])
}

export async function updateBlogPost(input: BlogPostInput, userId: string, id: string) {
  return saveBlogPost(input, userId, id)
}

export async function createBlogPost(input: BlogPostInput, userId: string) {
  return saveBlogPost(input, userId)
}

export async function publishBlogPost(id: string, userId: string) {
  return setBlogPostStatus(id, "published", userId)
}

export async function archiveBlogPost(id: string, userId: string) {
  return setBlogPostStatus(id, "archived", userId)
}

export async function getBlogPublicPage(category: string | undefined, page: number, pageSize: number) {
  return listBlogPostsPaginated({ category, page, pageSize })
}

export async function getBlogSitemapRows() {
  return getPublishedBlogSlugs()
}

export async function getBlogMediaPublic() {
  return getPublishedBlogMedia()
}

export async function countBlogPublicPosts() {
  return getPublishedBlogSummary()
}

export async function updateBlogSettingsForAdmin(values: Partial<BlogSettings>, userId: string) {
  return updateBlogSettings(values, userId)
}

export async function setBlogPostStatusForAdmin(id: string, status: BlogPost["status"], userId: string) {
  return setBlogPostStatus(id, status, userId)
}

export async function getBlogPublicCategoryCounts() {
  return getBlogCategoryCounts()
}

export async function readBlogSettings() {
  return getBlogSettings()
}

export async function queryBlogPostBySlug(slug: string) {
  return getBlogPostBySlug(slug)
}

export async function getBlogAdminStatusCounts() {
  return getBlogPostStatusCounts()
}

export async function findBlogPost(id: string) {
  return getBlogPostById(id)
}

export async function findBlogPosts(options: { admin?: boolean; category?: string; limit?: number; offset?: number } = {}) {
  return listBlogPosts(options)
}

export async function listPublishedBlogPosts() {
  return listBlogPosts({ limit: 100 })
}

export async function addMediaToPost(input: Omit<BlogMediaItem, "id">) {
  return addBlogMedia(input)
}

export async function removeMediaFromPost(id: string) {
  return removeBlogMedia(id)
}

export async function updateGlobalBlogSettings(values: Partial<BlogSettings>, userId: string) {
  return updateBlogSettings(values, userId)
}

export async function getPublicBlogSettings() {
  return getBlogSettings()
}

export async function getBlogPostForPage(slug: string) {
  return getBlogPostBySlug(slug)
}

export async function getBlogPostForEditor(id: string) {
  return getBlogPostById(id)
}

export async function listRecentBlogPosts(limit = 3) {
  return listBlogPosts({ limit })
}

export async function listAdminBlogPosts(limit = 100) {
  return listBlogPosts({ admin: true, limit })
}

export async function getBlogPublicSitemapPosts() {
  return getPublishedBlogSlugs()
}

export async function getBlogPostBySlugForPublic(slug: string) {
  return getBlogPostBySlug(slug)
}

export async function createStaffGptBlogPost(input: StaffGptArticleInput["article"], idempotencyKey: string, autoPublish: boolean) {
  return saveStaffGptPost(input, idempotencyKey, autoPublish)
}

export async function getBlogSettingsForAdmin() {
  return getBlogSettings()
}

export async function updateBlogVisibility(visible: boolean, userId: string) {
  return updateBlogSettings({ visible }, userId)
}

export async function updateStaffGptAutopublish(enabled: boolean, userId: string) {
  return updateBlogSettings({ staffgptAutoPublish: enabled }, userId)
}

export async function hasPublicBlog() {
  const [row] = await db.select({ total: count() }).from(blogPost).where(publicPostFilter(new Date()))
  return (row?.total ?? 0) > 0
}

export async function searchBlogPosts(query: string, limit = 20) {
  const normalized = query.trim().slice(0, 100)
  if (!normalized) return []
  const rows = await db.select().from(blogPost).where(and(
    publicPostFilter(new Date()),
    sql`(${blogPost.title} ILIKE ${`%${normalized}%`} OR ${blogPost.excerpt} ILIKE ${`%${normalized}%`})`,
  )).orderBy(desc(blogPost.publishedAt)).limit(limit)
  const mediaByPost = await loadMedia(rows.map((row) => row.id))
  return rows.map((row) => mapPost(row, mediaByPost.get(row.id) ?? []))
}

export async function listPublishedBlogSlugs() {
  return getPublishedBlogSlugs()
}

export async function getBlogAdminOverview() {
  const [posts, counts] = await Promise.all([listBlogPosts({ admin: true, limit: 100 }), getBlogPostStatusCounts()])
  return { posts, counts }
}
