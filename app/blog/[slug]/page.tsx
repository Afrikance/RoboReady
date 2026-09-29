import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BlogArticleContent, BlogPageFrame } from "@/components/blog/public/blog-components"
import { getBlogSettings, getBlogPostBySlugPublic } from "@/lib/blog/data"
import { safeArticleCanonical } from "@/lib/blog/validation"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, settings] = await Promise.all([params, getBlogSettings()])
  if (!settings.visible) return { title: "Not found", robots: { index: false, follow: false } }
  const post = await getBlogPostBySlugPublic(slug)
  if (!post) return { title: "Article not found", robots: { index: false, follow: false } }
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    alternates: { canonical: safeArticleCanonical(post.slug, post.canonicalUrl) },
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      url: safeArticleCanonical(post.slug, post.canonicalUrl),
      publishedTime: (post.publishedAt ?? post.updatedAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.authorName],
      images: post.media.filter((media) => media.mediaType === "image").map((media) => ({ url: media.url, alt: media.altText || media.caption || post.title })),
    },
    twitter: { card: post.media.some((media) => media.mediaType === "image") ? "summary_large_image" : "summary" },
  }
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, settings] = await Promise.all([params, getBlogSettings()])
  if (!settings.visible) notFound()
  const post = await getBlogPostBySlugPublic(slug)
  if (!post) notFound()
  return <BlogPageFrame><BlogArticleContent post={post} /></BlogPageFrame>
}
