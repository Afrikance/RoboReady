import type { MetadataRoute } from "next"
import { getBlogSettings, getPublishedBlogSlugs } from "@/lib/blog/data"
import { safeArticleCanonical } from "@/lib/blog/validation"
import { FEED_ARTICLES, FEED_CANONICAL_ROOT, FEED_CONTENT_LAST_UPDATED } from "@/lib/feeds/content"

export const dynamic = "force-dynamic"

const SITE_URL = "https://roboready.net"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getBlogSettings()
  const publicPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/government`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/network`, changeFrequency: "weekly", priority: 0.7 },
    { url: FEED_CANONICAL_ROOT, changeFrequency: "weekly", priority: 0.8 },
    ...FEED_ARTICLES.map((article) => ({
      url: `${FEED_CANONICAL_ROOT}/${article.slug}`,
      lastModified: FEED_CONTENT_LAST_UPDATED,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ]
  if (!settings.visible) return publicPages

  const posts = await getPublishedBlogSlugs()
  return [
    ...publicPages,
    { url: `${SITE_URL}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/blog/gallery`, changeFrequency: "weekly", priority: 0.5 },
    ...posts.map((post) => ({
      url: safeArticleCanonical(post.slug, post.canonicalUrl),
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  ]
}
