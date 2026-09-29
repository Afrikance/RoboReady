import { notFound } from "next/navigation"
import { BlogArticleContent, BlogPageFrame } from "@/components/blog/public/blog-components"
import { requireBlogAdmin } from "@/lib/blog/admin"
import { getBlogPostForPreview } from "@/lib/blog/data"

export const dynamic = "force-dynamic"
export const metadata = { title: "Article preview", robots: { index: false, follow: false } }

export default async function BlogPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBlogAdmin()
  const { id } = await params
  const post = await getBlogPostForPreview(id)
  if (!post) notFound()
  return <BlogPageFrame><BlogArticleContent post={post} preview /></BlogPageFrame>
}
