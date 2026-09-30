import { FEED_CATEGORIES, FEED_SITE_URL, buildRssFeed, getArticlesForCategory } from "@/lib/feeds/content"

type CategoryFeedContext = {
  params: Promise<{ category: string }>
}

export async function GET(_request: Request, { params }: CategoryFeedContext) {
  const { category: slug } = await params
  const category = FEED_CATEGORIES.find((item) => item.slug === slug)
  if (!category) return new Response("Feed not found", { status: 404 })

  const articles = getArticlesForCategory(category.slug)
  const xml = buildRssFeed(
    `RoboReady Field Guides — ${category.label}`,
    category.description,
    articles,
    `${FEED_SITE_URL}/feeds/rss/${category.slug}`,
  )

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Feed-Items": String(articles.length),
    },
  })
}
