"use client"

import { useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Building2, Check, CircleAlert, Handshake, MapPin, Plus, Save, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createPartnerReferral,
  getPartnerWorkspaceForAdmin,
  recordReferralConsent,
  saveSolutionPartner,
  setSolutionPartnerActive,
  updatePartnerReferral,
} from "@/app/actions/partner-matching"
import {
  canTransitionReferral,
  matchPartnerCandidates,
  opportunityCategoryLabel,
  partnerCategoryLabel,
  partnerCoverageSummary,
  statusLabel,
  OPPORTUNITY_CATEGORIES,
} from "@/lib/partner-matching/core"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import type { MatchOpportunity, PartnerProfile, PartnerWorkspace, ReferralStatus } from "@/lib/partner-matching/types"

const STATUS_ORDER: ReferralStatus[] = ["draft", "under_review", "sent", "accepted", "declined", "in_progress", "won", "lost", "withdrawn"]
const CONSENT_METHODS = ["email", "phone", "in_person", "written", "other"] as const

export function PartnerWorkspace({ initialWorkspace }: { initialWorkspace: PartnerWorkspace }) {
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [needsByProperty, setNeedsByProperty] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(initialWorkspace.opportunities.map((opportunity) => [opportunity.propertyId, opportunity.needs])),
  )
  const [referralFilter, setReferralFilter] = useState("all")
  const visibleReferrals = referralFilter === "all"
    ? workspace.referrals
    : workspace.referrals.filter((referral) => referral.status === referralFilter)
  const partnerCount = workspace.partners.length
  const activeCount = workspace.partners.filter((partner) => partner.active).length

  async function refreshWorkspace() {
    const next = await getPartnerWorkspaceForAdmin()
    if (next) setWorkspace(next)
  }

  function setNeeds(propertyId: string, category: string) {
    setNeedsByProperty((current) => {
      const selected = current[propertyId] ?? []
      return {
        ...current,
        [propertyId]: selected.includes(category)
          ? selected.filter((value) => value !== category)
          : [...selected, category],
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-5 border-b pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Handshake className="size-4" /> Internal partner operations
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Solution partners</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Match qualified properties with robotics and EV-charging partners, then track the handoff internally. No customer details are sent from this workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SummaryChip icon={<Building2 className="size-4" />} label="Partners" value={partnerCount} />
          <SummaryChip icon={<Check className="size-4" />} label="Active" value={activeCount} />
          <SummaryChip icon={<Users className="size-4" />} label="Referrals" value={workspace.referrals.length} />
        </div>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="partner-directory-heading">
        <SectionHeading id="partner-directory-heading" eyebrow="Directory" title="Partner directory" description="Manage partner capabilities, contacts, and service territories for internal matching." />
        {workspace.partners.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {workspace.partners.map((partner) => <PartnerEditor key={partner.id} partner={partner} onSaved={refreshWorkspace} />)}
          </div>
        ) : null}
        <PartnerEditor onSaved={refreshWorkspace} />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="opportunity-heading">
        <SectionHeading id="opportunity-heading" eyebrow="Matching" title="Qualified opportunities" description="Candidates are screened with transparent category and location rules. A match is a review aid, not a recommendation or automated handoff." />
        {workspace.opportunities.length === 0 ? (
          <EmptyCard icon={<MapPin className="size-5" />} title="No qualified opportunities yet" body="Completed assessments with a RoboReady score of 50 or higher, and qualified leads linked to a property, will appear here." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {workspace.opportunities.map((opportunity) => (
              <OpportunityCard
                key={`${opportunity.propertyId}:${opportunity.leadId ?? "property"}`}
                opportunity={opportunity}
                needs={needsByProperty[opportunity.propertyId] ?? opportunity.needs}
                partners={workspace.partners.filter((partner) => partner.active)}
                onToggleNeed={setNeeds}
                onCreated={refreshWorkspace}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="referrals-heading">
        <SectionHeading id="referrals-heading" eyebrow="Pipeline" title="Referral tracking" description="Record owner consent before marking a referral sent. The workflow stores an internal attestation only; delivery remains manual and out of scope." />
        {workspace.referrals.length === 0 ? (
          <EmptyCard icon={<ShieldCheck className="size-5" />} title="No referral drafts" body="Create a draft from a qualified opportunity after selecting an active partner that meets the chosen criteria." />
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex max-w-xs flex-col gap-2 text-sm font-medium">Filter by stage
              <select value={referralFilter} onChange={(event) => setReferralFilter(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="all">All stages ({workspace.referrals.length})</option>
                {STATUS_ORDER.map((status) => <option value={status} key={status}>{statusLabel(status)} ({workspace.referrals.filter((referral) => referral.status === status).length})</option>)}
              </select>
            </label>
            {visibleReferrals.length ? (
              <div className="flex flex-col gap-4">
                {visibleReferrals.map((referral) => <ReferralCard key={referral.id} referral={referral} onUpdated={refreshWorkspace} />)}
              </div>
            ) : <EmptyCard icon={<Users className="size-5" />} title="No referrals in this stage" body="Choose another stage to see matching referrals." />}
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryChip({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
      <span className="text-primary">{icon}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function SectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

function PartnerEditor({ partner, onSaved }: { partner?: PartnerProfile; onSaved: () => Promise<void> }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [active, setActive] = useState(partner?.active ?? true)
  const [category, setCategory] = useState(partner?.category ?? "robotics")
  const [nationwide, setNationwide] = useState(partner?.coverage.nationwide ?? false)
  const [contactName, setContactName] = useState(partner?.contactName ?? "")
  const [contactEmail, setContactEmail] = useState(partner?.contactEmail ?? "")
  const [contactPhone, setContactPhone] = useState(partner?.contactPhone ?? "")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const input = {
      name: String(formData.get("name") ?? ""),
      category,
      capabilities: String(formData.get("capabilities") ?? ""),
      coverage: {
        nationwide,
        country: String(formData.get("country") ?? "").trim().toUpperCase() || null,
        areas: String(formData.get("areas") ?? "").split(",").map((area) => area.trim()).filter(Boolean),
      },
      contactName,
      contactEmail,
      contactPhone,
    }
    startTransition(async () => {
      const result = await saveSolutionPartner(partner?.id ?? null, input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(partner ? "Partner details saved." : "Partner added to the directory.")
      if (!partner) {
        formRef.current?.reset()
        setCategory("robotics")
        setNationwide(false)
        setContactName("")
        setContactEmail("")
        setContactPhone("")
      }
      await onSaved()
      router.refresh()
    })
  }

  function toggleActive() {
    if (!partner) return
    const next = !active
    startTransition(async () => {
      const result = await setSolutionPartnerActive(partner.id, next)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setActive(next)
      toast.success(next ? "Partner activated for matching." : "Partner deactivated.")
      await onSaved()
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{partner?.name ?? "Add a solution partner"}</CardTitle>
            <CardDescription className="mt-2">{partner ? "Partner profile and territory" : "Add a robotics, EV-charging, or combined service provider."}</CardDescription>
          </div>
          {partner ? <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Inactive"}</Badge> : <Badge variant="outline"><Plus /> New partner</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4">
          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id={`partner-name-${partner?.id ?? "new"}`} label="Company name">
              <Input id={`partner-name-${partner?.id ?? "new"}`} name="name" defaultValue={partner?.name ?? ""} minLength={2} maxLength={100} required disabled={pending} placeholder="Northstar Robotics" />
            </FormField>
            <FormField id={`partner-category-${partner?.id ?? "new"}`} label="Solution category">
              <select id={`partner-category-${partner?.id ?? "new"}`} value={category} onChange={(event) => setCategory(event.target.value as typeof category)} disabled={pending} className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="robotics">Robotics</option>
                <option value="charging">EV charging</option>
                <option value="both">Robotics + EV charging</option>
              </select>
            </FormField>
            <FormField id={`partner-capabilities-${partner?.id ?? "new"}`} label="Capabilities" hint="Comma-separated tags for staff review.">
              <Input id={`partner-capabilities-${partner?.id ?? "new"}`} name="capabilities" defaultValue={partner?.capabilities.join(", ") ?? ""} maxLength={1200} disabled={pending} placeholder="delivery robots, fleet integration" />
            </FormField>
            <FormField id={`partner-country-${partner?.id ?? "new"}`} label="Country code" hint="Two-letter ISO code, such as US or CA.">
              <Input id={`partner-country-${partner?.id ?? "new"}`} name="country" defaultValue={partner?.coverage.country ?? ""} minLength={2} maxLength={2} required disabled={pending} placeholder="US" />
            </FormField>
            <FormField id={`partner-areas-${partner?.id ?? "new"}`} label="Cities or regions" hint="Comma-separated names; required unless nationwide is checked.">
              <Input id={`partner-areas-${partner?.id ?? "new"}`} name="areas" defaultValue={partner?.coverage.areas.join(", ") ?? ""} maxLength={1200} disabled={pending || nationwide} placeholder="Austin, Texas" />
            </FormField>
            <label className="flex items-center gap-3 self-end rounded-md border px-3 py-2 text-sm">
              <input type="checkbox" checked={nationwide} onChange={(event) => setNationwide(event.target.checked)} disabled={pending} className="size-4 accent-primary" />
              Nationwide coverage in this country
            </label>
            <FormField id={`partner-contact-name-${partner?.id ?? "new"}`} label="Contact name">
              <Input id={`partner-contact-name-${partner?.id ?? "new"}`} value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={120} disabled={pending} placeholder="Partner contact" />
            </FormField>
            <FormField id={`partner-contact-email-${partner?.id ?? "new"}`} label="Contact email">
              <Input id={`partner-contact-email-${partner?.id ?? "new"}`} type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} maxLength={320} disabled={pending} placeholder="contact@example.com" />
            </FormField>
            <FormField id={`partner-contact-phone-${partner?.id ?? "new"}`} label="Contact phone">
              <Input id={`partner-contact-phone-${partner?.id ?? "new"}`} value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} maxLength={60} disabled={pending} placeholder="Optional" />
            </FormField>
          </FieldGroup>
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button type="submit" size="sm" disabled={pending}>
              <Save data-icon="inline-start" /> {partner ? "Save changes" : "Add partner"}
            </Button>
            {partner ? (
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={toggleActive}>
                {active ? "Deactivate partner" : "Activate partner"}
              </Button>
            ) : null}
            {partner ? <span className="text-xs text-muted-foreground">Coverage: {partnerCoverageSummary(partner.coverage)}</span> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function OpportunityCard({ opportunity, needs, partners, onToggleNeed, onCreated }: {
  opportunity: MatchOpportunity
  needs: string[]
  partners: PartnerProfile[]
  onToggleNeed: (propertyId: string, category: string) => void
  onCreated: () => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  const candidates = useMemo(() => matchPartnerCandidates(opportunity, partners, needs as (typeof OPPORTUNITY_CATEGORIES)[number][]), [opportunity, partners, needs])
  const matches = candidates.filter((candidate) => candidate.matched)

  function createDraft(partnerId: string) {
    startTransition(async () => {
      const result = await createPartnerReferral({
        partnerId,
        propertyId: opportunity.propertyId,
        leadId: opportunity.leadId,
        needs,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Internal referral draft created. No partner has been contacted.")
      await onCreated()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{opportunity.propertyName}</CardTitle>
            <CardDescription className="mt-2">
              {[opportunity.city, opportunity.region, opportunity.country].filter(Boolean).join(", ") || "Location unavailable"}
              {opportunity.leadCompany ? ` · Qualified lead: ${opportunity.leadCompany}` : " · Assessment opportunity"}
            </CardDescription>
          </div>
          <Badge variant="outline">{matches.length} {matches.length === 1 ? "match" : "matches"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldSet className="gap-2">
          <FieldLegend variant="label" className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Solution needs</FieldLegend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {OPPORTUNITY_CATEGORIES.map((category) => (
              <label key={category} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={needs.includes(category)} onChange={() => onToggleNeed(opportunity.propertyId, category)} className="size-4 accent-primary" />
                {opportunityCategoryLabel(category)}
              </label>
            ))}
          </div>
        </FieldSet>
        {!needs.length ? (
          <p className="rounded-md bg-muted p-3 text-sm leading-relaxed text-muted-foreground">No robotics or charging gaps were derived from the current assessment. Select needs above only when staff review identifies a relevant opportunity.</p>
        ) : candidates.length ? (
          <div className="flex flex-col gap-3">
            {candidates.map(({ partner, matched, reasons, unmet }) => (
              <div key={partner.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{partner.name}</p>
                    <Badge variant="secondary">{partnerCategoryLabel(partner.category)}</Badge>
                    <Badge variant={matched ? "default" : "outline"}>{matched ? "Meets selected criteria" : `${unmet.length} criteria unmet`}</Badge>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
                    {reasons.map((reason) => <li key={reason} className="flex items-start gap-1.5"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" />{reason}</li>)}
                    {unmet.map((criterion) => <li key={criterion} className="flex items-start gap-1.5"><CircleAlert className="mt-0.5 size-3.5 shrink-0" />{criterion}</li>)}
                  </ul>
                </div>
                <Button type="button" size="sm" disabled={pending || !matched} onClick={() => createDraft(partner.id)}>
                  Draft referral <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            ))}
            {candidates.length === 0 ? <p className="text-sm text-muted-foreground">No active partners to evaluate yet.</p> : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active partners to evaluate yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ReferralCard({ referral, onUpdated }: { referral: PartnerWorkspace["referrals"][number]; onUpdated: () => Promise<void> }) {
  const [pending, startTransition] = useTransition()
  const [method, setMethod] = useState<(typeof CONSENT_METHODS)[number]>("email")
  const [notes, setNotes] = useState(referral.notes ?? "")
  const [stage, setStage] = useState("")
  const router = useRouter()
  const transitionOptions = STATUS_ORDER.filter((status) => canTransitionReferral(referral.status, status))
  const needsConsent = !referral.consentObtainedAt || !referral.consentObtainedByUserId || !referral.consentMethod
  const place = [referral.propertySnapshot.city, referral.propertySnapshot.region, referral.propertySnapshot.country].filter(Boolean).join(", ")

  function recordConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await recordReferralConsent({
        referralId: referral.id,
        method,
        obtainedOn: form.get("obtainedOn"),
        reference: form.get("reference"),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Owner-consent attestation recorded.")
      await onUpdated()
      router.refresh()
    })
  }

  function saveStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stage) return
    startTransition(async () => {
      const result = await updatePartnerReferral({ referralId: referral.id, status: stage })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Referral moved to ${statusLabel(stage)}.`)
      setStage("")
      await onUpdated()
      router.refresh()
    })
  }

  function saveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await updatePartnerReferral({ referralId: referral.id, notes })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Referral notes saved.")
      await onUpdated()
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{referral.partnerName} <span className="font-normal text-muted-foreground">→</span> {referral.propertySnapshot.name}</CardTitle>
            <CardDescription className="mt-2">
              {place || "Location unavailable"}{referral.leadCompany ? ` · Lead: ${referral.leadCompany}` : ""} · Created {referral.createdAt.toISOString().slice(0, 10)}
            </CardDescription>
          </div>
          <Badge variant={referral.status === "won" ? "default" : referral.status === "lost" || referral.status === "declined" || referral.status === "withdrawn" ? "secondary" : "outline"}>{statusLabel(referral.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {referral.matchReasons.length ? (
          <div className="flex flex-wrap gap-2">
            {referral.matchReasons.map((reason) => <Badge key={reason} variant="secondary">{reason}</Badge>)}
          </div>
        ) : null}
        <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={saveNotes} className="flex flex-col gap-3">
            <label htmlFor={`referral-notes-${referral.id}`} className="text-sm font-medium">Internal notes</label>
            <Textarea id={`referral-notes-${referral.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={3} disabled={pending} placeholder="Internal status notes; not sent to the partner." />
            <div><Button type="submit" size="sm" variant="outline" disabled={pending}><Save data-icon="inline-start" /> Save notes</Button></div>
          </form>
          <div className="flex flex-col gap-3 rounded-md border p-4">
            <div className="flex items-start gap-2">
              {needsConsent ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-primary" /> : <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />}
              <div>
                <p className="text-sm font-medium">{needsConsent ? "Owner consent required before sending" : "Consent attestation recorded"}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {needsConsent ? "Record the consent method and date. This does not contact the partner or share property information." : `${referral.consentMethod} · ${referral.consentObtainedAt?.toISOString().slice(0, 10)}${referral.consentReference ? ` · Ref: ${referral.consentReference}` : ""}`}
                </p>
              </div>
            </div>
            {needsConsent && (referral.status === "draft" || referral.status === "under_review") ? (
              <form onSubmit={recordConsent} className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs font-medium">Consent method
                  <select value={method} onChange={(event) => setMethod(event.target.value as (typeof CONSENT_METHODS)[number])} disabled={pending} className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {CONSENT_METHODS.map((value) => <option value={value} key={value}>{statusLabel(value)}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-xs font-medium">Date obtained
                  <Input type="date" name="obtainedOn" required disabled={pending} defaultValue={new Date().toISOString().slice(0, 10)} />
                </label>
                <label className="flex flex-col gap-2 text-xs font-medium sm:col-span-2">Internal reference (optional)
                  <Input name="reference" maxLength={240} disabled={pending} placeholder="CRM note or call reference" />
                </label>
                <div className="sm:col-span-2"><Button type="submit" size="sm" variant="outline" disabled={pending}><ShieldCheck data-icon="inline-start" /> Record consent</Button></div>
              </form>
            ) : null}
          </div>
        </div>
        {transitionOptions.length ? (
          <form onSubmit={saveStage} className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end">
            <label className="flex max-w-sm flex-1 flex-col gap-2 text-sm font-medium">Move referral to
              <select value={stage} onChange={(event) => setStage(event.target.value)} disabled={pending} className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Choose next stage</option>
                {transitionOptions.map((status) => <option value={status} key={status} disabled={status === "sent" && needsConsent}>{statusLabel(status)}{status === "sent" && needsConsent ? " — consent required" : ""}</option>)}
              </select>
            </label>
            <Button type="submit" size="sm" disabled={pending || !stage}>Update stage</Button>
            {transitionOptions.includes("sent") && needsConsent ? <span className="text-xs text-muted-foreground">Sending is enabled only after owner consent is recorded.</span> : null}
          </form>
        ) : <p className="border-t pt-4 text-sm text-muted-foreground">This referral is closed.</p>}
      </CardContent>
    </Card>
  )
}

function FormField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id} className="text-sm font-medium">{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription className="text-xs leading-relaxed">{hint}</FieldDescription> : null}
    </Field>
  )
}

function EmptyCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">{icon}</span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </CardContent>
    </Card>
  )
}
