import { ScoreGauge, scoreBand } from "@/components/score/score-gauge"
import { RunAssessment } from "@/components/assessment/run-assessment"
import { TierPicker } from "@/components/assessment/tier-picker"
import { CheckoutDialog } from "@/components/checkout/checkout-dialog"
import { startAssessmentCheckout } from "@/app/actions/payments"
import { ASSESSMENT_TIERS, tierRank, type AssessmentTier, type AssessmentTierId } from "@/lib/products"
import { scoreCategoryLabel, scoreCategoryMax } from "@/lib/ai/schemas"
import { PremiumBreakdown, type PremiumBreakdown as PremiumBreakdownData } from "@/components/assessment/premium-breakdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react"

function priceLabel(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

/**
 * The tier to nudge the owner toward after an assessment runs. With nothing
 * purchased we recommend the featured Standard tier; otherwise the next tier
 * up. Returns null once the top tier is owned.
 */
function recommendedUpsell(purchasedTier: AssessmentTierId | null): AssessmentTier | null {
  const rank = tierRank(purchasedTier)
  const topRank = Math.max(...ASSESSMENT_TIERS.map((t) => t.rank))
  if (rank >= topRank) return null
  if (rank === 0) return ASSESSMENT_TIERS.find((t) => t.id === "standard") ?? null
  return ASSESSMENT_TIERS.find((t) => t.rank === rank + 1) ?? null
}

const SEVERITY_STYLE: Record<string, string> = {
  high: "text-[var(--score-low)]",
  medium: "text-[var(--score-mid)]",
  low: "text-muted-foreground",
}

const PRIORITY_LABEL: Record<string, string> = { now: "Now", next: "Next", later: "Later" }
const CONFIDENCE_LABEL: Record<string, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" }

type CategoryScore = {
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
}

/** Percentage of a category's cap that was awarded, for the progress bar. */
function categoryPct(b: CategoryScore): number {
  const max = b.max ?? scoreCategoryMax(b.category)
  if (max > 0 && b.points != null) return Math.round((b.points / max) * 100)
  return b.score ?? 0
}

type Assessment = {
  roboReadyScore: number | null
  scoreBreakdown: unknown
  premiumBreakdown?: unknown
  findings: unknown
  recommendations: unknown
  summary: string | null
  version: number
  createdAt: Date | string
}

function UnverifiedWarning() {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-lg border border-[var(--score-mid)]/40 bg-[var(--score-mid)]/10 p-4 text-left">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--score-mid)]" />
      <div>
        <p className="text-sm font-medium">Not admin-verified yet</p>
        <p className="text-xs text-muted-foreground text-pretty">
          This property hasn&apos;t been verified by an admin. You can still run the assessment, but verifying the
          field-collected data first produces a more reliable score.
        </p>
      </div>
    </div>
  )
}

