"use client"

import { cloneElement, useId, useRef, useState, useTransition, type ChangeEvent, type FormEvent, type ReactElement } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Eye, ImagePlus, LoaderCircle, Save, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS, parseSourceLines, parseTagList, slugify } from "@/lib/blog/validation"
import { saveBlogPostAction } from "@/app/dashboard/blog/actions"
import type { BlogPost } from "@/lib/blog/types"

type EditorMedia = BlogPost["media"][number]

type Draft = {
  title: string
  slug: string
  excerpt: string
  body: string
  category: BlogPost["category"]
  tags: string
  authorName: string
  authorRole: string
  sources: string
  seoTitle: string
  seoDescription: string
  canonicalUrl: string
  status: BlogPost["status"]
  scheduledAt: string
  media: EditorMedia[]
}

function localDateTime(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function postToDraft(post?: BlogPost): Draft {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    category: post?.category ?? "field-notes",
    tags: post?.tags.join(", ") ?? "",
    authorName: post?.authorName ?? "RoboReady Editorial Team",
    authorRole: post?.authorRole ?? "",
    sources: post?.sources.map((source) => [source.label, source.url, source.publishedAt ?? ""].join(" | ")).join("\n") ?? "",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    canonicalUrl: post?.canonicalUrl ?? "",
    status: post?.status ?? "draft",
    scheduledAt: localDateTime(post?.scheduledAt),
    media: post?.media ?? [],
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactElement<{ id?: string }> }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function BlogEditor({ post }: { post?: BlogPost }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(() => postToDraft(post))
  const [slugEdited, setSlugEdited] = useState(Boolean(post?.slug))
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError("")
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const response = await fetch("/api/blog/media", { method: "POST", body: formData })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.")
      const mediaType = file.type.startsWith("image/") ? "image" : "video"
      update("media", [...draft.media, {
        id: `pending-${crypto.randomUUID()}`,
        postId: post?.id ?? "",
        url: payload.url,
        pathname: payload.pathname,
        contentType: payload.contentType,
        mediaType,
        altText: "",
        caption: "",
        transcript: "",
        sortOrder: draft.media.length,
      }])
      toast.success("Media uploaded")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  function removeMedia(index: number) {
    update("media", draft.media.filter((_, itemIndex) => itemIndex !== index).map((item, sortOrder) => ({ ...item, sortOrder })))
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const scheduledAt = draft.status === "scheduled" && draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : undefined
    const payload = {
      title: draft.title,
      slug: draft.slug,
      excerpt: draft.excerpt,
      body: draft.body,
      category: draft.category,
      tags: parseTagList(draft.tags),
      authorName: draft.authorName,
      authorRole: draft.authorRole,
      sources: parseSourceLines(draft.sources),
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      canonicalUrl: draft.canonicalUrl,
      status: draft.status,
      ...(scheduledAt ? { scheduledAt } : {}),
      media: draft.media.map((item) => ({
        url: item.url,
        pathname: item.pathname,
        contentType: item.contentType,
        mediaType: item.mediaType,
        altText: item.altText,
        caption: item.caption,
        transcript: item.transcript,
        sortOrder: item.sortOrder,
      })),
    }

    startTransition(async () => {
      const result = await saveBlogPostAction(payload, post?.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success("Article saved")
      if (!post && result.id) router.replace(`/dashboard/blog/${result.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={save} className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/blog"><ArrowLeft className="size-4" /> Back to blog</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {post ? <Button asChild variant="outline" size="sm"><Link href={`/dashboard/blog/preview/${post.id}`} target="_blank"><Eye className="size-4" /> Preview</Link></Button> : null}
          <Button type="submit" disabled={isPending || uploading}>
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isPending ? "Saving…" : "Save article"}
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Editorial desk</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{post ? "Edit article" : "New article"}</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Write a sourced, useful article for property owners and autonomy operators.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Title">
            <Input required minLength={5} maxLength={180} value={draft.title} onChange={(event) => {
              const title = event.target.value
              setDraft((current) => ({ ...current, title, slug: slugEdited ? current.slug : slugify(title) }))
            }} placeholder="A clear, answer-forward headline" />
          </Field>
          <Field label="URL slug" hint="Lowercase letters, numbers, and hyphens only.">
            <Input required minLength={3} maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={(event) => {
              setSlugEdited(true)
              update("slug", slugify(event.target.value))
            }} />
          </Field>
          <Field label="Category">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.category} onChange={(event) => update("category", event.target.value as Draft["category"])}>
              {BLOG_CATEGORIES.map((category) => <option key={category} value={category}>{BLOG_CATEGORY_LABELS[category]}</option>)}
            </select>
          </Field>
          <Field label="Tags" hint="Separate tags with commas. Up to 12.">
            <Input value={draft.tags} onChange={(event) => update("tags", event.target.value)} placeholder="robotaxi, property readiness" />
          </Field>
        </div>
        <Field label="Excerpt" hint="A concise summary shown in listings and search results.">
          <Textarea required minLength={20} maxLength={420} rows={3} value={draft.excerpt} onChange={(event) => update("excerpt", event.target.value)} />
        </Field>
        <Field label="Article body" hint="Plain text with Markdown headings (##), lists, and blockquotes supported.">
          <Textarea required minLength={40} maxLength={50000} rows={16} value={draft.body} onChange={(event) => update("body", event.target.value)} placeholder={'## Start with the operational question\n\nWrite original analysis and cite the sources below.'} />
        </Field>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Attribution & sources</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Use an accountable author and cite primary sources for industry news.</p>
          </div>
          <Field label="Author / byline"><Input required minLength={2} maxLength={120} value={draft.authorName} onChange={(event) => update("authorName", event.target.value)} /></Field>
          <Field label="Author role"><Input maxLength={160} value={draft.authorRole} onChange={(event) => update("authorRole", event.target.value)} placeholder="Research & editorial" /></Field>
          <Field label="Sources" hint="One per line: Source label | https://source.example/article | optional publication date">
            <Textarea rows={5} value={draft.sources} onChange={(event) => update("sources", event.target.value)} placeholder="Source publication | https://example.com/report | 2026-09-28" />
          </Field>
        </div>

        <div className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Search presentation</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Optional overrides. Empty fields fall back to the article title and excerpt.</p>
          </div>
          <Field label="SEO title"><Input maxLength={180} value={draft.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} /></Field>
          <Field label="SEO description"><Textarea maxLength={320} rows={3} value={draft.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} /></Field>
          <Field label="Canonical URL" hint="Leave blank to use the RoboReady article URL."><Input type="url" value={draft.canonicalUrl} onChange={(event) => update("canonicalUrl", event.target.value)} placeholder="https://roboready.net/blog/your-article" /></Field>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Media gallery</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Upload public editorial images or clips. Add descriptive alt text, captions, and a transcript for video.</p>
          </div>
          <div>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" className="sr-only" onChange={upload} />
            <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "Uploading…" : "Upload media"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {draft.media.length ? draft.media.map((media, index) => (
            <div key={media.id} className="grid gap-4 rounded-md border p-4 md:grid-cols-[10rem_1fr_auto]">
              <div className="aspect-video overflow-hidden rounded bg-muted">
                {media.mediaType === "image" ? <Image src={media.url} alt={media.altText || media.caption || "Blog image preview"} width={640} height={360} className="size-full object-cover" /> : <video src={media.url} controls preload="metadata" className="size-full object-cover" aria-label={media.caption || "Blog video preview"} />}
              </div>
              <div className="flex flex-col gap-3">
                {media.mediaType === "image" ? <Field label="Image alt text"><Input maxLength={300} value={media.altText} onChange={(event) => update("media", draft.media.map((item, itemIndex) => itemIndex === index ? { ...item, altText: event.target.value } : item))} placeholder="Describe the meaningful content of this image" /></Field> : null}
                <Field label="Caption"><Input maxLength={500} value={media.caption ?? ""} onChange={(event) => update("media", draft.media.map((item, itemIndex) => itemIndex === index ? { ...item, caption: event.target.value } : item))} /></Field>
                {media.mediaType === "video" ? <Field label="Transcript"><Textarea maxLength={12000} rows={3} value={media.transcript ?? ""} onChange={(event) => update("media", draft.media.map((item, itemIndex) => itemIndex === index ? { ...item, transcript: event.target.value } : item))} /></Field> : null}
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove media from article" onClick={() => removeMedia(index)}><Trash2 className="size-4" /></Button>
            </div>
          )) : (
            <button type="button" className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:bg-muted/50" onClick={() => fileInput.current?.click()}>
              <ImagePlus className="size-5" /> No media attached
            </button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Publication</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Industry news needs a source. Scheduled articles become public when the publication time arrives.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Status">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.status} onChange={(event) => update("status", event.target.value as Draft["status"])}>
              <option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
          </Field>
          {draft.status === "scheduled" ? <Field label="Publish date and time"><Input type="datetime-local" required value={draft.scheduledAt} onChange={(event) => update("scheduledAt", event.target.value)} /></Field> : null}
        </div>
      </section>

      {error ? <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || uploading} size="lg">
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isPending ? "Saving article…" : "Save article"}
        </Button>
      </div>
    </form>
  )
}
