"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { property, serviceSubscription } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext } from "@/lib/tenancy"
import { stripe } from "@/lib/stripe"
import { getServicePlan, planAmountCents, type BillingInterval } from "@/lib/service-plans"
import type { CheckoutStart } from "@/app/actions/payments"
import type { ActionResult } from "@/app/actions/properties"

// Recurring plans are an ongoing-service product, so they only make sense once
// a property has left the prospecting funnel and has real infrastructure to
// service. Funnel states are excluded.
const FUNNEL_STATES = new Set(["prospect", "handover", "pending_verification"])

/**
 * Starts an embedded Stripe Checkout in `subscription` mode for a service plan
 * on a property. The amount is always derived server-side from the plan
 * catalog; the client only names the plan + interval. Reuses the same
 * {clientSecret, paymentId} shape as one-time checkouts so the shared
 * CheckoutDialog can drive it (paymentId here is the subscription row id).
 */
export async function startSubscriptionCheckout(input: {
  propertyId: string
  planId: string
  interval: BillingInterval
}): Promise<CheckoutStart> {
  const ctx = await requireOrgContext()
  assertRole(ctx, "member")

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, input.propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) throw new Error("Property not found.")
  if (FUNNEL_STATES.has(prop.status)) {
    throw new Error("Service plans unlock once the property is verified.")
  }

  const plan = getServicePlan(input.planId)
  if (!plan) throw new Error("Plan not configured.")
  const interval: BillingInterval = input.interval === "year" ? "year" : "month"

  const [existingActive] = await db
    .select()
    .from(serviceSubscription)
    .where(
      and(
        eq(serviceSubscription.propertyId, input.propertyId),
        eq(serviceSubscription.organizationId, ctx.organizationId),
        eq(serviceSubscription.status, "active"),
      ),
    )
    .limit(1)
  if (existingActive) {
    throw new Error("This property already has an active plan. Cancel it before switching.")
  }

  const amountCents = planAmountCents(plan, interval)
  const subscriptionId = crypto.randomUUID()

  const session = await stripe.checkout.sessions.create(
    {
      ui_mode: "embedded_page",
      redirect_on_completion: "never",
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${plan.name} — ${prop.name}` },
            unit_amount: amountCents,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      metadata: {
        subscriptionId,
        organizationId: ctx.organizationId,
        propertyId: input.propertyId,
        planId: plan.id,
        kind: "service_plan",
      },
    },
    // A retry with the same subscriptionId cannot create a second Stripe session.
    { idempotencyKey: `subscription_${subscriptionId}` },
  )

  await db.insert(serviceSubscription).values({
    id: subscriptionId,
    organizationId: ctx.organizationId,
    createdByUserId: ctx.user.id,
    propertyId: input.propertyId,
    planId: plan.id,
    interval,
    amountCents,
    currency: "usd",
    status: "pending",
    stripeSessionId: session.id,
  })

  return { clientSecret: session.client_secret as string, paymentId: subscriptionId }
}

/**
 * Verifies a subscription checkout with Stripe (source of truth) and, if the
 * subscription is live, marks the row active and records the billing period.
 * Idempotent and tenant-scoped.
 */
export async function confirmSubscription(subscriptionId: string): Promise<ActionResult<{ status: string }>> {
  const ctx = await requireOrgContext()

  const [row] = await db
    .select()
    .from(serviceSubscription)
    .where(and(eq(serviceSubscription.id, subscriptionId), eq(serviceSubscription.organizationId, ctx.organizationId)))
    .limit(1)
  if (!row) return { ok: false, error: "Subscription not found." }
  if (row.status === "active") return { ok: true, data: { status: "active" } }
  if (!row.stripeSessionId) return { ok: false, error: "Subscription is not linked to a checkout session." }

  const session = await stripe.checkout.sessions.retrieve(row.stripeSessionId, {
    expand: ["subscription"],
  })
  if (session.status !== "complete" || session.payment_status === "unpaid") {
    return { ok: false, error: "Payment has not completed yet." }
  }

  const sub = session.subscription
  const stripeSubscriptionId = typeof sub === "string" ? sub : sub?.id ?? null
  const periodEnd =
    sub && typeof sub !== "string" && sub.items?.data?.[0]?.current_period_end
      ? new Date(sub.items.data[0].current_period_end * 1000)
      : null
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null

  await db
    .update(serviceSubscription)
    .set({
      status: "active",
      stripeSubscriptionId,
      stripeCustomerId: customerId,
      currentPeriodEnd: periodEnd,
      updatedAt: new Date(),
    })
    .where(and(eq(serviceSubscription.id, subscriptionId), eq(serviceSubscription.organizationId, ctx.organizationId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "subscription.activated",
    entityType: "service_subscription",
    entityId: subscriptionId,
    metadata: { planId: row.planId, interval: row.interval, amountCents: row.amountCents },
  })

  revalidatePath(`/dashboard/properties/${row.propertyId}`)
  return { ok: true, data: { status: "active" } }
}

/** Cancels an active plan at the end of the current paid period. */
export async function cancelSubscription(subscriptionId: string): Promise<ActionResult<{ status: string }>> {
  const ctx = await requireOrgContext()
  assertRole(ctx, "member")

  const [row] = await db
    .select()
    .from(serviceSubscription)
    .where(and(eq(serviceSubscription.id, subscriptionId), eq(serviceSubscription.organizationId, ctx.organizationId)))
    .limit(1)
  if (!row) return { ok: false, error: "Subscription not found." }
  if (row.status !== "active") return { ok: false, error: "Only an active plan can be canceled." }

  if (row.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.update(row.stripeSubscriptionId, { cancel_at_period_end: true })
    } catch (err) {
      console.log("[v0] cancelSubscription stripe error:", (err as Error).message)
      return { ok: false, error: "Could not reach Stripe to cancel. Please try again." }
    }
  }

  await db
    .update(serviceSubscription)
    .set({ cancelAtPeriodEnd: true, canceledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(serviceSubscription.id, subscriptionId), eq(serviceSubscription.organizationId, ctx.organizationId)))

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "subscription.canceled",
    entityType: "service_subscription",
    entityId: subscriptionId,
    metadata: { planId: row.planId },
  })

  revalidatePath(`/dashboard/properties/${row.propertyId}`)
  return { ok: true, data: { status: "canceling" } }
}

export async function getActiveSubscription(propertyId: string) {
  const ctx = await requireOrgContext()
  const [row] = await db
    .select()
    .from(serviceSubscription)
    .where(
      and(
        eq(serviceSubscription.propertyId, propertyId),
        eq(serviceSubscription.organizationId, ctx.organizationId),
        eq(serviceSubscription.status, "active"),
      ),
    )
    .orderBy(desc(serviceSubscription.createdAt))
    .limit(1)
  return row ?? null
}
