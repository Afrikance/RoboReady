"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Radar,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldQuestion,
  Building2,
  Bot,
  Car,
  MapPin,
  Network,
  FileSearch,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { startDiscovery, approveDiscovery, rejectDiscovery } from "@/app/actions/robosearch"
import { ENTITY_KINDS, type EntityKind, type GraphCounts, type ResearchJobView, type RoboEntityView } from "@/lib/robosearch/types"

const KIND_LABEL: Record<EntityKind, string> = {
  company: "Companies",
  robot: "Robots",
  vehicle: "Vehicles",
  property: "Properties",
  location: "Locations",
  infrastructure: "Infrastructure",
}

const KIND_ICON: Record<EntityKind, typeof Building2> = {
  company: Building2,
  robot: Bot,
  vehicle: Car,
  property: Building2,
  location: MapPin,
  infrastructure: Network,
}

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "bg-primary/15 text-primary",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className={cn("text-2xl font-semibold tabular-nums", accent && value > 0 && "text-primary")}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function ProposalCard({
  job,
  onReviewed,
}: {
  job: ResearchJobView
  onReviewed: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const entities = job.proposal?.entities ?? []

  function act(fn: (id: string) => Promise<{ ok: boolean; message?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn(job.id)
      if (!res.ok) setError(res.message ?? "Something went wrong.")
      else onReviewed()
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-pretty">{job.summary ?? "Discovery proposal"}</p>
          {job.proposal?.interpretation ? (
            <p className="mt-1 text-xs text-muted-foreground text-pretty">{job.proposal.interpretation}</p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          <ShieldQuestion className="size-3.5" />
          Awaiting review
        </span>
      </div>

      <ul className="divide-y divide-border">
        {entities.map((ent, i) => {
          const Icon = KIND_ICON[ent.kind] ?? Building2
          return (
            <li key={i} className="flex items-start gap-3 p-4">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{ent.name}</p>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", CONFIDENCE_STYLE[ent.confidence])}>
                    {ent.confidence}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{ent.kind}</span>
                </div>
                {ent.summary ? <p className="mt-1 text-xs text-muted-foreground text-pretty">{ent.summary}</p> : null}
                {ent.claims.length ? (
                  <ul className="mt-2 space-y-1">
                    {ent.claims.map((c, j) => (
                      <li key={j} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.predicate}:</span> {c.value}
                        {c.sourceUrl ? (
                          <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="ml-1 text-primary underline underline-offset-2">
                            source
                          </a>
                        ) : (
                          <span className="ml-1 italic">(AI inference — unverified)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          )
        })}
        {entities.length === 0 ? (
          <li className="p-4 text-xs text-muted-foreground">The workforce returned no candidates for this run.</li>
        ) : null}
      </ul>

      {error ? <p className="px-4 pt-3 text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center justify-end gap-2 p-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => act(rejectDiscovery)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <XCircle className="size-4" />
          Reject
        </button>
        <button
          type="button"
          disabled={pending || entities.length === 0}
          onClick={() => act(approveDiscovery)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Approve into RoboGraph
        </button>
      </div>
    </div>
  )
}

export function RobosearchConsole({
  counts,
  proposals,
  entities,
}: {
  counts: GraphCounts
  proposals: ResearchJobView[]
  entities: RoboEntityView[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [market, setMarket] = useState("")
  const [kind, setKind] = useState<EntityKind>("company")
  const [count, setCount] = useState(6)
  const [formError, setFormError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (market.trim().length < 2) {
      setFormError("Describe the market or region to search.")
      return
    }
    const fd = new FormData()
    fd.set("market", market.trim())
    fd.set("entityKind", kind)
    fd.set("count", String(count))
    startTransition(async () => {
      const res = await startDiscovery(fd)
      if (!res.ok) setFormError(res.message)
      else {
        setMarket("")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Entities" value={counts.entities} />
        <Stat label="Active" value={counts.activeEntities} />
        <Stat label="Claims" value={counts.claims} />
        <Stat label="Unverified" value={counts.awaitingVerification} />
        <Stat label="Sources" value={counts.sources} />
        <Stat label="Awaiting review" value={counts.proposalsAwaitingReview} accent />
      </div>

      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Run a discovery job</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">
          RoboScout and its specialists search a market and propose candidate entities. Nothing enters the RoboGraph
          until you approve it — AI may propose, evidence establishes.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="e.g. warehouses in Austin, TX needing robot readiness"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as EntityKind)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {ENTITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={12}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-20 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
            {pending ? "Searching…" : "Discover"}
          </button>
        </div>
        {formError ? <p className="mt-2 text-xs text-destructive">{formError}</p> : null}
      </form>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileSearch className="size-4 text-muted-foreground" />
          Proposals awaiting review
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{proposals.length}</span>
        </h2>
        {proposals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No proposals waiting. Run a discovery job to populate the review queue.
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((job) => (
              <ProposalCard key={job.id} job={job} onReviewed={() => router.refresh()} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Network className="size-4 text-muted-foreground" />
          RoboGraph entities
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{entities.length}</span>
        </h2>
        {entities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            The graph is empty. Approved discoveries land here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Kind</th>
                  <th className="px-4 py-2 font-medium">Verification</th>
                  <th className="px-4 py-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entities.map((ent) => {
                  const Icon = KIND_ICON[ent.kind] ?? Building2
                  return (
                    <tr key={ent.id}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{ent.canonicalName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{ent.kind}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <ShieldQuestion className="size-3.5" />
                          {ent.verification}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", CONFIDENCE_STYLE[ent.confidence])}>
                          {ent.confidence}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
