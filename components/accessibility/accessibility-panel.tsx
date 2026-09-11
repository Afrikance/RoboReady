import { RunAI } from "@/components/shared/run-ai"
import { VerifyAccessibility } from "@/components/accessibility/verify-accessibility"
import { runAccessibility } from "@/app/actions/planners"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react"

type Audit = {
  id: string
  score: number | null
  summary: string | null
  findings: unknown
  requiresVerification: boolean
  verifiedAt: Date | string | null
  version: number
} | null

const SEVERITY_STYLE: Record<string, string> = {
  high: "text-[var(--score-low)]",
  medium: "text-[var(--score-mid)]",
  low: "text-muted-foreground",
}

export function AccessibilityPanel({
  propertyId,
  audit,
  canVerify,
}: {
  propertyId: string
  audit: Audit
  canVerify: boolean
}) {
  const run = runAccessibility.bind(null, propertyId)

  if (!audit || audit.score == null) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No accessibility audit yet</p>
        <p className="mb-5 mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          Vera audits the property for accessibility as it intersects with autonomous operations. Every finding is
          flagged for confirmation by a licensed professional.
        </p>
        <RunAI action={run} label="Run accessibility audit" successMessage="Accessibility audit ready" />
      </div>
    )
  }

  const findings =
    (audit.findings as Array<{
      area: string
      severity: string
      observation: string
      recommendation: string
      needsProfessionalVerification: boolean
    }>) ?? []

  return (
    <div className="space-y-6">
      <div
        className={
          audit.requiresVerification
            ? "flex items-start gap-3 rounded-lg border border-[var(--score-mid)]/40 bg-[var(--score-mid)]/10 p-4"
            : "flex items-start gap-3 rounded-lg border border-[var(--score-high)]/40 bg-[var(--score-high)]/10 p-4"
        }
      >
        {audit.requiresVerification ? (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--score-mid)]" />
        ) : (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--score-high)]" />
        )}
        <div className="flex-1 text-sm">
          <p className="font-medium">
            {audit.requiresVerification
              ? "Pending professional verification"
              : "Verified by a licensed professional"}
          </p>
          <p className="mt-0.5 text-muted-foreground text-pretty">
            {audit.requiresVerification
              ? "This AI-generated audit is preliminary. A licensed accessibility professional must confirm findings before they are relied upon or shared with a client."
              : "A qualified professional has confirmed this audit."}
          </p>
          {audit.requiresVerification && canVerify ? (
            <div className="mt-3">
              <VerifyAccessibility propertyId={propertyId} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-primary/30">
            <span className="text-xl font-semibold tabular-nums">{audit.score}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Accessibility readiness</h3>
              <Badge variant="secondary">v{audit.version}</Badge>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground text-pretty">{audit.summary}</p>
          </div>
        </div>
        <RunAI action={run} label="Re-run" variant="outline" size="sm" successMessage="Accessibility audit ready" />
      </div>

      {findings.length > 0 ? (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" /> Findings
          </h3>
          <ul className="space-y-2">
            {findings.map((f, i) => (
              <li key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium capitalize">{f.area}</span>
                  <div className="flex items-center gap-2">
                    {f.needsProfessionalVerification ? (
                      <Badge variant="outline" className="border-[var(--score-mid)]/50 text-[10px] text-[var(--score-mid)]">
                        Needs verification
                      </Badge>
                    ) : null}
                    <span className={`text-xs font-medium capitalize ${SEVERITY_STYLE[f.severity] ?? ""}`}>
                      {f.severity}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground text-pretty">{f.observation}</p>
                <p className="mt-1 text-xs font-medium text-primary text-pretty">{f.recommendation}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
