"use client"

import { useState } from "react"
import { LocateFixed, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { PropertyFilter } from "@/lib/prospecting/filter"

/**
 * City / state / mileage-radius filter controls shared by all three funnel
 * queues. Mileage needs a reference point, which the operator sets from the
 * browser's geolocation or by typing coordinates; city/state work regardless.
 */
export function QueueFilterBar({
  value,
  onChange,
  count,
}: {
  value: PropertyFilter
  onChange: (v: PropertyFilter) => void
  count?: number
}) {
  const [locating, setLocating] = useState(false)

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ ...value, ref: { lat: pos.coords.latitude, lng: pos.coords.longitude } })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  const radiusActive = value.radiusMi != null && value.radiusMi > 0
  const radiusBlocked = radiusActive && !value.ref

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">City</Label>
          <Input
            value={value.city ?? ""}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="Any city"
            className="h-9 w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">State</Label>
          <Input
            value={value.region ?? ""}
            onChange={(e) => onChange({ ...value, region: e.target.value })}
            placeholder="Any state"
            className="h-9 w-32"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Within (mi)</Label>
          <Input
            type="number"
            min={0}
            value={value.radiusMi ?? ""}
            onChange={(e) => onChange({ ...value, radiusMi: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="Any"
            className="h-9 w-24"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating} className="h-9">
          <LocateFixed className="mr-1.5 h-3.5 w-3.5" />
          {value.ref ? "Location set" : locating ? "Locating…" : "Use my location"}
        </Button>
        {count != null ? (
          <span className="ml-auto self-center text-sm text-muted-foreground">
            {count} {count === 1 ? "match" : "matches"}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="number"
            step="any"
            value={value.ref?.lat ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                ref: { lat: e.target.value === "" ? 0 : Number(e.target.value), lng: value.ref?.lng ?? 0 },
              })
            }
            placeholder="ref lat"
            className="h-8 w-28"
            aria-label="Reference latitude"
          />
          <Input
            type="number"
            step="any"
            value={value.ref?.lng ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                ref: { lat: value.ref?.lat ?? 0, lng: e.target.value === "" ? 0 : Number(e.target.value) },
              })
            }
            placeholder="ref lng"
            className="h-8 w-28"
            aria-label="Reference longitude"
          />
        </div>
        {radiusBlocked ? (
          <span className="text-xs text-[var(--score-mid)]">Set a reference point to filter by distance.</span>
        ) : null}
      </div>
    </div>
  )
}
