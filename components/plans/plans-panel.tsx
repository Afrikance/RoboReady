"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { runPlans } from "@/app/actions/plans"
import { PlanSchematic } from "@/components/plans/plan-schematic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Building2, Home, Loader2, Sparkles } from "lucide-react"

type FloorPlan = {
  level?: string
  summary?: string
  spaces?: Array<{ name: string; kind: string; x: number; y: number; w: number; h: number }>
  path?: Array<{ x: number; y: number }>
  markers?: Array<{ x: number; y: number; label: string; kind?: string }>
}
type SitePlan = {
  summary?: string
  elements?: Array<{ name: string; kind: string; x: number; y: number; w: number; h: number }>
  markers?: Array<{ x: number; y: number; label: string; role?: string }>
}
type Plan = {
  floorPlan: unknown
  sitePlan: unknown
  floorPlanImageUrl: string | null
  sitePlanImageUrl: string | null
  version: number
} | null

function fileUrl(pathname: string) {
  return `/api/documents/file?pathname=${encodeURIComponent(pathname)}`
}

export function PlansPanel({
  propertyId,
  plan,
  intakeComplete,
}: {
  propertyId: string
  plan: Plan
  intakeComplete: boolean
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function generate() {
    startTransition(async () => {
      const res = await runPlans(propertyId)
      if (res.ok) {
        toast.success("Floor plan and site plan generated")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">No plans yet</p>
        <p className="mb-5 mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          {intakeComplete
            ? "Generate a schematic floor plan (interior) and site plan (exterior) from the submitted intake, each paired with an AI render."
            : "Submit the intake first — the floor plan and site plan are laid out from the interior survey and property details."}
        </p>
        <Button onClick={generate} disabled={pending || !intakeComplete}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {pending ? "Generating…" : "Generate plans"}
        </Button>
      </div>
    )
  }

  const floor = (plan.floorPlan as FloorPlan) ?? {}
  const site = (plan.sitePlan as SitePlan) ?? {}

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            Floor &amp; site plans <Badge variant="secondary">v{plan.version}</Badge>
          </p>
          <p className="text-xs text-muted-foreground">Schematic layout plus an AI render for each plan.</p>
        </div>
        <Button variant="outline" size="sm" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
          Regenerate
        </Button>
      </div>

      <PlanBlock
        icon={<Home className="h-4 w-4 text-primary" />}
        title="Floor plan — interior"
        subtitle={floor.level}
        summary={floor.summary}
        schematic={
          <PlanSchematic
            rects={floor.spaces ?? []}
            path={floor.path ?? []}
            markers={floor.markers ?? []}
            ariaLabel="Interior floor plan schematic"
          />
        }
        imageUrl={plan.floorPlanImageUrl}
        imageAlt="AI-rendered interior floor plan"
      />

      <PlanBlock
        icon={<Building2 className="h-4 w-4 text-primary" />}
        title="Site plan — exterior"
        summary={site.summary}
        schematic={
          <PlanSchematic
            rects={site.elements ?? []}
            markers={site.markers ?? []}
            ariaLabel="Exterior site plan schematic"
          />
        }
        imageUrl={plan.sitePlanImageUrl}
        imageAlt="AI-rendered exterior site plan"
      />
    </div>
  )
}

function PlanBlock({
  icon,
  title,
  subtitle,
  summary,
  schematic,
  imageUrl,
  imageAlt,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  summary?: string
  schematic: React.ReactNode
  imageUrl: string | null
  imageAlt: string
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle ? <span className="text-xs text-muted-foreground">· {subtitle}</span> : null}
      </div>
      {summary ? <p className="text-sm text-muted-foreground text-pretty">{summary}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <figure className="space-y-1.5">
          <div className="aspect-square overflow-hidden rounded-lg border border-border bg-card p-2">{schematic}</div>
          <figcaption className="text-[11px] uppercase tracking-wide text-muted-foreground">Schematic</figcaption>
        </figure>
        <figure className="space-y-1.5">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(imageUrl) || "/placeholder.svg"} alt={imageAlt} className="h-full w-full object-cover" />
            ) : (
              <p className="px-6 text-center text-xs text-muted-foreground text-pretty">
                The AI render is unavailable for this plan. The schematic is the source of truth.
              </p>
            )}
          </div>
          <figcaption className="text-[11px] uppercase tracking-wide text-muted-foreground">AI render</figcaption>
        </figure>
      </div>
    </section>
  )
}
