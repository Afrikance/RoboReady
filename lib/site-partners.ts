import "server-only"

import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { sitePartner, siteSettings, type AdminSitePartner, type PublicSitePartner } from "@/lib/db/schema"

export async function getHomePartnerShowcase() {
  const [settings] = await db
    .select({
      visible: siteSettings.partnersVisible,
      marquee: siteSettings.partnerMarquee,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, "global"))
    .limit(1)

  const visible = settings?.visible ?? true
  const marquee = settings?.marquee ?? false
  if (!visible) return { visible, marquee, partners: [] as PublicSitePartner[] }

  const partners = await db
    .select({
      id: sitePartner.id,
      name: sitePartner.name,
      logoUrl: sitePartner.logoUrl,
      destinationUrl: sitePartner.destinationUrl,
      linkActive: sitePartner.linkActive,
      sortOrder: sitePartner.sortOrder,
    })
    .from(sitePartner)
    .where(eq(sitePartner.visible, true))
    .orderBy(asc(sitePartner.sortOrder), asc(sitePartner.name))

  return { visible, marquee, partners }
}

export async function getAdminSitePartners(): Promise<AdminSitePartner[]> {
  return db
    .select({
      id: sitePartner.id,
      name: sitePartner.name,
      logoUrl: sitePartner.logoUrl,
      destinationUrl: sitePartner.destinationUrl,
      visible: sitePartner.visible,
      linkActive: sitePartner.linkActive,
      sortOrder: sitePartner.sortOrder,
    })
    .from(sitePartner)
    .orderBy(asc(sitePartner.sortOrder), asc(sitePartner.name))
}

export async function getPartnerDisplaySettings() {
  const [settings] = await db
    .select({
      visible: siteSettings.partnersVisible,
      marquee: siteSettings.partnerMarquee,
    })
    .from(siteSettings)
    .where(eq(siteSettings.id, "global"))
    .limit(1)

  return {
    visible: settings?.visible ?? true,
    marquee: settings?.marquee ?? false,
  }
}

export type { AdminSitePartner, PublicSitePartner }
