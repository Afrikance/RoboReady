import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Image as ImageIcon } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SiteFooter } from "@/components/marketing/site-footer"
import { parseMarkdownBlocks, type BlogPost } from "@/lib/blog/types"
import { BLOG_CATEGORY_LABELS, formatBlogDate, safeArticleCanonical, stripMarkdown, structuredJson } from "@/lib/blog/validation"

export function BlogHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/blog" aria-label="RoboReady blog home"><Logo size="md" /></Link>
        <nav aria-label="Blog navigation" className="flex items-center gap-2 sm:gap-4">
          <Link href="/blog" className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Articles</Link>
          <Link href="/blog/gallery" className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Gallery</Link>
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex"><Link href="/contact">Talk to RoboReady</Link></Button>
        </nav>
      </div>
    </header>
  )
}

export function BlogPageFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-col"><BlogHeader /><main className="flex-1">{children}</main><SiteFooter /></div>
}

export function BlogCategoryBadge({ category }: { category: BlogPost["category"] }) {
  return <Badge variant="secondary" className="font-medium">{BLOG_CATEGORY_LABELS[category]}</Badge>
}

export function BlogPostCard({ post }: { post: BlogPost }) {
  const cover = post.media.find((media) => media.mediaType === "image")
  const published = post.publishedAt ?? post.updatedAt
  return (
    <article className="group flex h-full flex-col border-b pb-6">
      {cover ? <Link href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true" className="mb-5 block aspect-[16/9] overflow-hidden bg-muted"><Image src={cover.url} alt="" width={1600} height={900} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /></Link> : null}
      <div className="flex flex-wrap items-center gap-2">
        <BlogCategoryBadge category={post.category} />
        <time className="text-xs text-muted-foreground" dateTime={published.toISOString()}>{formatBlogDate(published)}</time>
      </div>
      <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-balance sm:text-2xl"><Link href={`/blog/${post.slug}`} className="decoration-primary/40 underline-offset-4 group-hover:underline">{post.title}</Link></h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">{post.excerpt}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">By {post.authorName}</p>
        <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary">Read article <ArrowRight className="size-4" /></Link>
      </div>
    </article>
  )
}

export function BlogArticleContent({ post, preview = false }: { post: BlogPost; preview?: boolean }) {
  const published = post.publishedAt ?? post.updatedAt
  const canonical = safeArticleCanonical(post.slug, post.canonicalUrl)
  const images = post.media.filter((media) => media.mediaType === "image")
  const schema = {
    "@context": "https://schema.org",
    "@type": post.category === "industry-news" ? "NewsArticle" : "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: published.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.authorName, ...(post.authorRole ? { jobTitle: post.authorRole } : {}) },
    publisher: { "@type": "Organization", name: "RoboReady", url: "https://roboready.net" },
    mainEntityOfPage: canonical,
    url: canonical,
    ...(images.length ? { image: images.map((media) => media.url) } : {}),
  }

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-16">
      {preview ? <div role="note" className="rounded-md border border-primary/30 bg-secondary px-4 py-3 text-sm text-secondary-foreground">Preview mode — this article is not being shown publicly.</div> : null}
      <div className="flex flex-col gap-5 border-b pb-8">
        <Link href={preview ? "/dashboard/blog" : "/blog"} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {preview ? "Back to editorial desk" : "All articles"}</Link>
        <BlogCategoryBadge category={post.category} />
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">{post.title}</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground text-pretty">{post.excerpt}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span>By <span className="font-medium text-foreground">{post.authorName}</span>{post.authorRole ? `, ${post.authorRole}` : ""}</span>
          <span>{preview ? "Preview date" : "Published"} <time dateTime={published.toISOString()}>{formatBlogDate(published)}</time></span>
          {post.updatedAt.getTime() > published.getTime() ? <span>Updated <time dateTime={post.updatedAt.toISOString()}>{formatBlogDate(post.updatedAt)}</time></span> : null}
        </div>
      </div>

      {post.media.length ? <BlogMediaGallery media={post.media} title={post.title} /> : null}

      <div className="prose prose-slate max-w-none dark:prose-invert">
        <BlogArticleBody body={post.body} />
      </div>

      {post.sources.length ? (
        <section className="flex flex-col gap-3 border-t pt-6" aria-labelledby="article-sources-title">
          <h2 id="article-sources-title" className="text-lg font-semibold">Sources</h2>
          <ul className="flex flex-col gap-2">
            {post.sources.map((source) => <li key={`${source.url}-${source.label}`} className="text-sm leading-relaxed"><a className="font-medium text-primary underline underline-offset-4" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>{source.publishedAt ? <span className="ml-2 text-muted-foreground">{source.publishedAt}</span> : null}</li>)}
          </ul>
        </section>
      ) : null}

      {post.tags.length ? <ul className="flex flex-wrap gap-2" aria-label="Article tags">{post.tags.map((tag) => <li key={tag}><Badge variant="outline">{tag}</Badge></li>)}</ul> : null}

      {!preview ? <div className="flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold">Preparing a property for autonomous arrivals?</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Turn the site constraints into a practical readiness plan.</p></div>
        <Button asChild><Link href="/contact">Discuss a property <ArrowRight className="size-4" /></Link></Button>
      </div> : null}
      {!preview ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredJson(schema) }} /> : null}
    </article>
  )
}

