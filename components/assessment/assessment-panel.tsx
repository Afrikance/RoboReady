import { ScoreGauge, scoreBand } from "@/components/score/score-gauge"
import { RunAssessment } from "@/components/assessment/run-assessment"
import { CheckoutDialog } from "@/components/checkout/checkout-dialog"
import { startAssessmentCheckout } from "@/app/actions/payments"
import { getProduct } from "@/lib/products"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Lightbulb } from "lucide-react"

function assessmentPriceLabel() {
  const p = getProduct("readiness-assessment")
  if (!p) return ""
  return (p.priceInCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

const CATEGORY_LABELS: Record<string, string> = {
  access: "Access & Circulation",
  connectivity: "Connectivity & Power",
  layout: "Layout & Environment",
  goals: "Automation Goals",
}

const SEVERITY_STYLE: Record<string, string> = {
  high: "text-[var(--score-low)]",
  medium: "text-[var(--score-mid)]",
  low: "text-muted-foreground",
}

const PRIORITY_LABEL: Record<string, string> = { now: "Now", next: "Next", later: "Later" }

type Assessment = {
  roboReadyScore: number | null
  scoreBreakdown: unknown
  findings: unknown
  recommendations: unknown
  summary: string | null
  version: number
  createdAt: Date | string
}

export function AssessmentPanel({
  propertyId,
  assessment,
  intakeComplete,
}: {
  propertyId: string
  assessment: Assessment | null
  intakeComplete: boolean
}) {
  if (!assessment || assessment.roboReadyScore == null) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No assessment yet</p>
        <p className="mb-5 mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          {intakeComplete
            ? "Run the AI workforce to generate a RoboReady Score, findings, a site concept, and an infrastructure plan."
            : "You can run an assessment now, but completing the intake first produces a much more accurate score."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <CheckoutDialog
            start={startAssessmentCheckout.bind(null, propertyId)}
            triggerLabel={`Purchase assessment · ${assessmentPriceLabel()}`}
            title="Purchase RoboReady Assessment"
            priceLabel={`One-time ${assessmentPriceLabel()} for a full autonomous-readiness assessment of this property.`}
          />
          <RunAssessment propertyId={propertyId} />
        </div>
      </div>
    )
  }

  const breakdown = (assessment.scoreBreakdown as Array<{ category: string; score: number; rationale: string }>) ?? []
  const findings = (assessment.findings as Array<{ title: string; severity: string; detail: string }>) ?? []
  const recommendations =
    (assessment.recommendations as Array<{ title: string; priority: string; detail: string; estimatedImpact: string }>) ??
    []

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

      {breakdown.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Category breakdown</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {breakdown.map((b) => (
              <div key={b.category} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{CATEGORY_LABELS[b.category] ?? b.category}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: `var(--score-${scoreBand(b.score)})` }}>
                    {b.score}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${b.score}%`, background: `var(--score-${scoreBand(b.score)})` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground text-pretty">{b.rationale}</p>
              </div>
            ))}
          </div>
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
    </div>
  )
}
