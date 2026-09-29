import "server-only"

import { timingSafeEqual } from "node:crypto"
import { redirect } from "next/navigation"
import { getOrgContext, PLATFORM_ORG_ID } from "@/lib/tenancy"
import { isAdminRole } from "@/lib/access"

export async function requireBlogAdmin() {
  const context = await getOrgContext()
  if (!context) redirect("/sign-in?next=/dashboard/blog")
  if (!isAdminRole(context.role)) redirect("/dashboard")
  return context
}

export const BLOG_AUDIT_ORGANIZATION_ID = PLATFORM_ORG_ID

export function isStaffGptBlogConfigured() {
  return Boolean(process.env.STAFFGPT_BLOG_SECRET)
}

export const STAFFGPT_BLOG_SECRET = process.env.STAFFGPT_BLOG_SECRET

export function hasStaffGptBlogSecret() {
  return Boolean(STAFFGPT_BLOG_SECRET && STAFFGPT_BLOG_SECRET.length >= 32)
}

export function safeMediaUrl(value: string) {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

export function safeMediaPathname(value: string) {
  return /^blog\/[a-zA-Z0-9._\/-]{1,500}$/.test(value) && !value.split("/").some((part) => part === ".." || part === ".")
}

export function safeTokenEqual(candidate: string, expected: string) {
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  return a.byteLength === b.byteLength && timingSafeEqual(a, b)
}

export const BLOG_PUBLIC_BASE_URL = "https://roboready.net"

export function toBlogPublicUrl(slug: string) {
  return `${BLOG_PUBLIC_BASE_URL}/blog/${encodeURIComponent(slug)}`
}

export function getBlogCategoryLabel(category: string) {
  return category.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function asBlogDate(value: Date | string | null | undefined) {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(date)
}

export function slugFromTitle(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180)
}

export function imageAlt(media: { altText?: string | null; caption?: string | null }, title: string) {
  return media.altText?.trim() || media.caption?.trim() || title
}

export function publishedDate(post: { publishedAt?: Date | null; updatedAt: Date }) {
  return post.publishedAt ?? post.updatedAt
}

export function parseMarkdownBlocks(markdown: string) {
  const blocks = []
  const lines = markdown.split("\n")
  let currentBlock = { type: "paragraph", text: "" }

  for (const line of lines) {
    if (line.startsWith("# ")) {
      if (currentBlock.text) blocks.push(currentBlock)
      blocks.push({ type: "heading", level: 1, text: line.slice(2) })
      currentBlock = { type: "paragraph", text: "" }
    } else if (line.startsWith("## ")) {
      if (currentBlock.text) blocks.push(currentBlock)
      blocks.push({ type: "heading", level: 2, text: line.slice(3) })
      currentBlock = { type: "paragraph", text: "" }
    } else if (line.startsWith("### ")) {
      if (currentBlock.text) blocks.push(currentBlock)
      blocks.push({ type: "heading", level: 3, text: line.slice(4) })
      currentBlock = { type: "paragraph", text: "" }
    } else if (line.trim() === "") {
      if (currentBlock.text) {
        blocks.push(currentBlock)
        currentBlock = { type: "paragraph", text: "" }
      }
    } else {
      currentBlock.text += (currentBlock.text ? " " : "") + line
    }
  }

  if (currentBlock.text) blocks.push(currentBlock)
  return blocks
}

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

export function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180)
}

export type BlogArticleInput = {
  title: string
  slug: string
  excerpt: string
  body: string
  category: string
  authorName: string
  authorRole?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  canonicalUrl?: string | null
  tags: string[]
  sources: Array<{ label: string; url: string; publishedAt?: string | null }>
  media: BlogMediaInput[]
}

export type BlogCategory = "industry-news" | "event-coverage" | "field-notes" | "research" | "guides"
export type BlogStatus = "draft" | "scheduled" | "published" | "archived"

export type BlogMediaInput = {
  url: string
  mediaType: "image" | "video"
  contentType: string
  pathname: string
  altText: string
  caption?: string | null
  transcript?: string | null
  sortOrder: number
}

export type BlogMediaItem = BlogMediaInput & {
  id: string
  postId: string
}

export type BlogSource = {
  label: string
  url: string
  publishedAt?: string | null
}

export type BlogPostInput = {
  title: string
  slug: string
  excerpt: string
  body: string
  category: BlogCategory
  authorName: string
  authorRole?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  canonicalUrl?: string | null
  tags: string[]
  sources: BlogSource[]
  media: BlogMediaInput[]
  status: BlogStatus
  scheduledAt?: string | null
}

export type BlogPost = BlogPostInput & {
  id: string
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  creationSource: "manual" | "staffgpt"
}

export type BlogSettings = {
  visible: boolean
  staffgptAutoPublish: boolean
}
