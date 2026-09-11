"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles, Plus, Wand2, Phone, MapPin, ClipboardList, BadgeCheck, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { prospectProperties, prefillProperty } from "@/app/actions/prospecting"
import { createProperty } from "@/app/actions/properties"
import {
  PROPERTY_TYPES,
  propertyTypeLabel,
  filterProperties,
  distanceFrom,
  readProspectNote,
  type ProspectRow,
  type PropertyFilter,
} from "@/lib/prospecting/filter"
import { QueueFilterBar } from "@/components/prospecting/queue-filter-bar"

// Where each staged candidate currently sits in the funnel.
const STAGE: Record<string, { label: string; href: string | null }> = {
  prospect: { label: "New prospect", href: null },
  handover: { label: "In field work", href: "/dashboard/handover" },
  pending_verification: { label: "Awaiting verification", href: "/dashboard/verification" },
}

export function ProspectDatabase({ initialProspects }: { initialProspects: ProspectRow[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<PropertyFilter>({})
  const [prefilling, setPrefilling] = useState<string | null>(null)

  const filtered = useMemo(() => filterProperties(initialProspects, filter), [initialProspects, filter])

  function runPrefill(id: string) {
    setPrefilling(id)
    prefillProperty(id).then((res) => {
      setPrefilling(null)
      if (res.ok) {
        toast.success(`Pre-filled ${res.data.filled} field(s), ${res.data.blank} left for the field team.`)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <AiProspectForm onDone={() => router.refresh()} />
        <ManualAddForm onDone={() => router.refresh()} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Prospecting pipeline</h2>
          <span className="text-xs text-muted-foreground">{initialProspects.length} in the funnel</span>
        </div>
        <QueueFilterBar value={filter} onChange={setFilter} count={filtered.length} />

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No candidates in the funnel. Generate some with AI — Scout pre-fills each one and sends it to Field Work.
          </p>
        ) : (
          <ul className="grid gap-3">
            {filtered.map((p) => {
              const note = readProspectNote(p.metadata)
              const miles = distanceFrom(p, filter.ref)
              const stage = STAGE[p.status] ?? { label: p.status, href: null }
              return (
                <li key={p.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{p.name}</p>
                        <Badge variant="secondary" className="text-[10px]">{propertyTypeLabel(p.propertyType)}</Badge>
                        <Badge
                          variant={p.status === "prospect" ? "outline" : "default"}
                          className="gap-1 text-[10px]"
                        >
                          {p.status === "pending_verification" ? (
                            <BadgeCheck className="h-3 w-3" />
                          ) : p.status === "handover" ? (
                            <ClipboardList className="h-3 w-3" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {stage.label}
                        </Badge>
                        {miles != null ? (
                          <span className="text-xs text-muted-foreground">{miles.toFixed(1)} mi</span>
                        ) : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {[p.addressLine1, p.city, p.region, p.postalCode].filter(Boolean).join(", ") || "No address"}
                      </p>
                      {p.phone ? (
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {p.phone}
                        </p>
                      ) : null}
                      {note ? <p className="mt-2 text-xs text-muted-foreground text-pretty">{note}</p> : null}
                    </div>
                    {p.status === "prospect" ? (
                      <Button size="sm" onClick={() => runPrefill(p.id)} disabled={prefilling === p.id}>
                        <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                        {prefilling === p.id ? "Pre-filling…" : "AI pre-fill → hand over"}
                      </Button>
                    ) : stage.href ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={stage.href}>
                          View <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function AiProspectForm({ onDone }: { onDone: () => void }) {
  const [city, setCity] = useState("")
  const [region, setRegion] = useState("")
  const [propertyType, setPropertyType] = useState("hotel")
  const [count, setCount] = useState(5)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = await prospectProperties({ city, region, propertyType, count })
      if (res.ok) {
        toast.success(`Scout pre-filled ${res.data.created} candidate(s) and sent them to Field Work.`)
        onDone()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">AI prospecting</h3>
          <p className="text-xs text-muted-foreground">
            Scout finds candidates, pre-fills the intake, and sends them to Field Work.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Austin" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">State</Label>
          <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="TX" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Property type</Label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">How many</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
          />
        </div>
      </div>
      <Button onClick={submit} disabled={pending || !city.trim() || !region.trim()} className="w-full">
        <Sparkles className="mr-1.5 h-4 w-4" />
        {pending ? "Scout is prospecting & pre-filling…" : "Generate & send to Field Work"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-pretty">
        AI suggestions are unverified leads — the field team completes them and an admin verifies before a property is
        created. Each candidate runs an AI pre-fill, so larger batches take longer.
      </p>
    </div>
  )
}

function ManualAddForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    propertyType: "hotel",
    addressLine1: "",
    city: "",
    region: "",
    postalCode: "",
    phone: "",
    latitude: "",
    longitude: "",
  })
  const [pending, startTransition] = useTransition()
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    startTransition(async () => {
      const res = await createProperty({
        name: form.name,
        propertyType: form.propertyType,
        addressLine1: form.addressLine1 || undefined,
        city: form.city || undefined,
        region: form.region || undefined,
        postalCode: form.postalCode || undefined,
        phone: form.phone || undefined,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        asProspect: true,
      })
      if (res.ok) {
        toast.success("Added to the prospect database.")
        setForm({ name: "", propertyType: "hotel", addressLine1: "", city: "", region: "", postalCode: "", phone: "", latitude: "", longitude: "" })
        onDone()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          <Plus className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Add manually</h3>
          <p className="text-xs text-muted-foreground">Enter a known property into the database.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Property name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Property type</Label>
          <Select value={form.propertyType} onValueChange={(v) => set("propertyType", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 123-4567" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Address</Label>
          <Input value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="Street address" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">State</Label>
          <Input value={form.region} onChange={(e) => set("region", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Postal code</Label>
          <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Lat</Label>
            <Input type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lng</Label>
            <Input type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
          </div>
        </div>
      </div>
      <Button onClick={submit} disabled={pending || form.name.trim().length < 2} variant="outline" className="w-full">
        <Plus className="mr-1.5 h-4 w-4" /> {pending ? "Adding…" : "Add to database"}
      </Button>
    </div>
  )
}
