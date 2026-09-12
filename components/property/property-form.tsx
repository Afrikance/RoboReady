"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Loader2 } from "lucide-react"
import { createProperty } from "@/app/actions/properties"
import { PropertyMediaUploader } from "@/components/property/property-media-uploader"

const PROPERTY_TYPES = [
  { value: "commercial", label: "Commercial / Office" },
  { value: "hospitality", label: "Hotel / Hospitality" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse / Logistics" },
  { value: "healthcare", label: "Healthcare" },
  { value: "residential", label: "Multi-family Residential" },
  { value: "campus", label: "Campus / Mixed-use" },
]

// Freeform knowledge-base prompts. The owner knows the building best, so these
// answers are stored on the property and fed into the AI assessment context.
const KNOWLEDGE_FIELDS: { key: string; label: string; placeholder: string }[] = [
  {
    key: "operations",
    label: "What happens here day to day?",
    placeholder:
      "Describe the business, tenants, foot traffic, and daily operations. e.g. 120-room hotel with a restaurant, busy lobby, and rooftop bar.",
  },
  {
    key: "goals",
    label: "What would you want robots, drones, or self-driving vehicles to do here?",
    placeholder: "e.g. Autonomous room-service delivery, security patrol drones, self-parking valet.",
  },
  {
    key: "accessLogistics",
    label: "Access & logistics",
    placeholder:
      "Loading docks, elevators, doorway widths, floor surfaces, ramps, stairs, and how people and goods move through the site.",
  },
  {
    key: "layoutNotes",
    label: "Layout features & obstacles",
    placeholder:
      "Long corridors, outdoor yard, parking structure, tight corners, uneven flooring, congested areas, etc.",
  },
  {
    key: "connectivity",
    label: "Power, network & existing systems",
    placeholder:
      "Wi-Fi / cellular coverage, available power, and any existing automation, cameras, or IT systems.",
  },
  {
    key: "constraints",
    label: "Constraints & requirements",
    placeholder: "Operating hours, safety/security rules, regulations, accessibility needs, budget considerations.",
  },
]

function num(v: FormDataEntryValue | null): number | null {
  const n = Number(v)
  return v === null || v === "" || Number.isNaN(n) ? null : n
}

export function PropertyForm() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState("commercial")
  const [details, setDetails] = useState<Record<string, string>>({})
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [fileCount, setFileCount] = useState(0)

  async function onSubmitDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const f = new FormData(e.currentTarget)

    const res = await createProperty({
      name: String(f.get("name") ?? ""),
      propertyType: type,
      addressLine1: String(f.get("addressLine1") ?? ""),
      city: String(f.get("city") ?? ""),
      region: String(f.get("region") ?? ""),
      postalCode: String(f.get("postalCode") ?? ""),
      country: String(f.get("country") ?? ""),
      latitude: num(f.get("latitude")),
      longitude: num(f.get("longitude")),
      squareFootage: num(f.get("squareFootage")),
      floors: num(f.get("floors")),
      yearBuilt: num(f.get("yearBuilt")),
      details,
    })

    setLoading(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Property saved — now add photos, plans, and files")
    setCreatedId(res.data.id)
    setStep(2)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function finish() {
    if (!createdId) return
    router.push(`/dashboard/properties/${createdId}`)
    router.refresh()
  }

  if (step === 2 && createdId) {
    return (
      <div className="flex flex-col gap-6">
        <StepHeader step={2} />
        <Card>
          <CardContent className="flex flex-col gap-5 pt-6">
            <div>
              <h2 className="text-lg font-semibold">Add photos, plans, and files</h2>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                You are the best source of truth for this property. Upload anything that helps our AI understand it —
                interior and exterior photos, a video walkthrough, floor plans, CAD drawings (DXF/DWG), permits, and
                spec sheets.
              </p>
            </div>
            <PropertyMediaUploader propertyId={createdId} onCountChange={setFileCount} />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {fileCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Check className="h-4 w-4 text-emerald-600" />
                {fileCount} file{fileCount === 1 ? "" : "s"} added
              </span>
            ) : (
              "You can also add files later from the property page."
            )}
          </p>
          <Button onClick={finish}>Continue to property</Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmitDetails} className="flex flex-col gap-6">
      <StepHeader step={1} />

      <Card>
        <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="name">Property name</Label>
            <Input id="name" name="name" required placeholder="Quality Inn & Suites Bel Air" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="propertyType">Property type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="propertyType">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="yearBuilt">Year built</Label>
            <Input id="yearBuilt" name="yearBuilt" type="number" placeholder="1998" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="addressLine1">Street address</Label>
            <Input id="addressLine1" name="addressLine1" placeholder="123 Main St" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" placeholder="Bel Air" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="region">State / Region</Label>
            <Input id="region" name="region" placeholder="MD" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input id="postalCode" name="postalCode" placeholder="21014" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" placeholder="USA" defaultValue="USA" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" name="latitude" type="number" step="any" placeholder="39.5359" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" name="longitude" type="number" step="any" placeholder="-76.3483" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="squareFootage">Square footage</Label>
            <Input id="squareFootage" name="squareFootage" type="number" placeholder="48000" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="floors">Floors</Label>
            <Input id="floors" name="floors" type="number" placeholder="4" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <div>
            <h2 className="text-lg font-semibold">Tell us about your property</h2>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              The more context you provide, the sharper your RoboReady assessment. Answer what you can — everything is
              optional.
            </p>
          </div>
          {KNOWLEDGE_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Textarea
                id={field.key}
                value={details[field.key] ?? ""}
                onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={3}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Save & add files
        </Button>
      </div>
    </form>
  )
}

function StepHeader({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1 as const, label: "Property details" },
    { n: 2 as const, label: "Photos & files" },
  ]
  return (
    <ol className="flex items-center gap-3">
      {steps.map((s, i) => {
        const done = step > s.n
        const active = step === s.n
        return (
          <li key={s.n} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold " +
                  (done
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground")
                }
              >
                {done ? <Check className="h-4 w-4" /> : s.n}
              </span>
              <span className={"text-sm " + (active || done ? "font-medium text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {i === 0 && <span className="h-px w-8 bg-border" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
