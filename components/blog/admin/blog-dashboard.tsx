"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { ArrowRight, ExternalLink, FileImage, FilePlus2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BlogSettingsForm } from "@/components/blog/admin/blog-settings"
import { deleteBlogMediaAction, deleteBlogPostAction, setBlogPostStatusAction } from "@/app/dashboard/blog/actions"
import { formatBlogDate, BLOG_CATEGORY_LABELS } from "@/lib/blog/validation"
import type { BlogPost, BlogSettings } from "@/lib/blog/types"

type GalleryItem = {
  id: string
  postId: string
  url: string
  mediaType: "image" | "video"
  caption: string
  altText: string
  postTitle: string
  postStatus: string
}

export function BlogAdminDashboard({
  posts,
  settings,
  counts,
  gallery,
  staffGptConfigured,
}: {
  posts: BlogPost[]
    settings: BlogSettings
    counts: Record<string, number>
    gallery: GalleryItem[]
    staffGptConfigured: boolean
  }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function changeStatus(post: BlogPost, status: BlogPost["status"]) {
    startTransition(async () => {
      const result = await setBlogPostStatusAction(post.id, status)
      if (result.ok) {
        toast.success(status === "published" ? "Article published" : "Publication status updated")
        router.refresh()
      } else toast.error(result.error)
    })
  }

  function removePost(post: BlogPost) {
    if (!window.confirm(`Delete “${post.title}” and its attached media? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteBlogPostAction(post.id)
      if (result.ok) {
        toast.success("Article deleted")
        router.refresh()
      } else toast.error(result.error)
    })
  }

  function removeMedia(media: GalleryItem) {
    if (!window.confirm("Delete this media item? It will also be removed from its article.")) return
    startTransition(async () => {
      const result = await deleteBlogMediaAction(media.id)
      if (result.ok) {
        toast.success("Media deleted")
        router.refresh()
      } else toast.error(result.error)
    })
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">RoboArrival</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Editorial desk</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Manage original industry reporting, field notes, practical guides, and the public media gallery.</p>
        </div>
        <Button asChild><Link href="/dashboard/blog/new"><FilePlus2 className="size-4" /> New article</Link></Button>
      </header>

      <BlogSettingsForm initial={settings} staffGptConfigured={staffGptConfigured} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Article totals">
        {[{ label: "Published", value: counts.published ?? 0 }, { label: "Drafts", value: counts.draft ?? 0 }, { label: "Scheduled", value: counts.scheduled ?? 0 }, { label: "Archived", value: counts.archived ?? 0 }].map((item) => (
          <div key={item.label} className="flex items-end justify-between rounded-lg border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Articles</h2><p className="mt-1 text-sm text-muted-foreground">Showing the latest {posts.length} posts (up to 100).</p></div>
        </div>
        {posts.length ? (
          <ul className="divide-y">
            {posts.map((post) => (
              <li key={post.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/blog/${post.id}`} className="font-medium hover:text-primary">{post.title}</Link>
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{BLOG_CATEGORY_LABELS[post.category]} · {post.authorName} · Updated {formatBlogDate(post.updatedAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {post.status === "published" ? <Button asChild variant="ghost" size="sm"><Link href={`/blog/${post.slug}`} target="_blank"><ExternalLink className="size-4" /> Public</Link></Button> : null}
                  <Button asChild variant="outline" size="sm"><Link href={`/dashboard/blog/preview/${post.id}`} target="_blank">Preview</Link></Button>
                  {post.status !== "published" ? <Button size="sm" variant="outline" disabled={isPending} onClick={() => changeStatus(post, "published")}>Publish</Button> : <Button size="sm" variant="outline" disabled={isPending} onClick={() => changeStatus(post, "draft")}>Unpublish</Button>}
                  <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/blog/${post.id}`}>Edit <ArrowRight className="size-4" /></Link></Button>
                  <Button size="icon" variant="ghost" aria-label={`Delete ${post.title}`} disabled={isPending} onClick={() => removePost(post)}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-10 text-center">
            <FilePlus2 className="size-6 text-muted-foreground" />
            <p className="font-medium">No articles yet</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Create a draft to start building the RoboArrival editorial library.</p>
            <Button asChild size="sm"><Link href="/dashboard/blog/new">Create your first article</Link></Button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><FileImage className="size-5 text-primary" /> Media gallery</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">All images and videos attached to editorial posts. Removing an item also removes it from its article.</p>
        </div>
        {gallery.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((media) => (
              <li key={media.id} className="overflow-hidden rounded-md border">
                <div className="aspect-video bg-muted">
                  {media.mediaType === "image" ? <Image src={media.url} alt={media.altText || media.caption || "Blog gallery image"} width={640} height={360} className="size-full object-cover" /> : <video src={media.url} controls preload="metadata" aria-label={media.caption || "Blog gallery video"} className="size-full object-cover" />}
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-muted-foreground">{media.caption || media.altText || "Untitled media"}</p>
                    <p className="truncate text-xs text-muted-foreground">{media.postTitle} · {media.postStatus}</p>
                  </div>
                  <Button size="icon" variant="ghost" aria-label="Delete media" disabled={isPending} onClick={() => removeMedia(media)}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="flex items-center gap-2 text-sm text-muted-foreground"><FileImage className="size-4" /> No gallery media has been uploaded.</p>}
      </section>
    </div>
  )
}
