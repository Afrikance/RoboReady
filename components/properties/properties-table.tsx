"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, FileCheck2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { scoreBand } from "@/components/score/score-gauge"
import { getAssessmentTier } from "@/lib/products"
import type { PropertyTableRow } from "@/app/actions/properties"

const STATUS_LABEL: Record<string, string> = {
  prospect: "Prospect",
  handover: "Field work",
  pending_verification: "In verification",
  verified: "Verified",
  intake: "Intake",
  assessing: "Assessing",
  assessed: "Assessed",
  proposal: "Proposal",
  proposed: "Proposal",
  active: "Active",
}

function scoreColor(score: number | null): string {
  const band = scoreBand(score)
  return band === "high"
    ? "text-score-high"
    : band === "mid"
      ? "text-score-mid"
      : band === "low"
        ? "text-score-low"
        : "text-muted-foreground"
}

export function PropertiesTable({ rows }: { rows: PropertyTableRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.name, r.city, r.region].filter(Boolean).some((v) => (v as string).toLowerCase().includes(q)),
    )
  }, [rows, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name or location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="Search properties"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Assessment</th>
              <th className="px-4 py-3 font-medium">Report</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const tier = r.purchasedTier ? getAssessmentTier(r.purchasedTier) : null
              const location = [r.city, r.region].filter(Boolean).join(", ")
              return (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/dashboard/properties/${r.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-2 text-xs capitalize text-muted-foreground">{r.propertyType}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{location || "—"}</td>
                  <td className={`px-4 py-3 font-mono text-base font-semibold tabular-nums ${scoreColor(r.latestScore)}`}>
                    {r.latestScore ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {tier ? <Badge variant="secondary">{tier.name}</Badge> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.hasReport ? (
                      <span className="inline-flex items-center gap-1.5 text-score-high">
                        <FileCheck2 className="size-4" /> Generated
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "No properties yet." : "No properties match your search."}
          </p>
        ) : null}
      </div>
    </div>
  )
}
