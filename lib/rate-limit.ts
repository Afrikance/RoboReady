import "server-only"

import { lt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { blogApiRateBucket } from "@/lib/db/schema"

/** Atomic, database-backed per-minute limiter shared by app routes and actions. */
export async function consumeRateLimit(key: string, limit: number): Promise<boolean> {
  const now = new Date()
  const bucketStart = new Date(now)
  bucketStart.setUTCSeconds(0, 0)

  const [row] = await db
    .insert(blogApiRateBucket)
    .values({ rateKey: key, bucketStart, requestCount: 1 })
    .onConflictDoUpdate({
      target: [blogApiRateBucket.rateKey, blogApiRateBucket.bucketStart],
      set: { requestCount: sql`${blogApiRateBucket.requestCount} + 1` },
    })
    .returning({ requestCount: blogApiRateBucket.requestCount })

  await db
    .delete(blogApiRateBucket)
    .where(lt(blogApiRateBucket.bucketStart, new Date(now.getTime() - 48 * 60 * 60 * 1000)))

  return row.requestCount <= limit
}
