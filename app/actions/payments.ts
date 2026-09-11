"use server"

import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { payment, property, proposal } from "@/lib/db/schema"
import { assertRole, recordAudit, requireOrgContext, type OrgContext } from "@/lib/tenancy"
import { stripe } from "@/lib/stripe"
import { getProduct } from "@/lib/products"
import type { ActionResult } from "@/app/actions/properties"

export type CheckoutStart = { clientSecret: string; paymentId: string }

/**
 * Creates a pending payment row and a matching Stripe embedded Checkout session.
 * The amount is always server-controlled — the client never sends a price.
 */
async function createCheckout(args: {
  ctx: OrgContext
  kind: "assessment" | "proposal_deposit"
  amountCents: number
  name: string
  description: string
  propertyId?: string | null
  proposalId?: string | null
}): Promise<CheckoutStart> {
  const { ctx, kind, amountCents, name, description, propertyId, proposalId } = args
  const paymentId = crypto.randomUUID()

  const session = await stripe.checkout.sessions.create(
    {
      ui_mode: "embedded_page",
      redirect_on_completion: "never",
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name, description },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { paymentId, organizationId: ctx.organizationId, kind },
    },
    // Idempotency: a retry with the same paymentId cannot create a second session.
    { idempotencyKey: `checkout_${paymentId}` },
  )

  await db.insert(payment).values({
    id: paymentId,
    organizationId: ctx.organizationId,
    createdByUserId: ctx.user.id,
    propertyId: propertyId ?? null,
    proposalId: proposalId ?? null,
    kind,
    amountCents,
    currency: "usd",
    status: "pending",
    stripeSessionId: session.id,
    description,
  })

  return { clientSecret: session.client_secret as string, paymentId }
}

export async function startAssessmentCheckout(propertyId: string): Promise<CheckoutStart> {
  const ctx = await requireOrgContext()
  assertRole(ctx, "member")

  const [prop] = await db
    .select()
    .from(property)
    .where(and(eq(property.id, propertyId), eq(property.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) throw new Error("Property not found.")

  const product = getProduct("readiness-assessment")
  if (!product) throw new Error("Product not configured.")

  return createCheckout({
    ctx,
    kind: "assessment",
    amountCents: product.priceInCents,
    name: product.name,
    description: `${product.description} — ${prop.name}`,
    propertyId,
  })
}

export async function startDepositCheckout(proposalId: string): Promise<CheckoutStart> {
  const ctx = await requireOrgContext()
  assertRole(ctx, "member")

  const [prop] = await db
    .select()
    .from(proposal)
    .where(and(eq(proposal.id, proposalId), eq(proposal.organizationId, ctx.organizationId)))
    .limit(1)
  if (!prop) throw new Error("Proposal not found.")
  if (prop.depositCents <= 0) throw new Error("This proposal has no deposit due.")

  return createCheckout({
    ctx,
    kind: "proposal_deposit",
    amountCents: prop.depositCents,
    name: `Deposit — ${prop.title}`,
    description: `Acceptance deposit for proposal "${prop.title}".`,
    propertyId: prop.propertyId,
    proposalId: prop.id,
  })
}

/**
 * Verifies a checkout with Stripe (source of truth) and, if paid, marks the
 * payment complete and applies its side effects. Idempotent — safe to call
 * more than once. Tenant-scoped via the payment row.
 */
export async function confirmPayment(paymentId: string): Promise<ActionResult<{ status: string }>> {
  const ctx = await requireOrgContext()

  const [row] = await db
    .select()
    .from(payment)
    .where(and(eq(payment.id, paymentId), eq(payment.organizationId, ctx.organizationId)))
    .limit(1)
  if (!row) return { ok: false, error: "Payment not found." }
  if (row.status === "paid") return { ok: true, data: { status: "paid" } }
  if (!row.stripeSessionId) return { ok: false, error: "Payment is not linked to a checkout session." }

  const session = await stripe.checkout.sessions.retrieve(row.stripeSessionId)
  if (session.payment_status !== "paid") {
    return { ok: false, error: "Payment has not completed yet." }
  }

  await db
    .update(payment)
    .set({
      status: "paid",
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      updatedAt: new Date(),
    })
    .where(and(eq(payment.id, paymentId), eq(payment.organizationId, ctx.organizationId)))

  if (row.kind === "proposal_deposit" && row.proposalId) {
    await db
      .update(proposal)
      .set({ status: "deposit_paid", acceptedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(proposal.id, row.proposalId), eq(proposal.organizationId, ctx.organizationId)))
    if (row.propertyId) {
      await db
        .update(property)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(eq(property.id, row.propertyId), eq(property.organizationId, ctx.organizationId)))
    }
  }

  await recordAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "payment.paid",
    entityType: "payment",
    entityId: paymentId,
    metadata: { kind: row.kind, amountCents: row.amountCents },
  })

  if (row.propertyId) revalidatePath(`/dashboard/properties/${row.propertyId}`)
  revalidatePath("/dashboard")
  return { ok: true, data: { status: "paid" } }
}

export async function listPayments(propertyId: string) {
  const ctx = await requireOrgContext()
  return db
    .select()
    .from(payment)
    .where(and(eq(payment.propertyId, propertyId), eq(payment.organizationId, ctx.organizationId)))
    .orderBy(desc(payment.createdAt))
}
