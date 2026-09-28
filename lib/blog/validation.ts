import { z } from "zod"

export const BLOG_CATEGORIES = [
  { value: "field-notes", label: "Field notes" },
  { value: "industry-news", label: "Industry news" },
  { value: "guides", label: "Guides" },
  { value: "research", label: "Research" },
  { value: "events", label: "Events" },
] as const

export const BLOG_CATEGORY_VALUES = BLOG_CATEGORIES.map((category) => category.value) as [string, ...string[]]

const httpsUrl = z.string().url().max(2048).refine((value) => new URL(value).protocol === "https:", {
  message: "Use an HTTPS URL.",
})

export const blogSourceSchema = z.object({
  label: z.string().trim().min(1).max(160),
  url: httpsUrl,
  publishedAt: z.string().trim().max(40).optional(),
})

export const blogMediaReferenceSchema = z.object({
  url: httpsUrl.refine((value) => {
    const host = new URL(value).hostname.toLowerCase()
    return host.endsWith(".public.blob.vercel-storage.com")
  }, "Media must be stored in public Vercel Blob."),
  altText: z.string().trim().max(300).default(""),
  caption: z.string().trim().max(500).optional(),
  mediaType: z.enum(["image", "video"]),
})

export const blogPostInputSchema = z.object({
  title: z.string().trim().min(8).max(140),
  slug: z.string().trim().max(160).optional().or(z.literal("")),
  excerpt: z.string().trim().min(30).max(500),
  body: z.string().trim().min(100).max(60000),
  category: z.enum(BLOG_CATEGORY_VALUES),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  authorName: z.string().trim().min(2).max(120),
  authorRole: z.string().trim().max(160).optional().or(z.literal("")),
  sources: z.array(blogSourceSchema).max(15).default([]),
  seoTitle: z.string().trim().max(140).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(300).optional().or(z.literal("")),
  canonicalUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
})

export const staffGptBlogInputSchema = blogPostInputSchema.extend({
  idempotencyKey: z.string().trim().min(12).max(160),
  media: z.array(blogMediaReferenceSchema).max(12).default([]),
})

export type BlogPostInput = z.infer<typeof blogPostInputSchema>
export type BlogMediaReference = z.infer<typeof blogMediaReferenceSchema>
export type BlogSource = z.infer<typeof blogSourceSchema>
