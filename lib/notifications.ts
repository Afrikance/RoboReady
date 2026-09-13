import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { notification, user as userTable } from "@/lib/db/schema"

export type NotificationType =
  | "assessment_paid"
  | "assessment_stage"
  | "assessment_ready"
  | "assessment_failed"
  | "assessment_offer"
  | "cyber_fleet_eligible"

export type CreateNotificationInput = {
  organizationId: string
  userId: string
  type: NotificationType
  title: string
  body?: string
  href?: string
  propertyId?: string
  /** Also attempt an email (best-effort). Defaults to true. */
  email?: boolean
}

/**
 * Writes an in-app notification and, best-effort, sends a matching email. The
 * email path is a no-op unless RESEND_API_KEY is configured, so in-app delivery
 * always works regardless of whether email is wired up. Never throws — a
 * notification failure must not break the flow that triggered it.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await db.insert(notification).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      propertyId: input.propertyId ?? null,
    })
  } catch (err) {
    console.log("[v0] createNotification insert failed:", (err as Error).message)
    return
  }

  if (input.email === false) return
  try {
    await sendEmailBestEffort(input)
  } catch (err) {
    console.log("[v0] notification email failed:", (err as Error).message)
  }
}

/** Sends an email via the Resend REST API. No-op when unconfigured. */
async function sendEmailBestEffort(input: CreateNotificationInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const rows = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, input.userId))
    .limit(1)
  const recipient = rows[0]
  if (!recipient?.email) return

  const from = process.env.RESEND_FROM ?? "RoboReady <onboarding@resend.dev>"
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.roboready.net"
  const link = input.href ? `${base}${input.href}` : base

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipient.email,
      subject: input.title,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0f172a">${escapeHtml(input.title)}</h2>
        ${input.body ? `<p style="color:#334155;line-height:1.6">${escapeHtml(input.body)}</p>` : ""}
        <p><a href="${link}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View in RoboReady</a></p>
      </div>`,
    }),
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      default:
        return "&#39;"
    }
  })
}

export async function listNotificationsFor(userId: string, limit = 30) {
  return db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit)
}

export async function unreadCountFor(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)))
  return rows[0]?.count ?? 0
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.id, id), eq(notification.userId, userId)))
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)))
}