export function BlogArticleBody({ body }: { body: string }) {
  const blocks = parseMarkdownBlocks(body)
  return <div className="flex flex-col gap-5 text-[1.0625rem] leading-8 text-foreground">
    {blocks.map((block, index) => {
      if (block.type === "heading") {
        const Heading = block.level === 3 ? "h3" : "h2"
        return <Heading key={index} className="mt-5 text-2xl font-semibold leading-snug tracking-tight">{block.text}</Heading>
      }
      if (block.type === "quote") return <blockquote key={index} className="border-l-2 border-primary pl-5 text-lg leading-relaxed text-muted-foreground">{block.text}</blockquote>
      if (block.type === "list") return <ul key={index} className="list-disc pl-6">{block.text.split("\n").map((item) => <li key={item} className="pl-1">{item}</li>)}</ul>
      return <p key={index} className="text-pretty">{block.text}</p>
    })}
  </div>
}

export function BlogMediaGallery({ media, title }: { media: BlogPost["media"]; title: string }) {
  return (
    <section aria-label={`${title} media gallery`} className="grid gap-5 sm:grid-cols-2">
      {media.map((item) => (
        <figure key={item.id} className="flex flex-col gap-2">
          {item.mediaType === "image" ? <Image src={item.url} alt={item.altText || item.caption || title} width={1600} height={900} sizes="(max-width: 640px) 100vw, 50vw" className="aspect-video w-full rounded-md bg-muted object-cover" /> : (
            <video src={item.url} controls preload="metadata" aria-label={item.caption || `${title} video`} className="aspect-video w-full rounded-md bg-foreground object-contain" />
          )}
          {item.caption ? <figcaption className="text-sm leading-relaxed text-muted-foreground">{item.caption}</figcaption> : null}
          {item.mediaType === "video" && item.transcript ? <details className="rounded-md border px-3 py-2 text-sm"><summary className="cursor-pointer font-medium">Read video transcript</summary><p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground">{item.transcript}</p></details> : null}
        </figure>
      ))}
    </section>
  )
}

export function BlogGalleryCard({ media, post }: { media: BlogPost["media"][number]; post: Pick<BlogPost, "slug" | "title"> }) {
  return (
    <article className="overflow-hidden border-b pb-4">
      <Link href={`/blog/${post.slug}`} className="group block">
        <div className="aspect-video overflow-hidden bg-muted">
          {media.mediaType === "image" ? <Image src={media.url} alt={media.altText || media.caption || post.title} width={1600} height={900} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <video src={media.url} controls preload="metadata" aria-label={media.caption || `${post.title} video`} className="size-full object-cover" />}
        </div>
        <div className="flex items-center gap-2 pt-3 text-sm"><ImageIcon className="size-4 text-primary" /><span className="font-medium">{media.caption || post.title}</span></div>
        <p className="mt-1 text-xs text-muted-foreground">From: {post.title}</p>
      </Link>
      {media.mediaType === "video" && media.transcript ? <details className="mt-2 text-sm"><summary className="cursor-pointer">Read transcript</summary><p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground">{stripMarkdown(media.transcript)}</p></details> : null}
    </article>
  )
}
