"use client"

import { AMENITY_GROUP_LABELS, NETWORK_AMENITIES, type AmenityGroup } from "@/lib/network/amenities"
import { AmenityIcon } from "@/components/network/amenity-icon"
import { cn } from "@/lib/utils"

const GROUP_ORDER: AmenityGroup[] = ["arrival", "charging", "air", "robotics", "accessibility", "delivery", "energy"]

export function AmenityFilter({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (id: string) => void
}) {
  const set = new Set(selected)
  return (
    <div className="space-y-4">
      {GROUP_ORDER.map((group) => {
        const items = NETWORK_AMENITIES.filter((a) => a.group === group)
        if (items.length === 0) return null
        return (
          <div key={group}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {AMENITY_GROUP_LABELS[group]}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((a) => {
                const active = set.has(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(a.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <AmenityIcon id={a.id} className="size-3.5" />
                    {a.short}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
