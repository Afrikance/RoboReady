import { BlogEditor } from "@/components/blog/admin/blog-editor"
import { requireBlogAdmin } from "@/lib/blog/admin"

export const metadata = { title: "New blog article" }
export const dynamic = "force-dynamic"

export default async function NewBlogPostPage() {
  await requireBlogAdmin()
  return <BlogEditor />
}