export function AssessmentPanel({
  propertyId,
  assessment,
  intakeComplete,
  unverifiedWarning = false,
  purchasedTier = null,
}: {
  propertyId: string
  assessment: Assessment | null
  intakeComplete: boolean
  /** Soft gate: true when the property is in the prospecting funnel but not yet admin-verified. */
  unverifiedWarning?: boolean
  /** Highest report tier purchased for this property (gates the client report). */
  purchasedTier?: AssessmentTierId | null
}) {
  if (!assessment || assessment.roboReadyScore == null) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          {unverifiedWarning ? <div className="w-full max-w-md"><UnverifiedWarning /></div> : null}
          <p className="text-sm font-medium">No assessment yet</p>
          <p className="mb-5 mt-1 max-w-md text-sm text-muted-foreground text-pretty">
            {intakeComplete
              ? "Run the AI workforce to generate a RoboReady Score, findings, a site concept, and an infrastructure plan."
              : "You can run an assessment now, but completing the intake first produces a much more accurate score."}
          </p>
          <RunAssessment propertyId={propertyId} />
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Report package</h3>
            <p className="text-xs text-muted-foreground text-pretty">
              Choose what the client receives. The purchased tier controls which sections appear in their report and portal.
            </p>
          </div>
          <TierPicker propertyId={propertyId} purchasedTier={purchasedTier} />
        </div>
      </div>
    )
  }

  const breakdown = (assessment.scoreBreakdown as CategoryScore[]) ?? []
  const premium = (assessment.premiumBreakdown as PremiumBreakdownData | null) ?? null
  const findings = (assessment.findings as Array<{ title: string; severity: string; detail: string }>) ?? []
  const recommendations =
    (assessment.recommendations as Array<{ title: string; priority: string; detail: string; estimatedImpact: string }>) ??
    []
  const upsell = recommendedUpsell(purchasedTier)

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-6 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:gap-8">
        <ScoreGauge score={assessment.roboReadyScore} size={140} />
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <h3 className="text-lg font-semibold">RoboReady Score</h3>
            <Badge variant="secondary">v{assessment.version}</Badge>
          </div>
          <p className="text-sm text-muted-foreground text-pretty">{assessment.summary}</p>
          <div className="pt-2">
            <RunAssessment propertyId={propertyId} label="Re-run assessment" />
          </div>
        </div>
      </div>

      {upsell ? (
        <div className="flex flex-col gap-4 rounded-lg border border-primary bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {purchasedTier ? `Upgrade to ${upsell.name}` : `Unlock the full ${upsell.name}`}
              </p>
              <p className="max-w-md text-xs text-muted-foreground text-pretty">
                {purchasedTier
                  ? upsell.description
                  : "This score is a preview. Purchase a report package to share the site concept, infrastructure plan, and cost estimates with the property owner."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CheckoutDialog
              start={startAssessmentCheckout.bind(null, propertyId, upsell.id)}
              triggerLabel={`${purchasedTier ? "Upgrade" : "Buy"} · ${priceLabel(upsell.priceInCents)}`}
              title={`Purchase ${upsell.name}`}
              priceLabel={`One-time ${priceLabel(upsell.priceInCents)} — ${upsell.description}`}
            />
            <Button asChild variant="ghost" size="sm">
              <a href="#report-package">Compare tiers</a>
            </Button>
          </div>
        </div>
      ) : null}

      {breakdown.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Readiness categories</h3>
            <span className="text-xs text-muted-foreground">Autonomous-arrival score · 100 pts</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {breakdown.map((b) => {
              const pct = categoryPct(b)
              const max = b.max ?? scoreCategoryMax(b.category)
              const pointsLabel = b.points != null && max > 0 ? `${b.points} / ${max}` : `${b.score ?? 0}`
              const detail = b.explanation ?? b.rationale
              const evidence = b.evidence ?? []
              const recs = b.recommendations ?? []
              return (
                <div key={b.category} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-pretty">{scoreCategoryLabel(b.category)}</span>
                    <span
                      className="shrink-0 text-sm font-semibold tabular-nums"
                      style={{ color: `var(--score-${scoreBand(pct)})` }}
                    >
                      {pointsLabel}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: `var(--score-${scoreBand(pct)})` }}
                    />
                  </div>
                  {detail ? <p className="mt-2 text-xs text-muted-foreground text-pretty">{detail}</p> : null}
                  {evidence.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
                      <ul className="mt-1 space-y-0.5">
                        {evidence.map((e, i) => (
                          <li key={i} className="flex gap-1.5 text-xs text-muted-foreground text-pretty">
                            <span aria-hidden className="text-primary">·</span>
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {recs.length > 0 ? (
                    <p className="mt-2 text-xs text-pretty">
                      <span className="font-medium text-primary">To improve: </span>
                      <span className="text-muted-foreground">{recs.join("; ")}</span>
                    </p>
                  ) : null}
                  {b.confidence ? (
                    <Badge variant="outline" className="mt-3 text-[10px]">
                      {CONFIDENCE_LABEL[b.confidence] ?? b.confidence}
                    </Badge>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {premium && premium.domains?.length ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Premium multi-domain readiness</h3>
            <span className="text-xs text-muted-foreground">Arrival · EV · Robotics · Delivery · AI-Ops</span>
          </div>
          <PremiumBreakdown data={premium} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {findings.length > 0 ? (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" /> Findings
            </h3>
            <ul className="space-y-2">
              {findings.map((f, i) => (
                <li key={i} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{f.title}</span>
                    <span className={`text-xs font-medium capitalize ${SEVERITY_STYLE[f.severity] ?? ""}`}>
                      {f.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground text-pretty">{f.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {recommendations.length > 0 ? (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-muted-foreground" /> Recommendations
            </h3>
            <ul className="space-y-2">
              {recommendations.map((r, i) => (
                <li key={i} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{r.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {PRIORITY_LABEL[r.priority] ?? r.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground text-pretty">{r.detail}</p>
                  <p className="mt-1 text-xs font-medium text-primary">{r.estimatedImpact}</p>
                </li>
              ))}
          </ul>
        </section>
        ) : null}
      </div>

      <section id="report-package" className="scroll-mt-6 space-y-3 border-t border-border pt-6">
        <div>
          <h3 className="text-sm font-semibold">Report package</h3>
          <p className="text-xs text-muted-foreground text-pretty">
            Choose what the client receives. The purchased tier controls which sections appear in their report and portal.
          </p>
        </div>
        <TierPicker propertyId={propertyId} purchasedTier={purchasedTier} />
      </section>
    </div>
  )
}
