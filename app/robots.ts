import type { MetadataRoute } from "next"
import { getBlogSettings } from "@/lib/blog/data"

export const dynamic = "force-dynamic"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { visible } = await getBlogSettings()
  const disallow = ["/dashboard/", "/api/", ...(visible ? [] : ["/blog"])]
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: "OAI-SearchBot", allow: visible ? ["/", "/blog/", "/feeds/"] : ["/", "/feeds/"], disallow: visible ? ["/dashboard/", "/api/"] : ["/dashboard/", "/api/", "/blog"] },
    ],
    sitemap: "https://roboready.net/sitemap.xml",
    host: "https://roboready.net",
  }
}
