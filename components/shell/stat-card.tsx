import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
}) {
  return (
    <Card className="flex flex-row items-center gap-4 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  )
}
