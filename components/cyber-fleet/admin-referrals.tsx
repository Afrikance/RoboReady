"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bell, ChevronLeft, ChevronRight, Bot, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { scoreBand } from "@/components/score/score-gauge"
import { ReferralStatusBadge } from "@/components/cyber-fleet/status-badge"
import { ADMIN_ACTIONABLE_STATUSES, REFERRAL_STATUS_LABELS, type ReferralStatus } from "@/lib/cyber-fleet"
import { sendReferralReminder, updateReferralStatus, type ReferralRow } from "@/app/actions/cyber-fleet"

const PAGE_SIZE = 10

export function AdminReferrals({ referrals }: { referrals: ReferralRow[] }) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(referrals.length / PAGE_SIZE))
  const rows = useMemo(() => referrals.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [referrals, page])

  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <Bot className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No referrals yet</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          When an assessed property qualifies, a referral appears here for handoff to the partner.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((r) => (
          <ReferralItem key={r.id} row={r} />
        ))}
      </ul>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {pageCount} · {referrals.length} total
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ReferralItem({ row }: { row: ReferralRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function changeStatus(status: ReferralStatus) {
    startTransition(async () => {
      const res = await updateReferralStatus(row.id, status)
      if (res.ok) {
        toast.success(`Marked ${REFERRAL_STATUS_LABELS[status].toLowerCase()}.`)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function remind() {
    startTransition(async () => {
      const res = await sendReferralReminder(row.id)
      if (res.ok) {
        toast.success("Reminder sent to the owner.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  const contact = row.contactName || row.ownerName || "—"
  const contactSub = row.contactEmail || row.ownerEmail

  return (
    <li className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4 min-w-0">
        {row.roboReadyScore != null ? (
          <span
            className="mt-0.5 font-mono text-lg font-semibold tabular-nums"
            style={{ color: `var(--score-${scoreBand(row.roboReadyScore)})` }}
          >
            {row.roboReadyScore}
          </span>
        ) : (
          <span className="mt-0.5 font-mono text-lg text-muted-foreground">—</span>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{row.propertyName ?? "Property"}</p>
          <p className="truncate text-sm text-muted-foreground">
            {contact}
            {contactSub ? ` · ${contactSub}` : ""}
            {row.contactPhone ? ` · ${row.contactPhone}` : ""}
          </p>
          {row.notes ? <p className="mt-1 text-xs text-muted-foreground text-pretty line-clamp-2">{row.notes}</p> : null}
          <div className="mt-2 flex items-center gap-2">
            <ReferralStatusBadge status={row.status} />
            {row.requestedAt ? (
              <span className="text-xs text-muted-foreground">
                Requested {new Date(row.requestedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {row.status === "eligible" ? (
          <Button variant="outline" size="sm" onClick={remind} disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Bell className="mr-1.5 size-4" />}
            Send reminder
          </Button>
        ) : null}
        <Select value={row.status} onValueChange={(v) => changeStatus(v as ReferralStatus)} disabled={pending}>
          <SelectTrigger className="w-[150px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* Current status shown but only actionable targets are selectable. */}
            {!ADMIN_ACTIONABLE_STATUSES.includes(row.status) ? (
              <SelectItem value={row.status} disabled>
                {REFERRAL_STATUS_LABELS[row.status]}
              </SelectItem>
            ) : null}
            {ADMIN_ACTIONABLE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {REFERRAL_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </li>
  )
}
