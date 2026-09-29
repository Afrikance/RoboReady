import { BlogAdminDashboard } from "@/components/blog/admin/blog-dashboard"
import { requireBlogAdmin, hasStaffGptBlogSecret } from "@/lib/blog/admin"
import { getBlogPostStatusCounts, getBlogSettings, listBlogGalleryMediaForAdmin, listBlogPostsForAdmin } from "@/lib/blog/data"

export const metadata = { title: "Editorial desk" }
export const dynamic = "force-dynamic"

export default async function BlogAdminPage() {
  await requireBlogAdmin()
  const [settings, posts, counts, gallery] = await Promise.all([
    getBlogSettings(),
    listBlogPostsForAdmin(),
    getBlogPostStatusCounts(),
    listBlogGalleryMediaForAdmin(),
  ])
  return <BlogAdminDashboard posts={posts} settings={settings} counts={counts} gallery={gallery} staffGptConfigured={hasStaffGptBlogSecret()} />
}
