import Link from "next/link"
import { Bot, ArrowRight } from "lucide-react"
import { scoreBand } from "@/components/score/score-gauge"
import { ReferralStatusBadge } from "@/components/cyber-fleet/status-badge"
import { RequestEvaluationButton } from "@/components/cyber-fleet/request-evaluation-button"
import { PARTNER, type ReferralStatus } from "@/lib/cyber-fleet"

export type ClientReferral = {
  propertyId: string
  propertyName: string | null
  status: ReferralStatus
  roboReadyScore: number | null
}

/**
 * The owner-facing list on /dashboard/cyber-fleet: every property of theirs that
 * qualified for the partner, with a request action on the ones still eligible.
 */
export function ClientReferrals({
  referrals,
  contactName,
  contactEmail,
}: {
  referrals: ClientReferral[]
  contactName: string | null
  contactEmail: string | null
}) {
  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <Bot className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No partner offers yet</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          When one of your assessed properties qualifies for {PARTNER.name}, it will appear here so you can request an
          evaluation.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {referrals.map((r) => (
        <li
          key={r.propertyId}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4 min-w-0">
            {r.roboReadyScore != null ? (
              <span
                className="font-mono text-lg font-semibold tabular-nums"
                style={{ color: `var(--score-${scoreBand(r.roboReadyScore)})` }}
              >
                {r.roboReadyScore}
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="truncate font-medium">{r.propertyName ?? "Property"}</p>
              <div className="mt-1">
                <ReferralStatusBadge status={r.status} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {r.status === "eligible" ? (
              <RequestEvaluationButton
                propertyId={r.propertyId}
                defaultName={contactName}
                defaultEmail={contactEmail}
                size="sm"
              />
            ) : null}
            <Link
              href={`/portal/${r.propertyId}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View report <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}
