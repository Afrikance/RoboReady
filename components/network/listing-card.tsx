"use client"

import { ArrowDownToLine, CircleParking, MapPin, Navigation } from "lucide-react"
import type { NetworkListingView } from "@/lib/network/data"
import { getAmenity } from "@/lib/network/amenities"
import { scoreBand } from "@/components/score/score-gauge"
import { AmenityIcon } from "@/components/network/amenity-icon"
import { cn } from "@/lib/utils"

const BAND_COLOR: Record<string, string> = {
  high: "var(--score-high)",
  mid: "var(--score-mid)",
  low: "var(--score-low)",
  empty: "var(--muted-foreground)",
}

function directionsHref(l: NetworkListingView): string {
  const dest = l.latitude != null && l.longitude != null ? `${l.latitude},${l.longitude}` : l.address || l.name
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`
}

export function ListingCard({
  listing,
  selected,
  onSelect,
}: {
  listing: NetworkListingView
  selected?: boolean
  onSelect?: (id: string) => void
}) {
  const band = scoreBand(listing.roboReadyScore)
  const color = BAND_COLOR[band]
  const live = listing.liveStatus
  const arriving = live?.arriving ?? 0
  const idle = live?.idle ?? 0

  return (
    <article
      onClick={() => onSelect?.(listing.id)}
      className={cn(
        "flex cursor-pointer flex-col rounded-lg border bg-card p-4 transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-pretty">{listing.name}</h3>
          {listing.address ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{listing.address}</span>
            </p>
          ) : null}
        </div>
        <div
          className="flex shrink-0 flex-col items-center rounded-md border border-border px-2 py-1"
          style={{ color }}
          title="RoboReady Score"
        >
          <span className="font-mono text-lg font-semibold leading-none tabular-nums">
            {listing.roboReadyScore ?? "—"}
          </span>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">score</span>
        </div>
      </div>

      {listing.headline ? (
        <p className="mt-2 text-sm text-muted-foreground text-pretty">{listing.headline}</p>
      ) : null}

      {listing.amenities.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {listing.amenities.slice(0, 6).map((id) => {
            const a = getAmenity(id)
            if (!a) return null
            return (
              <li
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
              >
                <AmenityIcon id={id} className="size-3" />
                {a.short}
              </li>
            )
          })}
          {listing.amenities.length > 6 ? (
            <li className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              +{listing.amenities.length - 6}
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {arriving > 0 ? (
            <span className="flex items-center gap-1 text-[var(--score-high)]">
              <ArrowDownToLine className="size-3.5" /> {arriving} arriving
            </span>
          ) : null}
          {idle > 0 ? (
            <span className="flex items-center gap-1">
              <CircleParking className="size-3.5" /> {idle} idle
            </span>
          ) : null}
          {arriving === 0 && idle === 0 ? <span>No AVs on site</span> : null}
        </div>
        <a
          href={directionsHref(listing)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Navigation className="size-3.5" /> Directions
        </a>
      </div>
    </article>
  )
}
