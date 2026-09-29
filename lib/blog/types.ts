import type { BlogArticleInput, BlogCategory, BlogMediaInput, BlogStatus, BlogSource as ValidatedBlogSource } from "@/lib/blog/validation"

export type BlogPostInput = BlogArticleInput
export type BlogPostStatus = BlogStatus
export type BlogCategoryType = BlogCategory
export type BlogSource = ValidatedBlogSource
export type BlogMediaInputType = BlogMediaInput
export type BlogSettings = {
  visible: boolean
  staffgptAutoPublish: boolean
}
export type BlogMediaItem = BlogMediaInput & {
  id: string
  postId: string
}
export type BlogPost = Omit<BlogArticleInput, "scheduledAt" | "media"> & {
  id: string
  scheduledAt: string | null
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
    if (url.protocol !== "https:") return null
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
