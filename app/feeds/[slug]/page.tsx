import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowUpRight, Rss } from "lucide-react"
import {
  FEED_ARTICLES,
  FEED_CATEGORIES,
  FEED_EDITORIAL_NOTE,
  FEED_SITE_URL,
  feedArticleUrl,
  getFeedArticle,
  getFeedJsonLd,
} from "@/lib/feeds/content"

type FeedArticlePageProps = {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return FEED_ARTICLES.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: FeedArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getFeedArticle(slug)
  if (!article) return { title: "Guide not found" }

  return {
    title: article.title,
    description: article.summary,
    alternates: {
      canonical: feedArticleUrl(article),
      types: { "application/rss+xml": `${FEED_SITE_URL}/feeds/rss.xml` },
    },
    openGraph: {
      type: "article",
      title: article.question,
      description: article.summary,
      url: feedArticleUrl(article),
      publishedTime: `${article.publishedAt}T12:00:00Z`,
      section: article.categoryLabel,
    },
  }
}

function jsonLdScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
}

export default async function FeedArticlePage({ params }: FeedArticlePageProps) {
  const { slug } = await params
  const article = getFeedArticle(slug)
  if (!article) notFound()

  const category = FEED_CATEGORIES.find((item) => item.slug === article.category)
  const related = FEED_ARTICLES.filter((item) => item.category === article.category && item.slug !== article.slug).slice(0, 3)
  const structuredData = {
    ...getFeedJsonLd(article),
    mainEntity: {
      "@type": "Question",
      name: article.question,
      acceptedAnswer: { "@type": "Answer", text: article.answer },
    },
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 md:py-16">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/feeds" className="inline-flex items-center gap-2 hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" /> Field guides</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/feeds?category=${article.category}`} className="hover:text-foreground">{article.categoryLabel}</Link>
        </nav>

        <header className="flex flex-col gap-5 border-b pb-8">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-primary">{article.categoryLabel}</span>
            <span aria-hidden="true" className="text-muted-foreground">·</span>
            <time dateTime={article.publishedAt} className="text-muted-foreground">Updated {new Date(`${article.publishedAt}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</time>
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">{article.question}</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground text-pretty">{article.summary}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span>For: {article.audience}</span>
            <Link href={category ? `/feeds/rss/${category.slug}` : "/feeds/rss.xml"} className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
              <Rss aria-hidden="true" className="size-4" /> Follow this topic
            </Link>
          </div>
        </header>

        <section aria-labelledby="short-answer-heading" className="rounded-xl border bg-secondary/40 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Short answer</p>
          <h2 id="short-answer-heading" className="mt-2 text-2xl font-semibold tracking-tight">What to know</h2>
          <p className="mt-4 text-base leading-relaxed text-foreground text-pretty">{article.answer}</p>
        </section>

        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="flex flex-col gap-10">
            {article.sections.map((section, index) => (
              <section key={section.heading} aria-labelledby={`section-${index}`} className="flex flex-col gap-4">
                <h2 id={`section-${index}`} className="text-2xl font-semibold tracking-tight text-balance">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-base leading-relaxed text-muted-foreground text-pretty">{paragraph}</p>)}
              </section>
            ))}

            <section aria-labelledby="checklist-heading" className="flex flex-col gap-4 border-t pt-8">
              <div>
                <p className="text-sm font-medium text-primary">Put it into practice</p>
                <h2 id="checklist-heading" className="mt-1 text-2xl font-semibold tracking-tight">A site-planning checklist</h2>
              </div>
              <ul className="flex flex-col gap-3">
                {article.checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm leading-relaxed">
                    <span aria-hidden="true" className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" />{item}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="sources-heading" className="flex flex-col gap-4 border-t pt-8">
              <div>
                <p className="text-sm font-medium text-primary">Further reading</p>
                <h2 id="sources-heading" className="mt-1 text-2xl font-semibold tracking-tight">Primary references</h2>
              </div>
              <ol className="flex flex-col gap-3">
                {article.sources.map((source) => (
                  <li key={source.url} className="rounded-lg border bg-card p-4">
                    <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2 font-medium text-primary underline-offset-4 hover:underline">
                      {source.name}<ArrowUpRight aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    </a>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{source.note}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="flex flex-col gap-5 md:sticky md:top-8 md:self-start">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Planning scope</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{article.scope}</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">More in {article.categoryLabel}</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {related.map((item) => <li key={item.slug}><Link href={`/feeds/${item.slug}`} className="text-sm leading-relaxed text-primary underline-offset-4 hover:underline">{item.question}</Link></li>)}
              </ul>
              <Link href="/feeds" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">Browse all guides</Link>
            </div>
          </aside>
        </div>

        <aside className="border-t pt-6">
          <h2 className="font-semibold">Important scope note</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{FEED_EDITORIAL_NOTE}</p>
        </aside>
      </div>
    </main>
  )
}
