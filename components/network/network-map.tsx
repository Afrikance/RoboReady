"use client"

import { useEffect, useMemo } from "react"
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import type { NetworkListingView } from "@/lib/network/data"
import { scoreBand } from "@/components/score/score-gauge"

const BAND_HEX: Record<string, string> = {
  // Approximate the oklch score tokens as hex for the leaflet canvas markers.
  high: "#3fae6b",
  mid: "#d9a441",
  low: "#d1503f",
  empty: "#8a94a6",
}

type MapListing = NetworkListingView & { latitude: number; longitude: number }

function hasCoords(l: NetworkListingView): l is MapListing {
  return l.latitude != null && l.longitude != null
}

/** Recenters the map when the selected listing changes. */
function FlyToSelected({ listing }: { listing: MapListing | null }) {
  const map = useMap()
  useEffect(() => {
    if (listing) map.flyTo([listing.latitude, listing.longitude], Math.max(map.getZoom(), 12), { duration: 0.6 })
  }, [listing, map])
  return null
}

export default function NetworkMap({
  listings,
  selectedId,
  onSelect,
}: {
  listings: NetworkListingView[]
  selectedId: string | null
  onSelect?: (id: string) => void
}) {
  const points = useMemo(() => listings.filter(hasCoords), [listings])

  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) return [39.5, -98.35] // continental US
    const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length
    const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length
    return [lat, lng]
  }, [points])

  const selected = points.find((p) => p.id === selectedId) ?? null

  return (
    <MapContainer
      center={center}
      zoom={points.length ? 5 : 4}
      scrollWheelZoom
      className="h-full w-full rounded-lg"
      style={{ background: "var(--muted)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected listing={selected} />
      {points.map((p) => {
        const hex = BAND_HEX[scoreBand(p.roboReadyScore)]
        const active = p.id === selectedId
        return (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={active ? 11 : 8}
            pathOptions={{
              color: hex,
              fillColor: hex,
              fillOpacity: active ? 0.9 : 0.65,
              weight: active ? 3 : 2,
            }}
            eventHandlers={{ click: () => onSelect?.(p.id) }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{p.name}</p>
                {p.address ? <p className="text-xs text-muted-foreground">{p.address}</p> : null}
                <p className="text-xs">
                  RoboReady Score: <span className="font-semibold">{p.roboReadyScore ?? "—"}</span>
                </p>
                <p className="text-xs text-muted-foreground">{p.amenities.length} autonomous amenities</p>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
