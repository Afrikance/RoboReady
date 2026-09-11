import Link from "next/link"
import { FileText, ArrowRight } from "lucide-react"
import { ensureOrganization } from "@/lib/tenancy"
import { listPropertiesWithScores } from "@/app/actions/properties"
import { scoreBand } from "@/components/score/score-gauge"

export const metadata = { title: "Reports" }

export default async function ReportsPage() {
  await ensureOrganization()
  const properties = await listPropertiesWithScores()
  const assessed = properties.filter((p) => p.latestScore != null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Client-ready reports for assessed properties. Open one to print, export a PDF, or share.
        </p>
      </div>

      {assessed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No reports yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Assess a property to generate its report.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {assessed.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/properties/${p.id}`}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[p.city, p.region].filter(Boolean).join(", ") || "No location set"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className="font-mono text-lg font-semibold tabular-nums"
                    style={{ color: `var(--score-${scoreBand(p.latestScore)})` }}
                  >
                    {p.latestScore}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
