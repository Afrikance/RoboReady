import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BlogCategoryBadge, BlogPageFrame, BlogPostCard } from "@/components/blog/public/blog-components"
import { getBlogSettings, listBlogPostsPaginated } from "@/lib/blog/data"
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS, BLOG_PAGE_SIZE } from "@/lib/blog/validation"

export const dynamic = "force-dynamic"

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }): Promise<Metadata> {
  const settings = await getBlogSettings()
  if (!settings.visible) return { title: "Not found", robots: { index: false, follow: false } }
  const query = await searchParams
  const category = BLOG_CATEGORIES.includes(query.category as (typeof BLOG_CATEGORIES)[number]) ? query.category : undefined
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1)
  const canonicalQuery = new URLSearchParams()
  if (category) canonicalQuery.set("category", category)
  if (page > 1) canonicalQuery.set("page", String(page))
  const search = canonicalQuery.toString()
  return {
    title: category ? `${BLOG_CATEGORY_LABELS[category as keyof typeof BLOG_CATEGORY_LABELS]} · RoboArrival Blog` : "RoboArrival Blog",
    description: "Field notes, industry reporting, and practical guides for autonomous arrivals at commercial properties.",
    alternates: { canonical: `https://roboready.net/blog${search ? `?${search}` : ""}` },
  }
}

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const [settings, query] = await Promise.all([getBlogSettings(), searchParams])
  if (!settings.visible) notFound()

  const category = BLOG_CATEGORIES.includes(query.category as (typeof BLOG_CATEGORIES)[number]) ? query.category : undefined
  const parsedPage = Number.parseInt(query.page ?? "1", 10)
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1
  const firstResult = await listBlogPostsPaginated({ category, page, pageSize: BLOG_PAGE_SIZE })
  const pageCount = Math.max(1, Math.ceil(firstResult.total / BLOG_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const { posts, total } = currentPage === page ? firstResult : await listBlogPostsPaginated({ category, page: currentPage, pageSize: BLOG_PAGE_SIZE })

  return (
    <BlogPageFrame>
      <section className="border-b bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">RoboReady field journal</p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-6xl">RoboArrival Blog</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">Reporting, research, and practical guidance for the places where people and autonomous vehicles meet.</p>
          <div className="flex flex-wrap gap-2" aria-label="Filter articles by category">
            <Button asChild size="sm" variant={!category ? "default" : "outline"}><Link href="/blog">All articles</Link></Button>
            {BLOG_CATEGORIES.map((item) => <Button key={item} asChild size="sm" variant={category === item ? "default" : "outline"}><Link href={`/blog?category=${item}`}>{BLOG_CATEGORY_LABELS[item]}</Link></Button>)}
            <Button asChild size="sm" variant="ghost"><Link href="/blog/gallery">Browse gallery</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14">
        {category ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><BlogCategoryBadge category={category as (typeof BLOG_CATEGORIES)[number]} /> <span>{total} {total === 1 ? "article" : "articles"}</span></div> : null}
        {posts.length ? <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <BlogPostCard key={post.id} post={post} />)}</div> : (
          <div className="flex flex-col gap-3 border-y py-16 text-center">
            <h2 className="text-2xl font-semibold">No articles in this view yet</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Try another topic, or check back as the editorial library grows.</p>
            {category ? <Link href="/blog" className="text-sm font-medium text-primary underline underline-offset-4">Show all articles</Link> : null}
          </div>
        )}
        {pageCount > 1 ? <nav className="flex items-center justify-between border-t pt-5" aria-label="Article pagination">
          {currentPage > 1 ? <Link href={`/blog?${category ? `category=${category}&` : ""}page=${currentPage - 1}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary"><span aria-hidden="true">←</span> Previous</Link> : <span />}
          <span className="text-sm text-muted-foreground">Page {currentPage} of {pageCount}</span>
          {currentPage < pageCount ? <Link href={`/blog?${category ? `category=${category}&` : ""}page=${currentPage + 1}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary">Next <span aria-hidden="true">→</span></Link> : <span />}
        </nav> : null}
      </section>
    </BlogPageFrame>
  )
}
