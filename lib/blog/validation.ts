import { z } from "zod"

export const BLOG_CATEGORIES = ["industry-news", "event-coverage", "field-notes", "research", "guides"] as const
export const BLOG_CATEGORY_LABELS: Record<(typeof BLOG_CATEGORIES)[number], string> = {
  "industry-news": "Industry news",
  "event-coverage": "Event coverage",
  "field-notes": "Field notes",
  research: "Research",
  guides: "Guides",
}
export const BLOG_PAGE_SIZE = 9
export const BLOG_API_BODY_LIMIT = 256 * 1024
export const BLOG_UPLOAD_MAX_BYTES = 50 * 1024 * 1024
export const BLOG_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"] as const
export const BLOG_MEDIA_EXTENSION: Record<(typeof BLOG_UPLOAD_TYPES)[number], string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm",
}

const httpsUrl = z.string().trim().url().max(2048).refine((value) => {
  try { return new URL(value).protocol === "https:" } catch { return false }
}, "Use an HTTPS URL")

export const sourceSchema = z.object({
  label: z.string().trim().min(1).max(160),
  url: httpsUrl,
  publishedAt: z.string().trim().max(40).optional(),
})

export const mediaSchema = z.object({
  url: httpsUrl,
  pathname: z.string().trim().min(1).max(512),
  contentType: z.enum(BLOG_UPLOAD_TYPES),
  mediaType: z.enum(["image", "video"]),
  altText: z.string().trim().max(300).default(""),
  caption: z.string().trim().max(500).optional().default(""),
  transcript: z.string().trim().max(12000).optional().default(""),
  sortOrder: z.number().int().min(0).max(30).default(0),
}).superRefine((media, context) => {
  if (!media.pathname.startsWith("blog/")) context.addIssue({ code: "custom", path: ["pathname"], message: "Media must use the blog upload path." })
  if ((media.mediaType === "image") !== media.contentType.startsWith("image/")) {
    context.addIssue({ code: "custom", path: ["mediaType"], message: "Media type and content type must match." })
  }
})

const articleFields = {
  title: z.string().trim().min(5).max(180),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().min(20).max(420),
  body: z.string().trim().min(40).max(50000),
  category: z.enum(BLOG_CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  authorName: z.string().trim().min(2).max(120),
  authorRole: z.string().trim().max(160).optional().default(""),
  sources: z.array(sourceSchema).max(12).default([]),
  seoTitle: z.string().trim().max(180).optional().default(""),
  seoDescription: z.string().trim().max(320).optional().default(""),
  canonicalUrl: httpsUrl.optional().or(z.literal("")),
  media: z.array(mediaSchema).max(30).default([]),
}

export const blogArticleSchema = z.object({
  ...articleFields,
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledAt: z.string().datetime().optional(),
}).superRefine((article, context) => {
  if (article.status === "scheduled" && !article.scheduledAt) {
    context.addIssue({ code: "custom", path: ["scheduledAt"], message: "Choose a publication date for scheduled posts." })
  }
  if (article.status === "published" && article.category === "industry-news" && article.sources.length === 0) {
    context.addIssue({ code: "custom", path: ["sources"], message: "Industry news requires at least one source link." })
  }
})

export const staffGptArticleSchema = z.object({
  version: z.literal(1),
  idempotencyKey: z.string().trim().min(8).max(160).regex(/^[A-Za-z0-9:_-]+$/),
  article: z.object(articleFields).superRefine((article, context) => {
    if (article.category === "industry-news" && article.sources.length === 0) {
      context.addIssue({ code: "custom", path: ["sources"], message: "Industry news requires at least one source link." })
    }
  }),
})

export function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180)
}

export function parseSourceLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label, url, publishedAt] = line.split("|").map((part) => part.trim())
    return { label: label ?? "", url: url ?? "", ...(publishedAt ? { publishedAt } : {}) }
  })
}

export function parseTagList(value: string) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 12)
}

export function formatBlogDate(value: Date | string | null | undefined) {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(date)
}

export function sourceLines(sources: Array<{ label: string; url: string; publishedAt?: string | null }>) {
  return sources.map((source) => [source.label, source.url, source.publishedAt ?? ""].join(" | ")).join("\n")
}

export function safeArticleCanonical(slug: string, canonicalUrl?: string | null) {
  if (canonicalUrl) {
    try { if (new URL(canonicalUrl).protocol === "https:") return canonicalUrl } catch { /* use the site canonical */ }
  }
  return `https://roboready.net/blog/${encodeURIComponent(slug)}`
}

export function structuredJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export function stripMarkdown(value: string) {
  return value.replace(/```[\s\S]*?```/g, " ").replace(/`([^`]+)`/g, "$1").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[#>*_~]/g, "").replace(/\s+/g, " ").trim()
}

export function isBlogPostPublic(status: string, scheduledAt: Date | null, publishedAt: Date | null, now = new Date()) {
  return (status === "published" && (!publishedAt || publishedAt <= now)) || (status === "scheduled" && Boolean(scheduledAt && scheduledAt <= now))
}

export type BlogMediaInput = z.infer<typeof mediaSchema>
export type BlogArticleInput = z.infer<typeof blogArticleSchema>
export type StaffGptArticleInput = z.infer<typeof staffGptArticleSchema>
export type BlogCategory = (typeof BLOG_CATEGORIES)[number]
export type BlogStatus = "draft" | "scheduled" | "published" | "archived"
