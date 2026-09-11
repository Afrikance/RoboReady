import { RunAI } from "@/components/shared/run-ai"
import { runWayfinding } from "@/app/actions/planners"
import { Badge } from "@/components/ui/badge"
import { Route, Radio, ArrowRight } from "lucide-react"

type Wayfinding = {
  summary: string | null
  routes: unknown
  signage: unknown
  version: number
} | null

const MODE_LABEL: Record<string, string> = { robot: "Robot", drone: "Drone", shared: "Shared" }
const SIGN_LABEL: Record<string, string> = { beacon: "Beacon", qr: "QR code", fiducial: "Fiducial", sign: "Signage" }

export function WayfindingPanel({ propertyId, plan }: { propertyId: string; plan: Wayfinding }) {
  const run = runWayfinding.bind(null, propertyId)

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No wayfinding plan yet</p>
        <p className="mb-5 mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          Patha maps robot and drone circulation between key zones — named routes with clearance requirements plus
          machine-readable signage placement.
        </p>
        <RunAI action={run} label="Generate wayfinding plan" successMessage="Wayfinding plan ready" />
      </div>
    )
  }

  const routes = (plan.routes as Array<{ name: string; from: string; to: string; mode: string; clearance: string; notes: string }>) ?? []
  const signage = (plan.signage as Array<{ type: string; location: string; purpose: string }>) ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Wayfinding plan</h3>
            <Badge variant="secondary">v{plan.version}</Badge>
          </div>
          <p className="text-sm text-muted-foreground text-pretty">{plan.summary}</p>
        </div>
        <RunAI action={run} label="Re-run" variant="outline" size="sm" successMessage="Wayfinding plan ready" />
      </div>

      {routes.length > 0 ? (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Route className="h-4 w-4 text-muted-foreground" /> Routes
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {routes.map((r, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{r.name}</span>
                  <Badge variant="outline" className="text-[10px]">{MODE_LABEL[r.mode] ?? r.mode}</Badge>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
                  {r.from} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {r.to}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Clearance: {r.clearance}</p>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">{r.notes}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {signage.length > 0 ? (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Radio className="h-4 w-4 text-muted-foreground" /> Signage &amp; beacons
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {signage.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <Badge variant="secondary" className="text-[10px]">{SIGN_LABEL[s.type] ?? s.type}</Badge>
                <p className="mt-2 text-sm font-medium">{s.location}</p>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">{s.purpose}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
