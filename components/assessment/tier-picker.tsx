"use client"

import { Check, Lock } from "lucide-react"
import { CheckoutDialog } from "@/components/checkout/checkout-dialog"
import { startAssessmentCheckout } from "@/app/actions/payments"
import { ASSESSMENT_TIERS, tierRank, type AssessmentTierId } from "@/lib/products"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

function priceLabel(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

/**
 * Three-tier report ladder. The purchased tier (and anything below it) shows as
 * owned; higher tiers show a purchase/upgrade button that opens embedded
 * Stripe checkout. What a client sees in the report is gated by the tier.
 */
export function TierPicker({
  propertyId,
  purchasedTier,
}: {
  propertyId: string
  purchasedTier: AssessmentTierId | null
}) {
  const ownedRank = tierRank(purchasedTier)

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {ASSESSMENT_TIERS.map((tier) => {
        const owned = tierRank(tier.id) <= ownedRank && ownedRank > 0
        const isCurrent = tier.id === purchasedTier
        const isUpgrade = ownedRank > 0 && !owned
        return (
          <div
            key={tier.id}
            className={cn(
              "flex flex-col rounded-lg border bg-card p-5",
              tier.featured ? "border-primary shadow-sm" : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{tier.name}</h4>
              {tier.featured ? <Badge variant="secondary">Popular</Badge> : null}
              {isCurrent ? <Badge>Current</Badge> : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{tier.tagline}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{priceLabel(tier.priceInCents)}</p>
            <p className="text-[11px] text-muted-foreground">one-time</p>

            <ul className="mt-4 flex-1 space-y-2">
              {tier.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-xs text-pretty">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              {owned ? (
                <div className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-muted/40 py-2 text-xs font-medium text-muted-foreground">
                  <Check className="h-3.5 w-3.5" /> Owned
                </div>
              ) : (
                <CheckoutDialog
                  start={startAssessmentCheckout.bind(null, propertyId, tier.id)}
                  triggerLabel={isUpgrade ? `Upgrade · ${priceLabel(tier.priceInCents)}` : `Purchase · ${priceLabel(tier.priceInCents)}`}
                  title={`Purchase ${tier.name}`}
                  priceLabel={`One-time ${priceLabel(tier.priceInCents)} — ${tier.description}`}
                  variant={tier.featured ? "default" : "outline"}
                  size="sm"
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Compact one-line status of the purchased report tier. */
export function TierStatus({ purchasedTier }: { purchasedTier: AssessmentTierId | null }) {
  const tier = ASSESSMENT_TIERS.find((t) => t.id === purchasedTier)
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Lock className="h-3.5 w-3.5" />
      {tier ? (
        <span>
          Client report tier: <span className="font-medium text-foreground">{tier.name}</span>
        </span>
      ) : (
        <span>No report tier purchased — the client sees a Readiness Check preview only.</span>
      )}
    </div>
  )
}
