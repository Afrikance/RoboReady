import { ScoreGauge, scoreBand } from "@/components/score/score-gauge"
import { scoreCategoryLabel, scoreCategoryMax } from "@/lib/ai/schemas"
import { PlanSchematic } from "@/components/plans/plan-schematic"
import { CyberFleetCta } from "@/components/cyber-fleet/cyber-fleet-cta"
import type { ReferralCtaData } from "@/lib/cyber-fleet"
import { Lock } from "lucide-react"
import {
  getAssessmentTier,
  nextTier,
  type AssessmentTierId,
  type ReportFeature,
} from "@/lib/products"

export type ReportData = {
  headline: string
  executiveSummary: string
  sections: Array<{ heading: string; body: string }>
  nextSteps: string[]
  generatedAt?: string
}

export type ReportContext = {
  /** Highest assessment tier the property has paid for (null = none). */
  tier: AssessmentTierId | null
  /** Report features the client is entitled to see. */
  entitled: ReportFeature[]
  propertyName: string
  address: string
  organizationName: string
  score: number | null
  scoreSummary: string | null
  breakdown: Array<{
    category: string
    points?: number
    max?: number
    explanation?: string
    evidence?: string[]
    confidence?: string
    recommendations?: string[]
    // legacy shape
    score?: number
    rationale?: string
  }>
  findings: Array<{ title: string; severity: string; detail: string }>
  recommendations: Array<{ title: string; priority: string; detail: string; estimatedImpact: string }>
  conceptTitle: string | null
  conceptNarrative: string | null
  plan: {
    floorPlan: {
      level?: string
      summary?: string
      spaces?: Array<{ name: string; kind: string; x: number; y: number; w: number; h: number }>
      path?: Array<{ x: number; y: number }>
      markers?: Array<{ x: number; y: number; label: string; kind?: string }>
    } | null
    sitePlan: {
      summary?: string
      elements?: Array<{ name: string; kind: string; x: number; y: number; w: number; h: number }>
      markers?: Array<{ x: number; y: number; label: string; role?: string }>
    } | null
  } | null
  assets: Array<{ label: string; assetType: string; quantity: number; unitCost: string | null }>
  report: ReportData | null
  /** Property id, needed for the partner referral CTA action. */
  propertyId: string
  /** Partner referral offer state (null when not applicable). */
  cyberFleet: ReferralCtaData | null
}

/** A tasteful placeholder shown where a section would be, gated behind a higher tier. */
function LockedSection({ title, feature }: { title: string; feature: ReportFeature }) {
  const upsell = nextTier(null)
  // Find the lowest tier that actually includes this feature, for accurate copy.
  const unlockTier =
    getAssessmentTier("standard")?.includes.includes(feature)
      ? getAssessmentTier("standard")
      : getAssessmentTier("pro")
  const label = unlockTier?.name ?? upsell?.name ?? "a higher tier"
  return (
    <section className="rounded-lg border border-dashed border-border bg-muted/30 p-5 print:hidden">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
        <Lock className="h-4 w-4" /> {title}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
        Included in the <span className="font-medium text-foreground">{label}</span>. Upgrade this assessment to
        unlock {title.toLowerCase()}.
      </p>
    </section>
  )
}

/**
 * The canonical report layout. Rendered inside the app AND on the print/portal
 * page. When `enforce` is true, sections above the property's purchased tier
 * are replaced with a locked upsell stub (client-facing surfaces); when false,
 * everything renders (internal staff preview).
 */
export function ReportView({ ctx, enforce = false }: { ctx: ReportContext; enforce?: boolean }) {
  const has = (f: ReportFeature) => !enforce || ctx.entitled.includes(f)
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
      {has("categories") && ctx.breakdown.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Readiness by category</h2>
          <div className="space-y-3">
            {ctx.breakdown.map((b) => {
              const max = b.max ?? scoreCategoryMax(b.category)
              const pct = max > 0 && b.points != null ? Math.round((b.points / max) * 100) : (b.score ?? 0)
              const pointsLabel = b.points != null && max > 0 ? `${b.points}/${max}` : `${b.score ?? 0}/100`
              const detail = b.explanation ?? b.rationale
              return (
                <div key={b.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{scoreCategoryLabel(b.category)}</span>
                    <span className="tabular-nums" style={{ color: `var(--score-${scoreBand(pct)})` }}>
                      {pointsLabel}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `var(--score-${scoreBand(pct)})` }} />
                  </div>
                  {detail ? <p className="mt-1 text-xs text-muted-foreground text-pretty">{detail}</p> : null}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* AI narrative + site concept (Standard tier and up) */}
      {has("narrative") ? (
        <>
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
          {ctx.conceptNarrative ? (
            <section>
              <h2 className="text-lg font-semibold">{ctx.conceptTitle ?? "Site concept"}</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground text-pretty">
                {ctx.conceptNarrative}
              </p>
            </section>
          ) : null}
        </>
      ) : (
        <LockedSection title="Site concept & narrative report" feature="narrative" />
      )}

      {/* Floor plan + site plan schematics (Pro tier) */}
      {!has("plans") ? (
        <LockedSection title="Floor & site plans" feature="plans" />
      ) : ctx.plan?.floorPlan || ctx.plan?.sitePlan ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Floor &amp; site plans</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {ctx.plan?.floorPlan ? (
              <figure className="space-y-1.5">
                <div className="aspect-square overflow-hidden rounded-lg border border-border bg-card p-2">
                  <PlanSchematic
                    rects={ctx.plan.floorPlan.spaces ?? []}
                    path={ctx.plan.floorPlan.path ?? []}
                    markers={ctx.plan.floorPlan.markers ?? []}
                    ariaLabel="Interior floor plan schematic"
                  />
                </div>
                <figcaption className="text-xs text-muted-foreground">
                  Floor plan — interior{ctx.plan.floorPlan.level ? ` · ${ctx.plan.floorPlan.level}` : ""}
                </figcaption>
              </figure>
            ) : null}
            {ctx.plan?.sitePlan ? (
              <figure className="space-y-1.5">
                <div className="aspect-square overflow-hidden rounded-lg border border-border bg-card p-2">
                  <PlanSchematic
                    rects={ctx.plan.sitePlan.elements ?? []}
                    markers={ctx.plan.sitePlan.markers ?? []}
                    ariaLabel="Exterior site plan schematic"
                  />
                </div>
                <figcaption className="text-xs text-muted-foreground">Site plan — exterior</figcaption>
              </figure>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Recommendations */}
      {has("recommendations") && ctx.recommendations.length > 0 ? (
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

      {/* Infrastructure plan (Standard tier and up) */}
      {has("infrastructure") && ctx.assets.length > 0 ? (
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

      {/* Partner referral offer — client-facing surfaces only, hidden in print. */}
      {enforce && ctx.cyberFleet ? <CyberFleetCta propertyId={ctx.propertyId} data={ctx.cyberFleet} /> : null}
    </article>
  )
}
