"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { MapPin, Phone, Sparkles, ClipboardList, ArrowRight, Lock, UserCheck, Hand } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  filterProperties,
  distanceFrom,
  readPrefill,
  readClaim,
  propertyTypeLabel,
  type ProspectRow,
  type PropertyFilter,
} from "@/lib/prospecting/filter"
import { claimProperty, releaseClaim } from "@/app/actions/prospecting"
import { QueueFilterBar } from "@/components/prospecting/queue-filter-bar"

export function HandoverList({
  initialRows,
  currentUserId,
  isAdmin,
}: {
  initialRows: ProspectRow[]
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<PropertyFilter>({})
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const filtered = useMemo(() => filterProperties(initialRows, filter), [initialRows, filter])

  function start(propertyId: string, opts?: { takeover?: boolean }) {
    setPendingId(propertyId)
    startTransition(async () => {
      const res = await claimProperty(propertyId, opts)
      if (res.ok) {
        router.push(`/dashboard/properties/${propertyId}`)
      } else {
        toast.error(res.error)
        setPendingId(null)
        router.refresh()
      }
    })
  }

  function release(propertyId: string) {
    setPendingId(propertyId)
    startTransition(async () => {
      const res = await releaseClaim(propertyId)
      if (res.ok) {
        toast.success("Released back to the pool.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
      setPendingId(null)
    })
  }

  if (initialRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <ClipboardList className="mb-3 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">No properties waiting for field work</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
          When Scout pre-fills a prospect, it lands here for on-site data collection.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <QueueFilterBar value={filter} onChange={setFilter} count={filtered.length} />
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No field-work items match these filters.
        </p>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((p) => {
            const prefill = readPrefill(p.metadata)
            const claim = readClaim(p.metadata)
            const miles = distanceFrom(p, filter.ref)
            const busy = pendingId === p.id
            const mine = claim?.byUserId === currentUserId
            const claimedByOther = claim != null && !mine
            return (
              <li key={p.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{p.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{propertyTypeLabel(p.propertyType)}</Badge>
                      {mine ? (
                        <Badge className="gap-1 text-[10px]">
                          <UserCheck className="h-3 w-3" /> You&apos;re on this
                        </Badge>
                      ) : claimedByOther ? (
                        <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                          <Lock className="h-3 w-3" /> In progress · {claim!.byName}
                        </Badge>
                      ) : null}
                      {miles != null ? <span className="text-xs text-muted-foreground">{miles.toFixed(1)} mi</span> : null}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {[p.addressLine1, p.city, p.region, p.postalCode].filter(Boolean).join(", ") || "No address"}
                    </p>
                    {p.phone ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" /> {p.phone}
                      </p>
                    ) : null}
                    {prefill ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <Sparkles className="h-3 w-3" /> {prefill.filled.length} AI-filled
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--score-mid)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--score-mid)]">
                          <MapPin className="h-3 w-3" /> {prefill.leftBlank.length} need field data
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {mine ? (
                      <>
                        <Button asChild size="sm">
                          <Link href={`/dashboard/properties/${p.id}`}>
                            Continue <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => release(p.id)} disabled={busy}>
                          Release
                        </Button>
                      </>
                    ) : claimedByOther ? (
                      <>
                        <Button size="sm" disabled className="opacity-60">
                          <Lock className="mr-1.5 h-3.5 w-3.5" /> In progress
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => start(p.id, { takeover: true })}
                          disabled={busy}
                        >
                          <Hand className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Taking over…" : "Take over"}
                        </Button>
                        {isAdmin ? (
                          <Button variant="ghost" size="sm" onClick={() => release(p.id)} disabled={busy}>
                            Release
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Button size="sm" onClick={() => start(p.id)} disabled={busy}>
                        {busy ? "Starting…" : "Start field work"}
                        {!busy ? <ArrowRight className="ml-1.5 h-3.5 w-3.5" /> : null}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
