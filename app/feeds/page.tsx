import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Search, Rss } from "lucide-react"
import {
  FEED_ARTICLES,
  FEED_CATEGORIES,
  FEED_EDITORIAL_NOTE,
  FEED_RESEARCH_NOTE,
  FEED_SITE_URL,
  getFeedArticleText,
} from "@/lib/feeds/content"

const canonical = `${FEED_SITE_URL}/feeds`

type FeedsPageProps = {
  searchParams: Promise<{ q?: string; category?: string }>
}

export const metadata: Metadata = {
  title: "Property Robotics & Autonomous Arrival Guides",
  description: "Cited, practical answers to buyer questions about robotaxis, delivery robots, drone delivery, and property readiness planning.",
  alternates: {
    canonical,
    types: { "application/rss+xml": `${canonical}/rss.xml` },
  },
  openGraph: {
    title: "The questions buyers ask before robots reach a property",
    description: "Practical field guides for teams planning autonomous arrivals and robotics on commercial properties.",
    url: canonical,
    type: "website",
  },
}

export default async function FeedsPage({ searchParams }: FeedsPageProps) {
  const { q = "", category = "" } = await searchParams
  const query = q.trim().slice(0, 120).toLowerCase()
  const categoryExists = FEED_CATEGORIES.some((item) => item.slug === category)
  const articles = FEED_ARTICLES.filter((article) => {
    const matchesCategory = !categoryExists || article.category === category
    return matchesCategory && (!query || getFeedArticleText(article).toLowerCase().includes(query))
  })

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b bg-sidebar text-sidebar-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[minmax(0,1fr)_20rem] md:items-end md:py-20">
          <div className="flex flex-col gap-6">
            <Link href="/" className="w-fit text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground">RoboReady <span aria-hidden="true">/</span> Resources</Link>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">Field guides · 30 researched buyer questions</p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight text-balance sm:text-5xl md:text-6xl">
              The questions buyers ask before robots reach a property
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-sidebar-foreground/75 text-pretty">
              Practical, cited answers for teams preparing commercial properties for robotaxi arrivals, indoor delivery robots, drone handoffs, and charging infrastructure.
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-sidebar-foreground/65 text-pretty">
              Each guide starts with the buyer&apos;s question, separates planning from approval, and links to primary references. Questions are editorial research hypotheses—not measured search volumes or a live export of private AI or Google queries.
            </p>
          </div>
          <aside className="flex flex-col gap-4 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Rss aria-hidden="true" className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Follow the field guides</h2>
                <p className="text-sm text-sidebar-foreground/65">RSS 2.0 · all topics</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-sidebar-foreground/75">Subscribe to the full feed or choose a topic-specific feed below.</p>
            <Link href="/feeds/rss.xml" className="inline-flex items-center gap-2 text-sm font-medium text-accent underline-offset-4 hover:underline">
              All guides RSS <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </aside>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 md:py-16">
        <section id="topics" aria-labelledby="topics-heading" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Browse by decision</p>
              <h2 id="topics-heading" className="mt-1 text-2xl font-semibold tracking-tight">Choose the problem you&apos;re solving</h2>
            </div>
            <Link href="/feeds/rss.xml" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <Rss aria-hidden="true" className="size-4" /> All-topic RSS
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEED_CATEGORIES.map((item) => {
              const selected = category === item.slug
              const count = FEED_ARTICLES.filter((article) => article.category === item.slug).length
              return (
                <Link
                  key={item.slug}
                  href={selected ? "/feeds" : `/feeds?category=${item.slug}`}
                  aria-current={selected ? "page" : undefined}
                  className={`group flex min-h-36 flex-col justify-between gap-4 rounded-xl border p-5 transition-colors hover:border-primary/50 hover:bg-secondary/50 ${selected ? "border-primary bg-secondary" : "bg-card"}`}
                >
                  <span>
                    <span className="block font-semibold">{item.label}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{item.description}</span>
                  </span>
                  <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    {count} guides
                    <ArrowRight aria-hidden="true" className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="guide-list-heading" className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Question library</p>
              <h2 id="guide-list-heading" className="mt-1 text-2xl font-semibold tracking-tight">
                {query ? `${articles.length} matching guides` : categoryExists ? FEED_CATEGORIES.find((item) => item.slug === category)?.label : "All buyer questions"}
              </h2>
            </div>
            <form action="/feeds" method="get" className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
              {categoryExists ? <input type="hidden" name="category" value={category} /> : null}
              <label className="sr-only" htmlFor="feed-search">Search buyer questions</label>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
                <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <input id="feed-search" name="q" type="search" maxLength={120} defaultValue={q} placeholder="Search elevator, curb, rooftop, access…" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </div>
              <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Search guides
              </button>
            </form>
          </div>

          {articles.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {articles.map((article) => (
                <article key={article.slug} className="flex flex-col gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">{article.categoryLabel}</span>
                    <span className="text-xs text-muted-foreground">{article.sources.length} references</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    <h3 className="text-xl font-semibold leading-snug text-balance">
                      <Link href={`/feeds/${article.slug}`} className="decoration-primary decoration-2 underline-offset-4 hover:underline">{article.question}</Link>
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{article.summary}</p>
                  </div>
                  <Link href={`/feeds/${article.slug}`} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline">
                    Read the guide <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">No guides match those words yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Try a broader search or browse a topic above.</p>
              <Link href="/feeds" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Show all guides <ArrowRight aria-hidden="true" className="size-4" /></Link>
            </div>
          )}
        </section>

        <section className="grid gap-5 border-t pt-8 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold">How this question map was built</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{FEED_RESEARCH_NOTE}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold">Scope and responsibility</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{FEED_EDITORIAL_NOTE}</p>
          </div>
        </section>
      </div>
    </main>
  )
}
