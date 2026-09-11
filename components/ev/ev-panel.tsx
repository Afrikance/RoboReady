import { RunAI } from "@/components/shared/run-ai"
import { runEvPlan } from "@/app/actions/planners"
import { Badge } from "@/components/ui/badge"
import { Zap, Gauge, TriangleAlert } from "lucide-react"

type EvPlan = {
  summary: string | null
  stations: unknown
  loadSummary: unknown
  totalCostCents: number | null
  version: number
} | null

const KIND_LABEL: Record<string, string> = {
  level2: "Level 2 AC",
  "dc-fast": "DC fast",
  "robot-charger": "Robot charger",
}

function money(cents: number | null | undefined) {
  if (cents == null) return "—"
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export function EvPanel({ propertyId, plan }: { propertyId: string; plan: EvPlan }) {
  const run = runEvPlan.bind(null, propertyId)

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No charging plan yet</p>
        <p className="mb-5 mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          Volt recommends an EV and robot charging mix, estimates electrical load and service-upgrade needs, and gives
          indicative installed costs.
        </p>
        <RunAI action={run} label="Generate charging plan" successMessage="Charging plan ready" />
      </div>
    )
  }

  const stations =
    (plan.stations as Array<{ kind: string; count: number; powerKw: number; unitCost: number; rationale: string }>) ?? []
  const load = (plan.loadSummary as { estimatedPeakKw: number; serviceUpgradeLikely: boolean; notes: string }) ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">EV &amp; robot charging plan</h3>
            <Badge variant="secondary">v{plan.version}</Badge>
          </div>
          <p className="text-sm text-muted-foreground text-pretty">{plan.summary}</p>
          <p className="pt-1 text-sm">
            <span className="text-muted-foreground">Indicative total: </span>
            <span className="font-semibold">{money(plan.totalCostCents)}</span>
          </p>
        </div>
        <RunAI action={run} label="Re-run" variant="outline" size="sm" successMessage="Charging plan ready" />
      </div>

      {load ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <Gauge className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated peak load</p>
              <p className="text-sm font-semibold tabular-nums">{load.estimatedPeakKw} kW</p>
            </div>
          </div>
          <div
            className={
              load.serviceUpgradeLikely
                ? "flex items-center gap-3 rounded-lg border border-[var(--score-mid)]/40 bg-[var(--score-mid)]/10 p-4"
                : "flex items-center gap-3 rounded-lg border border-border bg-card p-4"
            }
          >
            <TriangleAlert
              className={load.serviceUpgradeLikely ? "h-5 w-5 text-[var(--score-mid)]" : "h-5 w-5 text-muted-foreground"}
            />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Service upgrade</p>
              <p className="text-sm font-semibold">{load.serviceUpgradeLikely ? "Likely required" : "Not expected"}</p>
            </div>
          </div>
          {load.notes ? (
            <p className="text-xs text-muted-foreground text-pretty sm:col-span-2">{load.notes}</p>
          ) : null}
        </div>
      ) : null}

      {stations.length > 0 ? (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-muted-foreground" /> Recommended stations
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stations.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-[10px]">{KIND_LABEL[s.kind] ?? s.kind}</Badge>
                  <span className="text-sm font-semibold tabular-nums">x{s.count}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {s.powerKw} kW · {money(Math.round(s.unitCost * 100))}/unit
                </p>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">{s.rationale}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
