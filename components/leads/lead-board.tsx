"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateLeadStage } from "@/app/actions/leads"
import { LEAD_STAGES, type LeadStage } from "@/lib/leads/types"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoveRight, Sparkles } from "lucide-react"

export type BoardLead = {
  id: string
  company: string
  contactName: string | null
  stage: string
  estimatedValue: string | null
  source: string
  qualification: unknown
}

const STAGE_LABEL: Record<LeadStage, string> = {
  new: "New",
  qualifying: "Qualifying",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
}

const RATING_STYLE: Record<string, string> = {
  hot: "text-[var(--score-low)]",
  warm: "text-[var(--score-mid)]",
  cold: "text-muted-foreground",
}

function money(v: string | null) {
  if (!v) return null
  const n = Number(v)
  if (Number.isNaN(n) || n === 0) return null
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export function LeadBoard({ leads }: { leads: BoardLead[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const byStage = (stage: LeadStage) => leads.filter((l) => l.stage === stage)

  function move(id: string, stage: LeadStage) {
    startTransition(async () => {
      const res = await updateLeadStage(id, stage)
      if (res.ok) router.refresh()
      else toast.error(res.error)
    })
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {LEAD_STAGES.map((stage) => {
        const items = byStage(stage)
        return (
          <div key={stage} className="flex w-72 shrink-0 flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">{STAGE_LABEL[stage]}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((l) => {
                const q = l.qualification as { rating?: string; fitScore?: number } | null
                const val = money(l.estimatedValue)
                return (
                  <div key={l.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/dashboard/leads/${l.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium hover:underline">{l.company}</p>
                        {l.contactName ? (
                          <p className="truncate text-xs text-muted-foreground">{l.contactName}</p>
                        ) : null}
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          disabled={pending}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Move lead"
                        >
                          <MoveRight className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {LEAD_STAGES.filter((s) => s !== stage).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => move(l.id, s)}>
                              Move to {STAGE_LABEL[s]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {val ? <Badge variant="secondary" className="text-[10px]">{val}</Badge> : null}
                      {q?.rating ? (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium capitalize ${RATING_STYLE[q.rating] ?? ""}`}>
                          <Sparkles className="h-3 w-3" />
                          {q.rating}
                          {q.fitScore != null ? ` · ${q.fitScore}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  No leads
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
