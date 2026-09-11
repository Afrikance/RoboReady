import { ScoreGauge, scoreBand } from "@/components/score/score-gauge"

const CATEGORY_LABELS: Record<string, string> = {
  access: "Access & Circulation",
  connectivity: "Connectivity & Power",
  layout: "Layout & Environment",
  goals: "Automation Goals",
}

export type ReportData = {
  headline: string
  executiveSummary: string
  sections: Array<{ heading: string; body: string }>
  nextSteps: string[]
  generatedAt?: string
}

export type ReportContext = {
  propertyName: string
  address: string
  organizationName: string
  score: number | null
  scoreSummary: string | null
  breakdown: Array<{ category: string; score: number; rationale: string }>
  findings: Array<{ title: string; severity: string; detail: string }>
  recommendations: Array<{ title: string; priority: string; detail: string; estimatedImpact: string }>
  conceptTitle: string | null
  conceptNarrative: string | null
  assets: Array<{ label: string; assetType: string; quantity: number; unitCost: string | null }>
  report: ReportData | null
}

/** The canonical report layout. Rendered inside the app AND on the print/portal page. */
export function ReportView({ ctx }: { ctx: ReportContext }) {
  const total = ctx.assets.reduce((s, a) => s + (a.unitCost ? Number(a.unitCost) * a.quantity : 0), 0)

  return (
    <article className="mx-auto max-w-3xl space-y-10 text-foreground">
      {/* Header */}
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">RoboReady Assessment</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
          {ctx.report?.headline ?? ctx.propertyName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ctx.propertyName}
          {ctx.address ? ` · ${ctx.address}` : ""} · Prepared by {ctx.organizationName}
        </p>
      </header>

      {/* Score + exec summary */}
      <section className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ScoreGauge score={ctx.score} size={150} />
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Executive summary</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {ctx.report?.executiveSummary ?? ctx.scoreSummary}
          </p>
        </div>
      </section>

      {/* Category breakdown */}
      {ctx.breakdown.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Readiness by category</h2>
          <div className="space-y-3">
            {ctx.breakdown.map((b) => (
              <div key={b.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{CATEGORY_LABELS[b.category] ?? b.category}</span>
                  <span className="tabular-nums" style={{ color: `var(--score-${scoreBand(b.score)})` }}>
                    {b.score}/100
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${b.score}%`, background: `var(--score-${scoreBand(b.score)})` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">{b.rationale}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* AI narrative sections */}
      {ctx.report?.sections?.length ? (
        <section className="space-y-5">
          {ctx.report.sections.map((s, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground text-pretty">{s.body}</p>
            </div>
          ))}
        </section>
      ) : null}

      {/* Site concept */}
      {ctx.conceptNarrative ? (
        <section>
          <h2 className="text-lg font-semibold">{ctx.conceptTitle ?? "Site concept"}</h2>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground text-pretty">
            {ctx.conceptNarrative}
          </p>
        </section>
      ) : null}

      {/* Recommendations */}
      {ctx.recommendations.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recommendations</h2>
          <ol className="space-y-3">
            {ctx.recommendations.map((r, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{r.title}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{r.priority}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">{r.detail}</p>
                <p className="mt-1 text-xs font-medium text-primary">{r.estimatedImpact}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Infrastructure plan */}
      {ctx.assets.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Proposed infrastructure</h2>
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 text-left font-medium">Asset</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Est. cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ctx.assets.map((a, i) => (
                <tr key={i}>
                  <td className="py-2">{a.label}</td>
                  <td className="py-2 text-right tabular-nums">{a.quantity}</td>
                  <td className="py-2 text-right tabular-nums">
                    {a.unitCost ? `$${(Number(a.unitCost) * a.quantity).toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border">
              <tr>
                <td className="py-2 text-right text-xs uppercase tracking-wide text-muted-foreground" colSpan={2}>
                  Estimated total
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">${total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-xs text-muted-foreground">Costs are indicative estimates, not a formal quote.</p>
        </section>
      ) : null}

      {/* Next steps */}
      {ctx.report?.nextSteps?.length ? (
        <section>
          <h2 className="text-lg font-semibold">Next steps</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {ctx.report.nextSteps.map((s, i) => (
              <li key={i} className="text-pretty">{s}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
