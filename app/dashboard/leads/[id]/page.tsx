import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, Building2, Sparkles, ListChecks } from "lucide-react"
import { getLead } from "@/app/actions/leads"
import { QualifyLead } from "@/components/leads/qualify-lead"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Lead" }

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  qualifying: "Qualifying",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
}

const RATING_STYLE: Record<string, string> = {
  hot: "text-[var(--score-low)]",
  warm: "text-[var(--score-mid)]",
  cold: "text-muted-foreground",
}

const BUDGET_LABEL: Record<string, string> = {
  unknown: "Unknown",
  low: "Low",
  medium: "Medium",
  high: "High",
}

type Qualification = {
  fitScore: number
  rating: string
  budgetBand: string
  likelyNeeds: string[]
  rationale: string
  recommendedActions: string[]
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lead = await getLead(id)
  if (!lead) notFound()

  const q = lead.qualification as Qualification | null
  const value =
    lead.estimatedValue && Number(lead.estimatedValue) > 0
      ? Number(lead.estimatedValue).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
      : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/leads"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Pipeline
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">{lead.company}</h1>
              <Badge variant="secondary">{STAGE_LABEL[lead.stage] ?? lead.stage}</Badge>
            </div>
            {lead.contactName ? <p className="mt-1 text-sm text-muted-foreground">{lead.contactName}</p> : null}
          </div>
          <QualifyLead leadId={lead.id} label={q ? "Re-qualify with AI" : "Qualify with AI"} />
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        <Fact icon={<Building2 className="h-4 w-4" />} label="Source" value={lead.source} />
        <Fact icon={<ListChecks className="h-4 w-4" />} label="Estimated value" value={value ?? "—"} />
        <Fact icon={<Mail className="h-4 w-4" />} label="Email" value={lead.contactEmail ?? "—"} />
        <Fact icon={<Phone className="h-4 w-4" />} label="Phone" value={lead.contactPhone ?? "—"} />
      </div>

      {lead.notes ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
          <p className="mt-1 whitespace-pre-line text-sm text-pretty">{lead.notes}</p>
        </div>
      ) : null}

      {q ? (
        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Mercer&apos;s qualification</h2>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Fit score</p>
              <p className="text-2xl font-semibold tabular-nums">{q.fitScore}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rating</p>
              <p className={`text-lg font-semibold capitalize ${RATING_STYLE[q.rating] ?? ""}`}>{q.rating}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Budget band</p>
              <p className="text-lg font-semibold">{BUDGET_LABEL[q.budgetBand] ?? q.budgetBand}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-pretty">{q.rationale}</p>
          {q.likelyNeeds?.length ? (
            <div>
              <p className="mb-2 text-sm font-semibold">Likely needs</p>
              <div className="flex flex-wrap gap-2">
                {q.likelyNeeds.map((n, i) => (
                  <Badge key={i} variant="outline">{n}</Badge>
                ))}
              </div>
            </div>
          ) : null}
          {q.recommendedActions?.length ? (
            <div>
              <p className="mb-2 text-sm font-semibold">Recommended next actions</p>
              <ul className="space-y-1.5">
                {q.recommendedActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-pretty">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium">Not qualified yet</p>
          <p className="mb-4 mt-1 max-w-md text-sm text-muted-foreground text-pretty">
            Let Mercer score this lead&apos;s fit, infer budget and needs, and recommend next actions.
          </p>
          <QualifyLead leadId={lead.id} />
        </div>
      )}
    </div>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card p-4">
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
    </div>
  )
}
