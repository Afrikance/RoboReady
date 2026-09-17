"use client"

import { useState } from "react"
import { Bot, Check, CheckCircle2, Clock, ExternalLink, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PARTNER, TESLA_REFERRALS, type ReferralCtaData } from "@/lib/cyber-fleet"
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

      <TeslaReferrals />
    </section>
  )
}

/**
 * Tesla commercial-charging referrals shown alongside the Cyber Fleet offer.
 * Outbound links to Tesla's business programs — no internal pipeline tracking.
 */
function TeslaReferrals() {
  return (
    <div className="mt-6 border-t border-primary/20 pt-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Charging partners</p>
      <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
        Power the fleet with Tesla&apos;s commercial charging programs.
      </p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {TESLA_REFERRALS.map((t) => (
          <li key={t.id}>
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/50"
            >
              <span className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Zap className="size-4" />
                </span>
                <span className="text-sm font-semibold text-pretty">{t.name}</span>
                <ExternalLink className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </span>
              <span className="mt-2 text-xs text-muted-foreground text-pretty">{t.blurb}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RequestedState({ className }: { className?: string }) {
  return (
    <section
      className={`rounded-xl border border-[var(--score-high)]/40 bg-[var(--score-high)]/5 p-6 print:hidden ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
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
      </div>

      <TeslaReferrals />
    </section>
  )
}
