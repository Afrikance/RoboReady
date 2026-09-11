import "server-only"

import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { supportInquiry } from "@/lib/db/schema"
import type { ChatMessage, InquiryStatus, InquiryTopic } from "@/lib/support/types"

export type CreateInquiryInput = {
  name?: string | null
  email?: string | null
  topic: InquiryTopic
  message: string
  conversation: ChatMessage[]
  pageUrl?: string | null
  userId?: string | null
}

export async function createInquiry(input: CreateInquiryInput): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(supportInquiry).values({
    id,
    name: input.name?.trim() || null,
    email: input.email?.trim() || null,
    topic: input.topic,
    message: input.message.trim(),
    conversation: input.conversation,
    pageUrl: input.pageUrl?.trim() || null,
    userId: input.userId ?? null,
    status: "new",
    source: "robo",
  })
  return { id }
}

export async function listInquiries() {
  return db.select().from(supportInquiry).orderBy(desc(supportInquiry.createdAt))
}

export async function setInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  await db
    .update(supportInquiry)
    .set({ status, updatedAt: new Date() })
    .where(eq(supportInquiry.id, id))
}

export async function countOpenInquiries(): Promise<number> {
  const rows = await db
    .select({ id: supportInquiry.id })
    .from(supportInquiry)
    .where(eq(supportInquiry.status, "new"))
  return rows.length
}
