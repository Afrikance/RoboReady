import { Bot, Car, Accessibility, Layers } from "lucide-react"

type PickupZone = {
  role: string
  name: string
  location: string
  rationale: string
  conflicts: string
}

type Concept = {
  title: string
  narrative: string | null
  zones: unknown
  pickupZones?: unknown
  version: number
} | null

const ROLE_META: Record<string, { label: string; icon: typeof Car }> = {
  primary: { label: "Primary Robotaxi Pickup", icon: Car },
  accessible: { label: "Accessible Boarding", icon: Accessibility },
  overflow: { label: "Overflow / Surge", icon: Layers },
}

export function ConceptPanel({ concept }: { concept: Concept }) {
  if (!concept) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No site concept yet</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          Run an assessment — the site designer generates a concept automatically alongside the score.
        </p>
      </div>
    )
  }

  const zones = (concept.zones as Array<{ name: string; purpose: string; automation: string }>) ?? []
  const pickupZones = (concept.pickupZones as PickupZone[]) ?? []

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-balance">{concept.title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground text-pretty">
          {concept.narrative}
        </p>
      </div>

      {pickupZones.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Robotaxi arrival zones</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pickupZones.map((z, i) => {
              const meta = ROLE_META[z.role] ?? { label: z.role, icon: Car }
              const Icon = meta.icon
              return (
                <div key={i} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">{meta.label}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-pretty">{z.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground text-pretty">{z.location}</p>
                  <p className="mt-2 text-xs text-muted-foreground text-pretty">{z.rationale}</p>
                  {z.conflicts ? (
                    <p className="mt-2 text-xs text-pretty">
                      <span className="font-medium text-[var(--score-mid)]">Conflicts: </span>
                      <span className="text-muted-foreground">{z.conflicts}</span>
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {zones.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Operational zones</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((z, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold">{z.name}</p>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">{z.purpose}</p>
                <p className="mt-3 flex items-start gap-1.5 text-xs text-primary">
                  <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="text-pretty">{z.automation}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
