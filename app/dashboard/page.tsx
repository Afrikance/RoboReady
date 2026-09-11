import Link from "next/link"
import { Building2, Bot, Gauge, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/shell/stat-card"
import { ScoreGauge, scoreBand } from "@/components/score/score-gauge"
import { listPropertiesWithScores } from "@/app/actions/properties"
import { ensureOrganization } from "@/lib/tenancy"

export const metadata = { title: "Overview" }

export default async function DashboardOverview() {
  // Guarantee the workspace exists before any tenant-scoped query. The layout
  // also calls this, but page and layout render concurrently, so we must not
  // depend on layout ordering here.
  await ensureOrganization()
  const properties = await listPropertiesWithScores()

  const assessed = properties.filter((p) => p.latestScore != null)
  const avgScore =
    assessed.length > 0
      ? Math.round(assessed.reduce((sum, p) => sum + (p.latestScore ?? 0), 0) / assessed.length)
      : null
  const readyCount = assessed.filter((p) => scoreBand(p.latestScore) === "high").length

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your portfolio&apos;s autonomy readiness at a glance.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/properties/new">
            Add property
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={properties.length} icon={Building2} />
        <StatCard label="Assessed" value={assessed.length} icon={Bot} />
        <StatCard
          label="Avg. RoboReady Score"
          value={avgScore ?? "—"}
          icon={Gauge}
          hint="Across assessed properties"
        />
        <StatCard label="Robot-Ready" value={readyCount} icon={CheckCircle2} hint="Score ≥ 70" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio readiness</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <ScoreGauge score={avgScore} size={220} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent properties</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/properties">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y">
                {properties.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/properties/${p.id}`}
                      className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {[p.city, p.region].filter(Boolean).join(", ") || "No location set"}
                        </p>
                      </div>
                      <ScorePill score={p.latestScore} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ScorePill({ score }: { score: number | null }) {
  const band = scoreBand(score)
  const color =
    band === "high"
      ? "text-score-high"
      : band === "mid"
        ? "text-score-mid"
        : band === "low"
          ? "text-score-low"
          : "text-muted-foreground"
  return (
    <span className={`shrink-0 font-mono text-lg font-semibold tabular-nums ${color}`}>
      {score ?? "—"}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <Badge variant="secondary">Getting started</Badge>
      <p className="max-w-xs text-sm text-muted-foreground">
        Add your first property and run an AI assessment to see its RoboReady Score.
      </p>
      <Button asChild size="sm">
        <Link href="/dashboard/properties/new">Add your first property</Link>
      </Button>
    </div>
  )
}
