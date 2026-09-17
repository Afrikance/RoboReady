import { ArrowDownToLine, ArrowUpFromLine, CircleParking, Radio } from "lucide-react"
import type { AvActivity } from "@/lib/tesla"
import { cn } from "@/lib/utils"

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}

/**
 * Live AV activity for a site. When not backed by a live Tesla connection it
 * is clearly labeled "Manual / demo" so counts are never mistaken for a real
 * telemetry feed.
 */
export function AvStatusPanel({ status, className }: { status: AvActivity | null; className?: string }) {
  const total = status ? status.arriving + status.departing + status.idle : 0

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className={cn("size-4", status?.live ? "text-[var(--score-high)]" : "text-muted-foreground")} />
          <h3 className="text-sm font-semibold">Autonomous vehicle activity</h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            status?.live ? "bg-[var(--score-high)]/15 text-[var(--score-high)]" : "bg-muted text-muted-foreground",
          )}
        >
          {status?.live ? "Live · Tesla" : "Manual / demo"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon={ArrowDownToLine} label="Arriving" value={status?.arriving ?? 0} tone="text-[var(--score-high)]" />
        <Stat icon={CircleParking} label="Idle" value={status?.idle ?? 0} tone="text-[var(--score-mid)]" />
        <Stat icon={ArrowUpFromLine} label="Departing" value={status?.departing ?? 0} tone="text-muted-foreground" />
      </div>

      {status && total > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {status.vehicles.slice(0, 5).map((v) => (
            <li key={v.ref} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium">{v.label || v.ref}</span>
              <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                <span className="capitalize">{v.state}</span>
                <span className="tabular-nums">{timeAgo(v.since)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground text-pretty">
          No vehicles reported at this site yet.
          {!status?.live ? " Live tracking activates when the Tesla Fleet integration is connected." : null}
        </p>
      )}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Radio
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="flex flex-col items-center rounded-md bg-muted/40 py-2">
      <Icon className={cn("size-4", tone)} />
      <span className="mt-1 font-mono text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  )
}
