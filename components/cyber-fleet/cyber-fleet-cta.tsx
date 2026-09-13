"use client"

import { useState } from "react"
import { Bot, Check, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PARTNER, type ReferralCtaData } from "@/lib/cyber-fleet"
import { RequestEvaluationButton } from "@/components/cyber-fleet/request-evaluation-button"

/**
 * Post-assessment partner offer. Shown to a qualifying owner on their report and
 * portal. Lets them request a Cyber Fleet Services evaluation now, or defer —
 * deferring leaves the referral eligible so staff can remind them later. Once a
 * request is in flight it flips to a confirmation state. Renders nothing when
 * the property does not qualify or the owner already dismissed it.
 */
export function CyberFleetCta({
  propertyId,
  data,
  className,
}: {
  propertyId: string
  data: ReferralCtaData
  className?: string
}) {
  const [deferred, setDeferred] = useState(false)

  // Already moving through the partner pipeline → show a confirmation instead.
  if (data.status && ["requested", "accepted", "deal"].includes(data.status)) {
    return <RequestedState className={className} />
  }
  if (data.status === "dismissed" || deferred) return null
  // Only surface to a qualifying, still-eligible (or brand-new) property.
  if (!data.qualifies) return null

  return (
    <section
      className={`rounded-xl border border-primary/30 bg-primary/5 p-6 print:hidden ${className ?? ""}`}
      aria-labelledby="cyber-fleet-heading"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Bot className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Partner offer</p>
          <h2 id="cyber-fleet-heading" className="mt-0.5 text-lg font-semibold text-balance">
            Your property qualifies for {PARTNER.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{PARTNER.blurb}</p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {PARTNER.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-[var(--score-high)]" />
            <span className="text-pretty">{h}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <RequestEvaluationButton
          propertyId={propertyId}
          defaultName={data.defaultName}
          defaultEmail={data.defaultEmail}
        />
        <Button variant="ghost" onClick={() => setDeferred(true)}>
          Maybe later
        </Button>
        <span className="text-xs text-muted-foreground">No obligation — starts with a free 90-day pilot review.</span>
      </div>
    </section>
  )
}

function RequestedState({ className }: { className?: string }) {
  return (
    <section
      className={`flex items-start gap-3 rounded-xl border border-[var(--score-high)]/40 bg-[var(--score-high)]/5 p-6 print:hidden ${className ?? ""}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--score-high)]/15 text-[var(--score-high)]">
        <CheckCircle2 className="size-5" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-balance">{PARTNER.name} evaluation requested</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Thanks — your request is in. The {PARTNER.name} team will reach out to schedule your evaluation and 90-day
          pilot.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" /> We&apos;ll keep you posted here and by email.
        </p>
      </div>
    </section>
  )
}
