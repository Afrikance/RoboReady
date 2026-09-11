import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"
import { getProperty } from "@/app/actions/properties"
import { getIntake } from "@/app/actions/intake"
import { listDocuments } from "@/app/actions/documents"
import { PropertyTabs, type TabDef } from "@/components/property/property-tabs"
import { IntakeForm } from "@/components/intake/intake-form"
import { DocumentPanel } from "@/components/documents/document-panel"
import { intakeCompletion } from "@/lib/intake/questions"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Property" }

const STATUS_LABELS: Record<string, string> = {
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

  const [intake, docs] = await Promise.all([getIntake(id), listDocuments(id)])
  const intakeAnswers = (intake?.answers as Record<string, unknown>) ?? {}
  const completion = intakeCompletion(intakeAnswers)

  const address = [property.addressLine1, property.city, property.region, property.country]
    .filter(Boolean)
    .join(", ")

  const tabs: TabDef[] = [
    { id: "overview", label: "Overview" },
    { id: "intake", label: "Intake", badge: `${completion}%` },
    { id: "documents", label: "Documents", badge: String(docs.length) },
    { id: "assessment", label: "Assessment" },
    { id: "concept", label: "Site concept" },
    { id: "assets", label: "Infrastructure" },
    { id: "report", label: "Report" },
  ]

  const panels = {
    overview: <OverviewPanel property={property} address={address} />,
    intake: (
      <IntakeForm propertyId={id} initialAnswers={intakeAnswers} initialStatus={intake?.status ?? "draft"} />
    ),
    documents: <DocumentPanel propertyId={id} initialDocs={docs} />,
    assessment: <Placeholder title="Assessment" note="Run the AI readiness assessment from here — coming up next." />,
    concept: <Placeholder title="Site concept" note="AI-generated site concepts will appear here." />,
    assets: <Placeholder title="Infrastructure" note="Place EV chargers, landing pads, and other assets on the map." />,
    report: <Placeholder title="Report" note="Generate and export the client-ready report here." />,
  }

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

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">{note}</p>
    </div>
  )
}
