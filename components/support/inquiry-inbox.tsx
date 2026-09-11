"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ChevronDown, Mail, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { updateInquiryStatus } from "@/app/actions/support"
import {
  INQUIRY_STATUSES,
  STATUS_LABELS,
  TOPIC_LABELS,
  type ChatMessage,
  type InquiryStatus,
  type InquiryTopic,
} from "@/lib/support/types"

export type InquiryItem = {
  id: string
  name: string | null
  email: string | null
  topic: InquiryTopic
  message: string
  conversation: ChatMessage[]
  status: InquiryStatus
  pageUrl: string | null
  createdAt: string
}

const STATUS_STYLES: Record<InquiryStatus, string> = {
  new: "bg-primary text-primary-foreground",
  in_progress: "bg-amber-500 text-white",
  resolved: "bg-emerald-600 text-white",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function InquiryInbox({ inquiries }: { inquiries: InquiryItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {inquiries.map((item) => (
        <InquiryCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function InquiryCard({ item }: { item: InquiryItem }) {
  const [status, setStatus] = useState<InquiryStatus>(item.status)
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()

  function changeStatus(next: InquiryStatus) {
    if (next === status || pending) return
    const previous = status
    setStatus(next)
    startTransition(async () => {
      const res = await updateInquiryStatus(item.id, next)
      if (!res.ok) {
        setStatus(previous)
        toast.error(res.error)
      } else {
        toast.success(`Marked ${STATUS_LABELS[next].toLowerCase()}`)
      }
    })
  }

  return (
    <Card className={cn(status === "resolved" && "opacity-70")}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{item.name?.trim() || "Anonymous visitor"}</span>
              <Badge variant="secondary">{TOPIC_LABELS[item.topic]}</Badge>
            </div>
            {item.email ? (
              <a
                href={`mailto:${item.email}`}
                className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Mail className="size-3.5" />
                {item.email}
              </a>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">No email provided</p>
            )}
          </div>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={item.createdAt}>
            {formatDate(item.createdAt)}
          </time>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-pretty">{item.message}</p>

        {item.conversation.length > 0 ? (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={expanded}
            >
              <MessageSquare className="size-3.5" />
              {expanded ? "Hide" : "View"} conversation ({item.conversation.length})
              <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            </button>
            {expanded ? (
              <div className="mt-2 space-y-2 rounded-md border bg-muted/40 p-3">
                {item.conversation.map((m, i) => (
                  <div key={i} className="text-xs leading-relaxed">
                    <span className="font-semibold">{m.role === "user" ? "Visitor" : "Robo"}: </span>
                    <span className="whitespace-pre-wrap text-muted-foreground">{m.content}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 border-t pt-3">
          <span className="mr-1 text-xs text-muted-foreground">Status</span>
          {INQUIRY_STATUSES.map((s) => {
            const active = s === status
            return (
              <button
                key={s}
                type="button"
                onClick={() => changeStatus(s)}
                disabled={pending}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                  active ? STATUS_STYLES[s] : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
