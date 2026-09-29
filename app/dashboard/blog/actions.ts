"use server"

import { del } from "@vercel/blob"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { hasStaffGptBlogSecret, requireBlogAdmin } from "@/lib/blog/admin"
import {
  deleteBlogPost,
  getBlogMediaById,
  getBlogPostMediaIds,
  getBlogStatus,
  getBlogPostForAdmin,
  removeBlogMedia,
  saveBlogPost,
  setBlogPostStatus,
  updateBlogSettings,
} from "@/lib/blog/data"
import { blogArticleSchema } from "@/lib/blog/validation"
import { recordAudit } from "@/lib/tenancy"

const idSchema = z.string().trim().min(1).max(120)
const settingsSchema = z.object({
  visible: z.boolean().optional(),
  staffgptAutoPublish: z.boolean().optional(),
}).strict().refine((values) => values.visible !== undefined || values.staffgptAutoPublish !== undefined)
const statusSchema = z.enum(["draft", "scheduled", "published", "archived"])

export type BlogActionResult = { ok: true; id?: string } | { ok: false; error: string }

function revalidateBlog() {
  revalidatePath("/blog")
  revalidatePath("/blog/gallery")
  revalidatePath("/sitemap.xml")
  revalidatePath("/robots.txt")
  revalidatePath("/dashboard/blog")
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("duplicate key") || message.includes("unique constraint")) return "That slug is already in use. Choose a different one."
  if (message === "BLOG_POST_NOT_FOUND") return "This post no longer exists. Refresh the page and try again."
  return "The blog change could not be saved. Please try again."
}

export async function saveBlogPostAction(rawInput: unknown, rawId?: string): Promise<BlogActionResult> {
  const context = await requireBlogAdmin()
  const parsed = blogArticleSchema.safeParse(rawInput)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the article fields." }
  const id = rawId ? idSchema.safeParse(rawId) : null
  if (rawId && !id?.success) return { ok: false, error: "Invalid post identifier." }

  try {
    const oldMedia = id?.success ? await getBlogPostMediaIds(id.data) : []
    const postId = await saveBlogPost(parsed.data, context.user.id, id?.success ? id.data : undefined)
    const retained = new Set(parsed.data.media.map((item) => item.url))
    const removedUrls = oldMedia.map((item) => item.url).filter((url) => !retained.has(url))
    if (removedUrls.length) {
      try {
        await del(removedUrls)
      } catch (error) {
        console.error("[v0] removed blog media cleanup failed:", error)
      }
    }
    await recordAudit({
      organizationId: context.organizationId,
      userId: context.user.id,
      action: parsed.data.status === "published"
        ? "blog.post_published"
        : parsed.data.status === "archived"
          ? "blog.post_archived"
          : id?.success ? "blog.post_updated" : "blog.post_created",
      entityType: "blog_post",
      entityId: postId,
      metadata: { slug: parsed.data.slug, status: parsed.data.status },
    })
    revalidateBlog()
    return { ok: true, id: postId }
  } catch (error) {
    console.error("[v0] blog post save failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}

export async function updateBlogSettingsAction(rawValues: unknown): Promise<BlogActionResult> {
  const context = await requireBlogAdmin()
  const parsed = settingsSchema.safeParse(rawValues)
  if (!parsed.success) return { ok: false, error: "Choose a valid blog setting." }
  if (parsed.data.staffgptAutoPublish && !hasStaffGptBlogSecret()) {
    return { ok: false, error: "Set STAFFGPT_BLOG_SECRET (32+ characters) before enabling auto-publishing." }
  }

  try {
    await updateBlogSettings(parsed.data, context.user.id)
    await recordAudit({
      organizationId: context.organizationId,
      userId: context.user.id,
      action: "blog.settings_updated",
      entityType: "blog_settings",
      entityId: "global",
      metadata: parsed.data,
    })
    revalidateBlog()
    return { ok: true }
  } catch (error) {
    console.error("[v0] blog settings update failed:", error)
    return { ok: false, error: "Blog settings could not be saved. Please try again." }
  }
}

export async function setBlogPostStatusAction(rawId: string, rawStatus: string): Promise<BlogActionResult> {
  const context = await requireBlogAdmin()
  const id = idSchema.safeParse(rawId)
  const status = statusSchema.safeParse(rawStatus)
  if (!id.success || !status.success) return { ok: false, error: "Choose a valid post and status." }

  try {
    const post = await getBlogPostForAdmin(id.data)
    if (!post) return { ok: false, error: "This post no longer exists. Refresh the page and try again." }
    if (status.data === "scheduled" && !post.scheduledAt) return { ok: false, error: "Set a publication date in the editor before scheduling this article." }
    if (status.data === "published" && post.category === "industry-news" && post.sources.length === 0) return { ok: false, error: "Industry news needs at least one source before publishing." }
    const previousStatus = await getBlogStatus(id.data)
    await setBlogPostStatus(id.data, status.data, context.user.id)
    await recordAudit({
      organizationId: context.organizationId,
      userId: context.user.id,
      action: status.data === "published" ? "blog.post_published" : status.data === "archived" ? "blog.post_archived" : "blog.post_status_changed",
      entityType: "blog_post",
      entityId: id.data,
      metadata: { previousStatus, status: status.data },
    })
    revalidateBlog()
    return { ok: true, id: id.data }
  } catch (error) {
    console.error("[v0] blog status update failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}

export async function deleteBlogPostAction(rawId: string): Promise<BlogActionResult> {
  const context = await requireBlogAdmin()
  const id = idSchema.safeParse(rawId)
  if (!id.success) return { ok: false, error: "Invalid post identifier." }

  try {
    const media = await getBlogPostMediaIds(id.data)
    await deleteBlogPost(id.data)
    if (media.length) {
      try {
        await del(media.map((item) => item.url))
      } catch (error) {
        console.error("[v0] deleted blog media cleanup failed:", error)
      }
    }
    await recordAudit({
      organizationId: context.organizationId,
      userId: context.user.id,
      action: "blog.post_deleted",
      entityType: "blog_post",
      entityId: id.data,
    })
    revalidateBlog()
    return { ok: true }
  } catch (error) {
    console.error("[v0] blog post deletion failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}

export async function deleteBlogMediaAction(rawId: string): Promise<BlogActionResult> {
  const context = await requireBlogAdmin()
  const id = idSchema.safeParse(rawId)
  if (!id.success) return { ok: false, error: "Invalid media identifier." }

  try {
    const media = await getBlogMediaById(id.data)
    if (!media) return { ok: false, error: "This media item no longer exists." }
    await removeBlogMedia(media.id)
    try {
      await del(media.url)
    } catch (error) {
      console.error("[v0] blog media cleanup failed:", error)
    }
    await recordAudit({
      organizationId: context.organizationId,
      userId: context.user.id,
      action: "blog.media_deleted",
      entityType: "blog_media",
      entityId: media.id,
      metadata: { postId: media.postId },
    })
    revalidateBlog()
    return { ok: true }
  } catch (error) {
    console.error("[v0] blog media deletion failed:", error)
    return { ok: false, error: "The media item could not be deleted." }
  }
}

