"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { createProperty } from "@/app/actions/properties"

const PROPERTY_TYPES = [
  { value: "commercial", label: "Commercial / Office" },
  { value: "hospitality", label: "Hotel / Hospitality" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse / Logistics" },
  { value: "healthcare", label: "Healthcare" },
  { value: "residential", label: "Multi-family Residential" },
  { value: "campus", label: "Campus / Mixed-use" },
]

function num(v: FormDataEntryValue | null): number | null {
  const n = Number(v)
  return v === null || v === "" || Number.isNaN(n) ? null : n
}

export function PropertyForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState("commercial")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    })

    setLoading(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Property created")
    router.push(`/dashboard/properties/${res.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
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

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Create property
        </Button>
      </div>
    </form>
  )
}
