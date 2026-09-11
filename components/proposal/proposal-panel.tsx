import { RunAI } from "@/components/shared/run-ai"
import { DepositRateEditor } from "@/components/proposal/deposit-rate"
import { CheckoutDialog } from "@/components/checkout/checkout-dialog"
import { generateProposal } from "@/app/actions/proposals"
import { startDepositCheckout } from "@/app/actions/payments"
import { Badge } from "@/components/ui/badge"
import { FileSignature, CheckCircle2 } from "lucide-react"
import type { ProposalLineItem } from "@/app/actions/proposals"

type Proposal = {
  id: string
  title: string
  summary: string | null
  lineItems: unknown
  subtotalCents: number
  depositRate: string
  depositCents: number
  status: string
  version: number
} | null

type Payment = {
  id: string
  kind: string
  amountCents: number
  status: string
  description: string | null
  createdAt: Date | string
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  deposit_paid: "Deposit paid",
}

function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
}

export function ProposalPanel({
  propertyId,
  proposal,
  payments,
  assessmentReady,
}: {
  propertyId: string
  proposal: Proposal
  payments: Payment[]
  assessmentReady: boolean
}) {
  const generate = generateProposal.bind(null, propertyId)

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No proposal yet</p>
        <p className="mb-5 mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          {assessmentReady
            ? "Sable drafts an itemized commercial proposal from the assessment and plans. You can adjust the deposit and take payment here."
            : "Run an assessment first — the proposal is built from the RoboReady Score, site concept, and infrastructure plans."}
        </p>
        {assessmentReady ? (
          <RunAI action={generate} label="Generate proposal" successMessage="Proposal drafted" />
        ) : null}
      </div>
    )
  }

  const items = (proposal.lineItems as ProposalLineItem[]) ?? []
  const depositPaid = proposal.status === "deposit_paid"
  const startDeposit = startDepositCheckout.bind(null, proposal.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-balance">{proposal.title}</h3>
            <Badge variant={depositPaid ? "default" : "secondary"}>{STATUS_LABEL[proposal.status] ?? proposal.status}</Badge>
            <Badge variant="outline" className="text-[10px]">v{proposal.version}</Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">{proposal.summary}</p>
        </div>
        <RunAI action={generate} label="Re-draft" variant="outline" size="sm" successMessage="Proposal drafted" />
      </div>

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Unit</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((i, idx) => (
                <tr key={idx} className="bg-card">
                  <td className="px-4 py-3">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground text-pretty">{i.description}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{i.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(Math.round(i.unitPrice * 100))}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {money(Math.round(i.unitPrice * 100) * i.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-medium">Subtotal</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{money(proposal.subtotalCents)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Acceptance deposit ({Math.round(Number(proposal.depositRate) * 100)}% of subtotal)
          </p>
          <p className="text-2xl font-semibold tabular-nums">{money(proposal.depositCents)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {!depositPaid ? <DepositRateEditor proposalId={proposal.id} rate={Number(proposal.depositRate)} /> : null}
          {depositPaid ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--score-high)]">
              <CheckCircle2 className="h-4 w-4" /> Deposit paid
            </span>
          ) : (
            <CheckoutDialog
              start={startDeposit}
              triggerLabel="Accept & pay deposit"
              title={`Pay deposit — ${proposal.title}`}
              priceLabel={`You're paying a ${money(proposal.depositCents)} acceptance deposit for this proposal.`}
            />
          )}
        </div>
      </div>

      {payments.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Payments</h3>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{p.description ?? p.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()} · {p.kind.replace("_", " ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">{money(p.amountCents)}</span>
                  <Badge variant={p.status === "paid" ? "default" : "secondary"} className="capitalize">
                    {p.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
