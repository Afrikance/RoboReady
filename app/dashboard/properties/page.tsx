import Link from "next/link"
import { Building2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { scoreBand } from "@/components/score/score-gauge"
import { listPropertiesWithScores } from "@/app/actions/properties"
import { ViewToggle } from "@/components/properties/view-toggle"

export const metadata = { title: "Properties" }

const STATUS_LABEL: Record<string, string> = {
  prospect: "Prospect",
  handover: "Field work",
  pending_verification: "In verification",
  verified: "Verified",
  intake: "Intake",
  assessing: "Assessing",
  assessed: "Assessed",
  proposal: "Proposal",
  active: "Active",
}

export default async function PropertiesPage() {
  const properties = await listPropertiesWithScores()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {properties.length} {properties.length === 1 ? "property" : "properties"} in your portfolio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle active="grid" />
          <Button asChild>
            <Link href="/dashboard/properties/new">
              <Plus className="size-4" />
              Add property
            </Link>
          </Button>
        </div>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Building2 className="size-6" />
            </span>
            <div>
              <p className="font-medium">No properties yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first commercial property to run a robot-readiness assessment.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/properties/new">Add property</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const band = scoreBand(p.latestScore)
            const color =
              band === "high"
                ? "text-score-high"
                : band === "mid"
                  ? "text-score-mid"
                  : band === "low"
                    ? "text-score-low"
                    : "text-muted-foreground"
            return (
              <Link key={p.id} href={`/dashboard/properties/${p.id}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardContent className="flex flex-col gap-4 pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {[p.city, p.region].filter(Boolean).join(", ") || "No location set"}
                        </p>
                      </div>
                      <span className={`shrink-0 font-mono text-2xl font-semibold tabular-nums ${color}`}>
                        {p.latestScore ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{STATUS_LABEL[p.status] ?? p.status}</Badge>
                      <span className="text-xs capitalize text-muted-foreground">
                        {p.propertyType}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
