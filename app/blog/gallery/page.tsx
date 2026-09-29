import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BlogGalleryCard, BlogPageFrame } from "@/components/blog/public/blog-components"
import { getBlogSettings, listBlogGalleryMedia } from "@/lib/blog/data"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getBlogSettings()
  return settings.visible
    ? { title: "Media gallery", description: "Images and video from RoboReady field notes and autonomous-arrival coverage.", alternates: { canonical: "https://roboready.net/blog/gallery" } }
    : { title: "Not found", robots: { index: false, follow: false } }
}

export default async function BlogGalleryPage() {
  const settings = await getBlogSettings()
  if (!settings.visible) notFound()
  const items = await listBlogGalleryMedia()

  return (
    <BlogPageFrame>
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-3 border-b pb-7">
          <Link href="/blog" className="text-sm font-medium text-primary underline underline-offset-4">← Back to articles</Link>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">RoboReady archive</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Field media gallery</h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">Event coverage, property context, and visual notes from published articles.</p>
        </div>
        {items.length ? <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{items.map((media) => <BlogGalleryCard key={media.id} media={media} post={{ slug: media.postSlug, title: media.postTitle }} />)}</div> : <p className="border-y py-16 text-center text-sm leading-relaxed text-muted-foreground">The public gallery will appear here as articles are published.</p>}
      </section>
    </BlogPageFrame>
  )
}
