import { z } from "zod"

export const BLOG_CATEGORIES = [
  "field-notes",
  "robotics",
  "autonomous-vehicles",
  "property-infrastructure",
  "industry",
] as const

export const blogPostInputSchema = z.object({
  title: z.string().trim().min(4).max(160),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().min(20).max(320),
  body: z.string().trim().min(80).max(60_000),
  category: z.enum(BLOG_CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  authorName: z.string().trim().min(2).max(80),
  authorRole: z.string().trim().max(120).optional().nullable(),
  sources: z.array(z.object({ title: z.string().trim().min(1).max(180), url: z.string().url().max(2048) })).max(20),
  seoTitle: z.string().trim().max(70).optional().nullable(),
  seoDescription: z.string().trim().max(180).optional().nullable(),
  canonicalUrl: z.string().url().max(2048).optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduledAt: z.string().datetime().optional().nullable(),
})

export const staffGptBlogInputSchema = blogPostInputSchema.omit({ status: true, scheduledAt: true }).extend({
  idempotencyKey: z.string().trim().min(8).max(200),
})

export type BlogPostInput = z.infer<typeof blogPostInputSchema>
export type BlogPostStatus = BlogPostInput["status"]
export type BlogSource = z.infer<typeof blogPostInputSchema>["sources"][number]
export type BlogSettings = {
  visible: boolean
  staffgptAutoPublish: boolean
}
export type BlogMediaItem = {
  id: string
  postId: string
  url: string
  pathname: string | null
  contentType: string
  mediaType: "image" | "video"
  altText: string
  caption: string | null
  transcript: string | null
  sortOrder: number
}
export type BlogPost = BlogPostInput & {
  id: string
  tags: string[]
  sources: BlogSource[]
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  media: BlogMediaItem[]
}

export function slugifyTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180)
}

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    return url.toString()
  } catch {
    return null
  }
}

export function isSafeBlobUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && (url.hostname.endsWith(".public.blob.vercel-storage.com") || url.hostname.endsWith(".blob.vercel-storage.com"))
  } catch {
    return false
  }
}

export function parseMarkdownBlocks(markdown: string) {
  const blocks: Array<{ type: "paragraph" | "heading" | "quote" | "list"; text: string; level?: 2 | 3 }> = []
  let paragraph: string[] = []
  let list: string[] = []
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") })
    paragraph = []
  }
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", text: list.join("\n") })
    list = []
  }
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
    } else if (line.startsWith("### ") || line.startsWith("## ")) {
      flushParagraph()
      flushList()
      blocks.push({ type: "heading", text: line.replace(/^#{2,3}\s+/, ""), level: line.startsWith("###") ? 3 : 2 })
    } else if (line.startsWith("> ")) {
      flushParagraph()
      flushList()
      blocks.push({ type: "quote", text: line.slice(2) })
    } else if (/^[-*]\s+/.test(line)) {
      flushParagraph()
      list.push(line.replace(/^[-*]\s+/, ""))
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()
  return blocks
}
