import { Bot } from "lucide-react"

type Concept = {
  title: string
  narrative: string | null
  zones: unknown
  version: number
} | null

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

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-balance">{concept.title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground text-pretty">
          {concept.narrative}
        </p>
      </div>

      {zones.length > 0 ? (
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
      ) : null}
    </div>
  )
}
