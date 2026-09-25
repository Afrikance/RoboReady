"use client"

import { useState, useTransition } from "react"
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Database,
  Loader2,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  ENTITY_KINDS,
  ENTITY_KIND_LABELS,
  type EntityKind,
  type GraphCounts,
  type ResearchJobView,
} from "@/lib/robosearch/types"
import { startDiscovery, approveDiscovery, rejectDiscovery } from "@/app/actions/robosearch"

type Props = {
  counts: GraphCounts
  initialJobs: ResearchJobView[]
}

const CONFIDENCE_TONE: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
}

const STATUS_TONE: Record<string, string> = {
  proposed: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-muted text-muted-foreground",
  failed: "bg-destructive/15 text-destructive",
  running: "bg-primary/15 text-primary",
  queued: "bg-muted text-muted-foreground",
}

export function RobosearchConsole({ counts, initialJobs }: Props) {
  const [jobs, setJobs] = useState<ResearchJobView[]>(initialJobs)
  const [market, setMarket] = useState("")
  const [entityKind, setEntityKind] = useState<EntityKind>("company")
  const [count, setCount] = useState(6)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function upsertJob(job: ResearchJobView) {
    setJobs((prev) => {
      const next = prev.filter((j) => j.id !== job.id)
      return [job, ...next]
    })
  }

  function onRun(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set("market", market)
    fd.set("entityKind", entityKind)
    fd.set("count", String(count))
    startTransition(async () => {
      const res = await startDiscovery(fd)
      if (res.ok) {
        upsertJob(res.job)
        setMarket("")
      } else {
        setError(res.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <MetricRow counts={counts} />

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Search className="size-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">Run a discovery</h2>
        </div>
        <p className="mb-5 max-w-2xl text-pretty text-sm text-muted-foreground leading-relaxed">
          RoboSearch dispatches a StaffGPT research crew (RoboScout + specialists) to propose new
          entities for a market. Nothing enters the graph automatically — every proposal lands in the
          review queue below for you to approve or reject.
        </p>
        <form onSubmit={onRun} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="market">Market or region</Label>
              <Input
                id="market"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                placeholder="e.g. Austin, TX logistics & warehousing"
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entityKind">Entity kind</Label>
              <select
                id="entityKind"
                value={entityKind}
                onChange={(e) => setEntityKind(e.target.value as EntityKind)}
                disabled={pending}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {ENTITY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ENTITY_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="count">Count</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={12}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={pending}
                className="w-24"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending || market.trim().length < 2}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Researching…
                </>
              ) : (
                <>
                  <Bot className="size-4" aria-hidden />
                  Dispatch RoboSearch
                </>
              )}
            </Button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </form>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">Review queue</h2>
        </div>
        {jobs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No research jobs yet. Dispatch a discovery above to populate the RoboGraph review queue.
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onUpdate={upsertJob} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MetricRow({ counts }: { counts: GraphCounts }) {
  const items = [
    { label: "Active entities", value: counts.activeEntities, icon: CheckCircle2 },
    { label: "Candidates", value: counts.candidateEntities, icon: CircleDashed },
    { label: "Claims", value: counts.claims, icon: Database },
    { label: "Awaiting review", value: counts.proposalsAwaitingReview, icon: ShieldCheck },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="flex items-center gap-3 p-4">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
            <it.icon className="size-5 text-primary" aria-hidden />
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums">{it.value}</div>
            <div className="text-xs text-muted-foreground">{it.label}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function JobCard({
  job,
  onUpdate,
}: {
  job: ResearchJobView
  onUpdate: (job: ResearchJobView) => void
}) {
  const [open, setOpen] = useState(job.status === "proposed")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const market = typeof job.input?.market === "string" ? job.input.market : "Discovery"
  const proposal = job.proposal
  const entityCount = proposal?.entities.length ?? 0

  function act(kind: "approve" | "reject") {
    setError(null)
    startTransition(async () => {
      const res = kind === "approve" ? await approveDiscovery(job.id) : await rejectDiscovery(job.id)
      if (res.ok) onUpdate(res.job)
      else setError(res.message)
    })
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{market}</span>
            <Badge className={STATUS_TONE[job.status] ?? "bg-muted text-muted-foreground"}>
              {job.status}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {job.jobKind} · {entityCount} proposed
            {job.promotedEntityCount > 0 ? ` · ${job.promotedEntityCount} promoted` : ""}
            {job.employeeSlug ? ` · ${job.employeeSlug}` : ""}
          </span>
        </div>
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t border-border px-4 pb-4 pt-4">
          {job.error ? (
            <p className="mb-3 text-sm text-destructive">{job.error}</p>
          ) : null}
          {proposal?.interpretation ? (
            <p className="mb-1 text-sm">
              <span className="text-muted-foreground">Interpretation: </span>
              {proposal.interpretation}
            </p>
          ) : null}
          {proposal?.note ? (
            <p className="mb-4 text-sm text-muted-foreground">{proposal.note}</p>
          ) : null}

          <div className="flex flex-col gap-3">
            {proposal?.entities.map((ent, i) => (
              <div key={i} className="rounded-md border border-border p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{ent.name}</span>
                  <Badge variant="outline">{ENTITY_KIND_LABELS[ent.kind] ?? ent.kind}</Badge>
                  <Badge className={CONFIDENCE_TONE[ent.confidence] ?? ""}>{ent.confidence}</Badge>
                </div>
                {ent.summary ? (
                  <p className="mb-2 text-sm text-muted-foreground leading-relaxed">{ent.summary}</p>
                ) : null}
                {ent.claims.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {ent.claims.map((c, ci) => (
                      <li key={ci} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.predicate}:</span> {c.value}
                        {c.sourceUrl ? (
                          <>
                            {" "}
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline underline-offset-2 hover:text-foreground"
                            >
                              {c.sourceTitle || "source"}
                            </a>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>

          {job.status === "proposed" ? (
            <div className="mt-4 flex items-center gap-3">
              <Button size="sm" onClick={() => act("approve")} disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden />
                )}
                Approve &amp; promote
              </Button>
              <Button size="sm" variant="outline" onClick={() => act("reject")} disabled={pending}>
                <XCircle className="size-4" aria-hidden />
                Reject
              </Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
