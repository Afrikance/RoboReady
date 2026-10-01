import "server-only"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { siteSettings } from "@/lib/db/schema"

export async function getRoboDefaultOpen(): Promise<boolean> {
  const [settings] = await db
    .select({ roboDefaultOpen: siteSettings.roboDefaultOpen })
    .from(siteSettings)
    .where(eq(siteSettings.id, "global"))
    .limit(1)

  return settings?.roboDefaultOpen ?? false
}
