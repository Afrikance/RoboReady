import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"
import { getProperty } from "@/app/actions/properties"
import { getIntake } from "@/app/actions/intake"
import { listDocuments } from "@/app/actions/documents"
import { PropertyTabs, type TabDef } from "@/components/property/property-tabs"
import { IntakeForm } from "@/components/intake/intake-form"
import { DocumentPanel } from "@/components/documents/document-panel"
import { AssessmentPanel } from "@/components/assessment/assessment-panel"
import { ConceptPanel } from "@/components/concept/concept-panel"
import { PlansPanel } from "@/components/plans/plans-panel"
import { getPlan } from "@/app/actions/plans"
import { AssetPanel } from "@/components/assets/asset-panel"
import { getLatestAssessment, getLatestConcept } from "@/app/actions/assessment"
import { listAssets } from "@/app/actions/assets"
import { buildReportContext } from "@/app/actions/report"
import { ReportPanel } from "@/components/report/report-panel"
import { WayfindingPanel } from "@/components/wayfinding/wayfinding-panel"
import { AccessibilityPanel } from "@/components/accessibility/accessibility-panel"
import { EvPanel } from "@/components/ev/ev-panel"
import { ProposalPanel } from "@/components/proposal/proposal-panel"
import { getWayfinding, getAccessibility, getEvPlan } from "@/app/actions/planners"
import { getLatestProposal } from "@/app/actions/proposals"
import { listPayments } from "@/app/actions/payments"
import { getActiveSubscription } from "@/app/actions/subscriptions"
import { ServicePlanPanel } from "@/components/plans/service-plan-panel"
import { getOrgContext, isClient } from "@/lib/tenancy"
import { canUsePropertyTab, canManageTeam } from "@/lib/access"
import { getAssessmentRunState } from "@/app/actions/assessment-run"
import { getPurchasedTier } from "@/app/actions/payments"
import { ClientAssessment } from "@/components/assessment/client-assessment"
import { getCyberFleetCtaData } from "@/app/actions/cyber-fleet"
import { OfferAssessment } from "@/components/assessment/offer-assessment"
import { isFieldRole } from "@/lib/tenancy"
import { listAssignableStaff, listAssignmentsForProperty } from "@/app/actions/assignments"
import { PropertyAssignments } from "@/components/property/property-assignments"
import { intakeCompletion } from "@/lib/intake/questions"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Property" }

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  handover: "Field work",
  pending_verification: "In verification",
  verified: "Verified",
  intake: "Intake",
  assessing: "Assessing",
  assessed: "Assessed",
  proposed: "Proposal",
  active: "Active",
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const property = await getProperty(id)
  if (!property) notFound()

  // Clients (property owners) get a focused, self-service view: pay for an
  // assessment, watch it run stage by stage, then download the report — not the
  // 13-tab staff workspace. Staff fall through to the full view below.
  const clientCtx = await getOrgContext()
  if (clientCtx && isClient(clientCtx.role)) {
    const [runState, purchasedTier, cyberFleet] = await Promise.all([
      getAssessmentRunState(id),
      getPurchasedTier(id),
      getCyberFleetCtaData(id),
    ])
    const clientAddress = [property.addressLine1, property.city, property.region, property.country]
      .filter(Boolean)
      .join(", ")
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/properties"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> My properties
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{property.name}</h1>
          {clientAddress ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {clientAddress}
            </p>
          ) : null}
        </div>
        <div className="mx-auto max-w-3xl">
          <ClientAssessment
            propertyId={id}
            initialState={runState}
            purchasedTier={purchasedTier}
            cyberFleet={cyberFleet}
          />
        </div>
      </div>
    )
  }

  const [intake, docs, assessment, concept, plan, assets, reportCtx, wayfinding, accessibility, ev, proposal, payments, subscription, ctx] =
    await Promise.all([
      getIntake(id),
      listDocuments(id),
      getLatestAssessment(id),
      getLatestConcept(id),
      getPlan(id),
      listAssets(id),
      buildReportContext(id),
      getWayfinding(id),
      getAccessibility(id),
      getEvPlan(id),
      getLatestProposal(id),
      listPayments(id),
      getActiveSubscription(id),
      getOrgContext(),
    ])
  const intakeAnswers = (intake?.answers as Record<string, unknown>) ?? {}
  const completion = intakeCompletion(intakeAnswers)
  const intakeComplete = intake?.status === "completed"
  const assessmentReady = assessment?.roboReadyScore != null
  const canVerify = ctx ? ctx.role === "owner" || ctx.role === "admin" : false

  // Admins/owners manage which field staff are assigned to build out this
  // property. Load the assignment data only for them.
  const canAssign = ctx ? canManageTeam(ctx.role) : false
  // Sales/admin staff (not field roles) can offer an assessment to a client.
  const canOffer = ctx ? !isFieldRole(ctx.role) : false
  const [assignments, staff] = canAssign
    ? await Promise.all([listAssignmentsForProperty(id), listAssignableStaff()])
    : [[], []]

  // Front-of-funnel pipeline metadata: AI-prefilled vs blank fields, and the
  // soft-gate warning shown until an admin verifies the field-collected data.
  const pipeline = (property.metadata as { pipeline?: { prefill?: { filled?: string[]; leftBlank?: string[] } } } | null)
    ?.pipeline
  const prefill = pipeline?.prefill
    ? { filled: pipeline.prefill.filled ?? [], leftBlank: pipeline.prefill.leftBlank ?? [] }
    : undefined
  const unverifiedWarning = ["prospect", "handover", "pending_verification"].includes(property.status)

  const address = [property.addressLine1, property.city, property.region, property.country]
    .filter(Boolean)
    .join(", ")

  // Field Operators only work the Intake + Documents tabs; everyone else sees
  // the full analysis workflow.
  const role = ctx?.role ?? "member"
  const allTabs: TabDef[] = [
    { id: "overview", label: "Overview" },
    { id: "intake", label: "Intake", badge: `${completion}%` },
    { id: "documents", label: "Documents", badge: String(docs.length) },
    { id: "assessment", label: "Assessment", badge: assessment?.roboReadyScore != null ? String(assessment.roboReadyScore) : undefined },
    { id: "concept", label: "Site concept" },
    { id: "plans", label: "Plans", badge: plan ? `v${plan.version}` : undefined },
    { id: "assets", label: "Infrastructure", badge: assets.length ? String(assets.length) : undefined },
    { id: "wayfinding", label: "Wayfinding" },
    { id: "accessibility", label: "Accessibility", badge: accessibility?.score != null ? String(accessibility.score) : undefined },
    { id: "ev", label: "EV charging" },
    { id: "proposal", label: "Proposal", badge: proposal ? `v${proposal.version}` : undefined },
    { id: "care", label: "Care plan", badge: subscription ? "Active" : undefined },
    { id: "report", label: "Report" },
  ]
  const tabs = allTabs.filter((tab) => canUsePropertyTab(role, tab.id))

  const allPanels: Record<string, ReactNode> = {
    overview: (
      <div className="space-y-6">
        {canOffer ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-sm font-medium">Offer this assessment to a client</p>
              <p className="text-xs text-muted-foreground text-pretty">
                Invite the property owner to purchase and track their own RoboReady assessment.
              </p>
            </div>
            <OfferAssessment propertyId={id} propertyName={property.name} />
          </div>
        ) : null}
        <OverviewPanel property={property} address={address} />
        {canAssign ? (
          <PropertyAssignments propertyId={id} assignments={assignments} staff={staff} />
        ) : null}
      </div>
    ),
    intake: (
      <IntakeForm
        propertyId={id}
        initialAnswers={intakeAnswers}
        initialStatus={intake?.status ?? "draft"}
        isAdmin={canVerify}
        propertyStatus={property.status}
        prefill={prefill}
      />
    ),
    documents: <DocumentPanel propertyId={id} initialDocs={docs} />,
    assessment: (
      <AssessmentPanel
        propertyId={id}
        assessment={assessment}
        intakeComplete={intakeComplete}
        unverifiedWarning={unverifiedWarning}
        purchasedTier={reportCtx?.tier ?? null}
      />
    ),
    concept: <ConceptPanel concept={concept} />,
    plans: <PlansPanel propertyId={id} plan={plan} intakeComplete={intakeComplete} />,
    assets: (
      <AssetPanel
        propertyId={id}
        centerLat={property.latitude}
        centerLng={property.longitude}
        initialAssets={assets.map((a) => ({
          id: a.id,
          label: a.label,
          assetType: a.assetType,
          latitude: a.latitude,
          longitude: a.longitude,
          status: a.status,
          quantity: a.quantity,
          unitCost: a.unitCost,
        }))}
      />
    ),
    wayfinding: <WayfindingPanel propertyId={id} plan={wayfinding} />,
    accessibility: <AccessibilityPanel propertyId={id} audit={accessibility} canVerify={canVerify} />,
    ev: <EvPanel propertyId={id} plan={ev} />,
    proposal: (
      <ProposalPanel propertyId={id} proposal={proposal} payments={payments} assessmentReady={assessmentReady} />
    ),
    care: (
      <ServicePlanPanel
        propertyId={id}
        active={
          subscription
            ? {
                id: subscription.id,
                planId: subscription.planId,
                interval: subscription.interval,
                amountCents: subscription.amountCents,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              }
            : null
        }
        locked={["prospect", "handover", "pending_verification"].includes(property.status)}
      />
    ),
    report: reportCtx ? <ReportPanel propertyId={id} ctx={reportCtx} /> : null,
  }
  // Only ship panels for tabs the role can see — a hidden tab's content must
  // never reach the client payload for a Field Operator.
  const panels = Object.fromEntries(tabs.map((tab) => [tab.id, allPanels[tab.id]]))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/properties"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Properties
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">{property.name}</h1>
              <Badge variant="secondary">{STATUS_LABELS[property.status] ?? property.status}</Badge>
            </div>
            {address ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {address}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <PropertyTabs tabs={tabs} panels={panels} />
    </div>
  )
}

function OverviewPanel({
  property,
  address,
}: {
  property: Awaited<ReturnType<typeof getProperty>>
  address: string
}) {
  if (!property) return null
  const facts: Array<[string, string]> = [
    ["Type", property.propertyType],
    ["Square footage", property.squareFootage ? `${property.squareFootage.toLocaleString()} sq ft` : "—"],
    ["Floors", property.floors ? String(property.floors) : "—"],
    ["Year built", property.yearBuilt ? String(property.yearBuilt) : "—"],
    ["Address", address || "—"],
    [
      "Coordinates",
      property.latitude != null && property.longitude != null
        ? `${property.latitude.toFixed(4)}, ${property.longitude.toFixed(4)}`
        : "—",
    ],
  ]
  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
      {facts.map(([label, value]) => (
        <div key={label} className="bg-card p-4">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm font-medium capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
