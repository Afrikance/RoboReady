"use server"

import { requireUser } from "@/lib/tenancy"
import {
  listNotificationsFor,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCountFor,
} from "@/lib/notifications"

export type NotificationView = {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  createdAt: string
}

export async function getNotifications(): Promise<{ items: NotificationView[]; unread: number }> {
  const user = await requireUser()
  const [rows, unread] = await Promise.all([listNotificationsFor(user.id), unreadCountFor(user.id)])
  return {
    unread,
    items: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      href: n.href ?? null,
      read: n.readAt != null,
      createdAt: n.createdAt.toISOString(),
    })),
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  const user = await requireUser()
  return unreadCountFor(user.id)
}

export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await requireUser()
  await markNotificationRead(user.id, id)
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser()
  await markAllNotificationsRead(user.id)
}
