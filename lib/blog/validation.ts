import { z } from "zod"

export const BLOG_CATEGORIES = [
  { value: "field-notes", label: "Field notes" },
  { value: "property-guides", label: "Property guides" },
  { value: "robotaxi", label: "Robotaxi & AVs" },
  { value: "delivery-robots", label: "Delivery robotics" },
  { value: "drones", label: "Drones" },
  { value: "ev-charging", label: "EV charging" },
  { value: "events", label: "Events & reports" },
  { value: "research", label: "Research" },
] as const

const httpsUrl = z.string().trim().url().refine((value) => new URL(value).protocol === "https:", "Use an HTTPS URL.")

export const blogSourceSchema = z.object({
  label: z.string().trim().min(1).max(160),
  url: httpsUrl,
  publishedAt: z.string().trim().max(40).optional(),
})

export const blogMediaSchema = z.object({
  url: httpsUrl,
  pathname: z.string().trim().min(1).max(500).startsWith("blog/"),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"]),
  mediaType: z.enum(["image", "video"]),
  altText: z.string().trim().max(300).default(""),
  caption: z.string().trim().max(500).optional().or(z.literal("")),
  transcript: z.string().trim().max(30000).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(100).default(0),
}).refine((media) => media.mediaType === "video" ? media.contentType.startsWith("video/") : media.contentType.startsWith("image/"), {
  message: "Media type and content type do not match.",
})

export const blogPostInputSchema = z.object({
  title: z.string().trim().min(5).max(180),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  excerpt: z.string().trim().min(20).max(400),
  body: z.string().trim().min(50).max(80000),
  category: z.enum(BLOG_CATEGORIES.map((category) => category.value) as [string, ...string[]]),
  tags: z.array(z.string().trim().min(1).max(60)).max(10),
  authorName: z.string().trim().min(2).max(120),
  authorRole: z.string().trim().max(160).optional().or(z.literal("")),
  sources: z.array(blogSourceSchema).max(20),
  seoTitle: z.string().trim().max(180).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  canonicalUrl: httpsUrl.optional().or(z.literal("")),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledAt: z.coerce.date().optional(),
  media: z.array(blogMediaSchema).max(30),
})

export const staffgptPostSchema = z.object({
  version: z.literal(1),
  idempotencyKey: z.string().trim().min(8).max(200).regex(/^[a-zA-Z0-9._:-]+$/),
  title: z.string().trim().min(5).max(180),
  slug: z.string().trim().max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  excerpt: z.string().trim().min(20).max(400),
  body: z.string().trim().min(50).max(80000),
  category: z.enum(BLOG_CATEGORIES.map((category) => category.value) as [string, ...string[]]).default("field-notes"),
  tags: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  authorName: z.string().trim().min(2).max(120),
  authorRole: z.string().trim().max(160).optional(),
  sources: z.array(blogSourceSchema).min(1).max(20),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  canonicalUrl: httpsUrl.optional(),
  media: z.array(blogMediaSchema).max(30).default([]),
})

export type BlogPostInput = z.infer<typeof blogPostInputSchema>
export type BlogMediaInput = z.infer<typeof blogMediaSchema>
export type BlogSourceInput = z.infer<typeof blogSourceSchema>
