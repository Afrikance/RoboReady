"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getNotifications,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationView,
} from "@/app/actions/notifications"
import { cn } from "@/lib/utils"

const POLL_MS = 15000

export function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationView[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const { items, unread } = await getNotifications()
      setItems(items)
      setUnread(unread)
    } catch {
      // ignore — the bell is best-effort
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next) void refresh()
    },
    [refresh],
  )

  async function handleClick(n: NotificationView) {
    if (!n.read) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)))
      setUnread((u) => Math.max(0, u - 1))
      await markNotificationReadAction(n.id)
    }
    setOpen(false)
    if (n.href) router.push(n.href)
  }

  async function markAll() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
    setUnread(0)
    await markAllNotificationsReadAction()
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 ? (
            <button
              onClick={markAll}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/60",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    <span className="flex w-full items-center gap-2">
                      {!n.read ? <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
                      <span className="text-sm font-medium text-pretty">{n.title}</span>
                    </span>
                    {n.body ? (
                      <span className="text-xs text-muted-foreground text-pretty line-clamp-2">{n.body}</span>
                    ) : null}
                    <time className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {formatWhen(n.createdAt)}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatWhen(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return "Just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}
