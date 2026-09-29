import { notFound } from "next/navigation"
import { BlogEditor } from "@/components/blog/admin/blog-editor"
import { requireBlogAdmin } from "@/lib/blog/admin"
import { getBlogPostForAdmin } from "@/lib/blog/data"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  await requireBlogAdmin()
  const { id } = await params
  const post = await getBlogPostForAdmin(id)
  return { title: post ? `Edit ${post.title}` : "Edit blog article" }
}

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBlogAdmin()
  const { id } = await params
  const post = await getBlogPostForAdmin(id)
  if (!post) notFound()
  return <BlogEditor post={post} />
}
