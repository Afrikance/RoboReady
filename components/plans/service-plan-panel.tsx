"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Sparkles, ShieldCheck, Ban } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckoutDialog } from "@/components/checkout/checkout-dialog"
import {
  SERVICE_PLANS,
  getServicePlan,
  planAmountCents,
  formatUsd,
  type BillingInterval,
} from "@/lib/service-plans"
import {
  startSubscriptionCheckout,
  confirmSubscription,
  cancelSubscription,
} from "@/app/actions/subscriptions"

type ActiveSubscription = {
  id: string
  planId: string
  interval: string
  amountCents: number
  currentPeriodEnd: Date | string | null
  cancelAtPeriodEnd: boolean
} | null

export function ServicePlanPanel({
  propertyId,
  active,
  locked,
}: {
  propertyId: string
  active: ActiveSubscription
  locked: boolean
}) {
  const [interval, setInterval] = useState<BillingInterval>("month")

  if (locked && !active) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <ShieldCheck className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Care plans unlock after verification</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          Concierge &amp; Maintenance plans keep deployed autonomous infrastructure running. They become available once
          this property is verified and moving through assessment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {active ? <ActiveCard active={active} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-balance">
            {active ? "Change plan" : "Concierge & Maintenance plans"}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
            Ongoing service for this property, billed as a recurring subscription. Cancel anytime — coverage runs to the
            end of the paid period.
          </p>
        </div>
        <IntervalToggle interval={interval} onChange={setInterval} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {SERVICE_PLANS.map((plan) => {
          const amount = planAmountCents(plan, interval)
          const isCurrent = active?.planId === plan.id
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-lg border bg-card p-6",
                plan.recommended ? "border-primary shadow-sm" : "border-border",
              )}
            >
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{plan.name}</h4>
                {plan.recommended ? (
                  <Badge className="gap-1 text-[10px]">
                    <Sparkles className="h-3 w-3" /> Popular
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 min-h-[2.5rem] text-sm text-muted-foreground text-pretty">{plan.tagline}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums">{formatUsd(amount)}</span>
                <span className="text-sm text-muted-foreground">/{interval === "year" ? "yr" : "mo"}</span>
              </div>
              {interval === "year" ? (
                <p className="mt-1 text-xs text-[var(--score-high)]">Two months free vs. monthly</p>
              ) : null}

              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--score-high)]" />
                    <span className="text-pretty">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : (
                  <CheckoutDialog
                    start={() => startSubscriptionCheckout({ propertyId, planId: plan.id, interval })}
                    confirm={confirmSubscription}
                    triggerLabel={active ? "Switch to this plan" : "Subscribe"}
                    title={`${plan.name} — ${interval === "year" ? "annual" : "monthly"}`}
                    priceLabel={`You're starting the ${plan.name} plan at ${formatUsd(amount)} per ${
                      interval === "year" ? "year" : "month"
                    }. This is a recurring subscription.`}
                    variant={plan.recommended ? "default" : "outline"}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function IntervalToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval
  onChange: (i: BillingInterval) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-sm" role="tablist">
      {(["month", "year"] as const).map((i) => (
        <button
          key={i}
          role="tab"
          aria-selected={interval === i}
          onClick={() => onChange(i)}
          className={cn(
            "rounded px-3 py-1.5 font-medium transition-colors",
            interval === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {i === "month" ? "Monthly" : "Annual"}
        </button>
      ))}
    </div>
  )
}

function ActiveCard({ active }: { active: NonNullable<ActiveSubscription> }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const plan = getServicePlan(active.planId)
  const renews = active.currentPeriodEnd ? new Date(active.currentPeriodEnd).toLocaleDateString() : null

  function cancel() {
    startTransition(async () => {
      const res = await cancelSubscription(active.id)
      if (res.ok) {
        toast.success("Plan will end at the close of the current period.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-primary bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">{plan?.name ?? active.planId}</h3>
          <Badge variant={active.cancelAtPeriodEnd ? "secondary" : "default"}>
            {active.cancelAtPeriodEnd ? "Ending" : "Active"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatUsd(active.amountCents)} / {active.interval === "year" ? "year" : "month"}
          {renews ? (active.cancelAtPeriodEnd ? ` · ends ${renews}` : ` · renews ${renews}`) : null}
        </p>
      </div>
      {!active.cancelAtPeriodEnd ? (
        <Button variant="outline" size="sm" onClick={cancel} disabled={pending}>
          <Ban className="mr-1.5 h-4 w-4" /> {pending ? "Canceling…" : "Cancel plan"}
        </Button>
      ) : null}
    </div>
  )
}
