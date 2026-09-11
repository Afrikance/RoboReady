import { RunAI } from "@/components/shared/run-ai"
import { runWayfinding } from "@/app/actions/planners"
import { BOARDING_SIGNAL_LEGEND } from "@/lib/ai/schemas"
import { Badge } from "@/components/ui/badge"
import { Route, Radio, ArrowRight, Footprints, MoveVertical, TreePine, MapPin } from "lucide-react"

type PassengerStep = {
  step: number
  location: string
  instruction: string
  landmark: string
  mode: string
  signalCue: string
}

type BoardingSignal = { signal: string; meaning: string; guestAction: string }

type Wayfinding = {
  summary: string | null
  routes: unknown
  signage: unknown
  passengerJourney?: unknown
  boardingSignals?: unknown
  version: number
} | null

const MODE_LABEL: Record<string, string> = { robotaxi: "Robotaxi", robot: "Robot", drone: "Drone", shared: "Shared" }
const SIGN_LABEL: Record<string, string> = { beacon: "Beacon", qr: "QR code", fiducial: "Fiducial", sign: "Signage" }

const JOURNEY_MODE_ICON: Record<string, typeof Footprints> = {
  walk: Footprints,
  elevator: MoveVertical,
  outdoor: TreePine,
}

// Guest-facing dot color for each boarding signal. Green pulses to convey the
// "flashing = board now" state.
const SIGNAL_DOT: Record<string, string> = {
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  green: "bg-green-500 animate-pulse",
  red: "bg-red-500",
}
const SIGNAL_LABEL: Record<string, string> = { blue: "Blue", amber: "Amber", green: "Green (flashing)", red: "Red" }

export function WayfindingPanel({ propertyId, plan }: { propertyId: string; plan: Wayfinding }) {
  const run = runWayfinding.bind(null, propertyId)

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No wayfinding plan yet</p>
        <p className="mb-5 mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          Patha maps the guest journey from room to robotaxi LandingPad with boarding signals, plus robot and drone
          circulation — named routes with clearance requirements and machine-readable signage placement.
        </p>
        <RunAI action={run} label="Generate wayfinding plan" successMessage="Wayfinding plan ready" />
      </div>
    )
  }

  const routes = (plan.routes as Array<{ name: string; from: string; to: string; mode: string; clearance: string; notes: string }>) ?? []
  const signage = (plan.signage as Array<{ type: string; location: string; purpose: string }>) ?? []
  const journey = ((plan.passengerJourney as PassengerStep[]) ?? []).slice().sort((a, b) => a.step - b.step)
  const signals = (plan.boardingSignals as BoardingSignal[]) ?? []
  // Always show a legend, falling back to the canonical one if the model omitted it.
  const signalLegend = signals.length > 0 ? signals : BOARDING_SIGNAL_LEGEND

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

      {journey.length > 0 ? (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-muted-foreground" /> Getting to your robotaxi
          </h3>
          <ol className="space-y-3">
            {journey.map((s) => {
              const Icon = JOURNEY_MODE_ICON[s.mode] ?? Footprints
              return (
                <li key={s.step} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {s.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium text-pretty">{s.location}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">{s.instruction}</p>
                    {s.landmark ? (
                      <p className="mt-1 text-xs text-muted-foreground text-pretty">
                        <span className="font-medium text-foreground">Look for:</span> {s.landmark}
                      </p>
                    ) : null}
                    {s.signalCue ? (
                      <p className="mt-1 text-xs text-primary text-pretty">{s.signalCue}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Radio className="h-4 w-4 text-muted-foreground" /> Boarding signals
        </h3>
        <p className="text-xs text-muted-foreground text-pretty">
          Watch the LandingPad indicator. Only board on a flashing green signal.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {signalLegend.map((sig) => (
            <div key={sig.signal} className="flex gap-3 rounded-lg border border-border bg-card p-4">
              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full ${SIGNAL_DOT[sig.signal] ?? "bg-muted-foreground"}`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{SIGNAL_LABEL[sig.signal] ?? sig.signal}</p>
                <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{sig.meaning}</p>
                <p className="mt-1 text-xs text-pretty">
                  <span className="font-medium text-primary">Do: </span>
                  <span className="text-muted-foreground">{sig.guestAction}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

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
