import { cn } from "@/lib/utils"

export type ScoreBand = "high" | "mid" | "low" | "empty"

export function scoreBand(score: number | null | undefined): ScoreBand {
  if (score == null) return "empty"
  if (score >= 70) return "high"
  if (score >= 40) return "mid"
  return "low"
}

const BAND_LABEL: Record<ScoreBand, string> = {
  high: "Robot-Ready",
  mid: "Partially Ready",
  low: "Not Ready",
  empty: "Not Assessed",
}

const BAND_COLOR: Record<ScoreBand, string> = {
  high: "var(--score-high)",
  mid: "var(--score-mid)",
  low: "var(--score-low)",
  empty: "var(--muted-foreground)",
}

/**
 * The RoboReady Score gauge — the product's signature element. A 270°
 * radial dial from 0–100 with a band label. Pure SVG, no dependencies.
 */
export function ScoreGauge({
  score,
  size = 200,
  className,
  showLabel = true,
}: {
  score: number | null | undefined
  size?: number
  className?: string
  showLabel?: boolean
}) {
  const band = scoreBand(score)
  const value = score ?? 0
  const stroke = size * 0.09
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2

  // 270-degree arc, starting at 135deg (bottom-left) going clockwise.
  const startAngle = 135
  const sweep = 270
  const circumference = 2 * Math.PI * radius
  const arcLength = (sweep / 360) * circumference
  const progress = (value / 100) * arcLength

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`RoboReady Score ${score ?? "not assessed"}`}>
          {/* track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            transform={`rotate(${startAngle} ${cx} ${cy})`}
          />
          {/* value */}
          {score != null && (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={BAND_COLOR[band]}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              transform={`rotate(${startAngle} ${cx} ${cy})`}
              style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-4xl font-semibold tabular-nums"
            style={{ color: score != null ? BAND_COLOR[band] : "var(--muted-foreground)" }}
          >
            {score ?? "—"}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      {showLabel && (
        <span
          className="mt-2 text-sm font-medium"
          style={{ color: BAND_COLOR[band] }}
        >
          {BAND_LABEL[band]}
        </span>
      )}
    </div>
  )
}
