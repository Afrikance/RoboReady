import { ScoreGauge, scoreBand } from "@/components/score/score-gauge"
import { Badge } from "@/components/ui/badge"
import type { LetterGrade } from "@/lib/ai/schemas"

// The persisted premium roll-up shape (see computePremiumScore + assessment
// action). Kept permissive because it is read from a jsonb column.
export type PremiumKeyPoint = {
  keyPointId: string
  domain: string
  label: string
  points: number
  max: number
  grade: LetterGrade | string
  explanation?: string
  evidence?: string[]
  confidence?: string
  recommendations?: string[]
}

export type PremiumDomain = {
  id: string
  label: string
  points: number
  max: number
  pct: number
  grade: LetterGrade | string
  derived?: boolean
}

export type PremiumBreakdown = {
  overall: number
  domains: PremiumDomain[]
  keyPoints: PremiumKeyPoint[]
  domainSummaries?: Array<{ domain: string; summary: string }>
  summary?: string
  generatedAt?: string
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
}

/** A→green, B→green, C→amber, D/F→red, mapped onto the score-band tokens. */
function gradeBand(grade: string): "high" | "mid" | "low" {
  if (grade === "A" || grade === "B") return "high"
  if (grade === "C") return "mid"
  return "low"
}

function GradeBadge({ grade }: { grade: string }) {
  const band = gradeBand(grade)
  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums"
      style={{ background: `var(--score-${band})`, color: "var(--background)" }}
      aria-label={`Grade ${grade}`}
    >
      {grade}
    </span>
  )
}

function DomainBar({ pct, band }: { pct: number; band: "high" | "mid" | "low" | "empty" }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `var(--score-${band})` }} />
    </div>
  )
}

/**
 * The Premium multi-domain graded breakdown: an overall 100-pt roll-up gauge,
 * then each of the five domains with its subtotal + grade, and — for the four
 * scored domains — every key point graded A–F with its evidence. Presentational
 * and print-friendly; used in both the staff panel and the client report.
 */
export function PremiumBreakdown({ data }: { data: PremiumBreakdown }) {
  const summaryByDomain = new Map((data.domainSummaries ?? []).map((d) => [d.domain, d.summary]))
  const keyPointsByDomain = new Map<string, PremiumKeyPoint[]>()
  for (const kp of data.keyPoints ?? []) {
    const arr = keyPointsByDomain.get(kp.domain) ?? []
    arr.push(kp)
    keyPointsByDomain.set(kp.domain, arr)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col items-center gap-6 rounded-lg border border-border bg-card p-6 sm:flex-row sm:gap-8">
        <ScoreGauge score={data.overall} size={140} />
        <div className="flex-1 space-y-1.5 text-center sm:text-left">
          <h3 className="text-lg font-semibold">Premium RoboReady Score</h3>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            5 domains · 100 points · graded A–F
          </p>
          {data.summary ? <p className="text-sm text-muted-foreground text-pretty">{data.summary}</p> : null}
        </div>
      </div>

      <div className="space-y-5">
        {data.domains.map((d) => {
          const kps = keyPointsByDomain.get(d.id) ?? []
          const summary = summaryByDomain.get(d.id)
          return (
            <div key={d.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <GradeBadge grade={String(d.grade)} />
                    <h4 className="text-sm font-semibold text-pretty">{d.label}</h4>
                  </div>
                  {d.derived ? (
                    <p className="mt-1 text-xs text-muted-foreground text-pretty">
                      Derived from the robotaxi-arrival RoboReady Score shown above.
                    </p>
                  ) : summary ? (
                    <p className="mt-1 text-xs text-muted-foreground text-pretty">{summary}</p>
                  ) : null}
                </div>
                <span
                  className="shrink-0 text-sm font-semibold tabular-nums"
                  style={{ color: `var(--score-${scoreBand(d.pct)})` }}
                >
                  {d.points} / {d.max}
                </span>
              </div>
              <div className="mt-3">
                <DomainBar pct={d.pct} band={scoreBand(d.pct)} />
              </div>

              {kps.length > 0 ? (
                <ul className="mt-4 space-y-3 border-t border-border pt-4">
                  {kps.map((kp) => {
                    const pct = kp.max > 0 ? Math.round((kp.points / kp.max) * 100) : 0
                    return (
                      <li key={kp.keyPointId} className="flex gap-3">
                        <GradeBadge grade={String(kp.grade)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-pretty">{kp.label}</span>
                            <span
                              className="shrink-0 text-xs font-semibold tabular-nums"
                              style={{ color: `var(--score-${scoreBand(pct)})` }}
                            >
                              {kp.points} / {kp.max}
                            </span>
                          </div>
                          {kp.explanation ? (
                            <p className="mt-1 text-xs text-muted-foreground text-pretty">{kp.explanation}</p>
                          ) : null}
                          {kp.evidence && kp.evidence.length > 0 ? (
                            <ul className="mt-2 space-y-0.5">
                              {kp.evidence.map((e, i) => (
                                <li key={i} className="flex gap-1.5 text-xs text-muted-foreground text-pretty">
                                  <span aria-hidden className="text-primary">
                                    ·
                                  </span>
                                  <span>{e}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {kp.recommendations && kp.recommendations.length > 0 ? (
                            <p className="mt-1.5 text-xs text-pretty">
                              <span className="font-medium text-primary">To improve: </span>
                              <span className="text-muted-foreground">{kp.recommendations.join("; ")}</span>
                            </p>
                          ) : null}
                          {kp.confidence ? (
                            <Badge variant="outline" className="mt-2 text-[10px]">
                              {CONFIDENCE_LABEL[kp.confidence] ?? kp.confidence}
                            </Badge>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
