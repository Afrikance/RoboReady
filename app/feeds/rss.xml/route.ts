import { FEED_ARTICLES, FEED_SITE_URL, buildRssFeed } from "@/lib/feeds/content"

export function GET() {
  const xml = buildRssFeed(
    "RoboReady Field Guides",
    "Cited planning answers for robotaxi arrivals, delivery robots, drone handoffs, and commercial property readiness.",
    FEED_ARTICLES,
    `${FEED_SITE_URL}/feeds/rss.xml`,
  )
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
