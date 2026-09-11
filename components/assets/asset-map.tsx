"use client"

import { useRef, useState } from "react"
import { updateAssetPlacement } from "@/app/actions/assets"
import { cn } from "@/lib/utils"
import { BatteryCharging, Plane, Radio, Radar, Bot, MapPin } from "lucide-react"

const ASSET_ICON: Record<string, typeof BatteryCharging> = {
  "ev-charger": BatteryCharging,
  "robot-charger": Bot,
  "landing-pad": Plane,
  "drone-pad": Plane,
  sensor: Radar,
  beacon: Radio,
}

export type MapAsset = {
  id: string
  label: string
  assetType: string
  latitude: number | null
  longitude: number | null
  status: string
}

/**
 * Provider-agnostic satellite + marker map. Instead of binding to a specific
 * maps SDK, it renders a normalized plot area around the property center and
 * positions markers by their offset from that center. Markers are draggable to
 * set an approximate placement; drops persist as lat/long deltas. Swapping in a
 * real tile provider later only changes the background layer.
 */
export function AssetMap({
  centerLat,
  centerLng,
  assets,
  onPlaced,
}: {
  centerLat: number | null
  centerLng: number | null
  assets: MapAsset[]
  onPlaced?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<string, { xPct: number; yPct: number }>>(() => {
    const seed: Record<string, { xPct: number; yPct: number }> = {}
    assets.forEach((a, i) => {
      if (a.latitude != null && a.longitude != null && centerLat != null && centerLng != null) {
        // ~0.0025 deg window maps to the full plot; clamp to 8%-92%.
        const xPct = clamp(50 + ((a.longitude - centerLng) / 0.0025) * 50, 8, 92)
        const yPct = clamp(50 - ((a.latitude - centerLat) / 0.0025) * 50, 8, 92)
        seed[a.id] = { xPct, yPct }
      } else {
        // Unplaced assets: distribute around the center in a ring.
        const angle = (i / Math.max(1, assets.length)) * Math.PI * 2
        seed[a.id] = { xPct: 50 + Math.cos(angle) * 28, yPct: 50 + Math.sin(angle) * 28 }
      }
    })
    return seed
  })

  function onDrop(id: string, clientX: number, clientY: number) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const xPct = clamp(((clientX - rect.left) / rect.width) * 100, 4, 96)
    const yPct = clamp(((clientY - rect.top) / rect.height) * 100, 4, 96)
    setPositions((p) => ({ ...p, [id]: { xPct, yPct } }))

    if (centerLat != null && centerLng != null) {
      const lng = centerLng + ((xPct - 50) / 50) * 0.0025
      const lat = centerLat - ((yPct - 50) / 50) * 0.0025
      updateAssetPlacement(id, lat, lng).then(() => onPlaced?.())
    }
  }

  return (
    <div
      ref={ref}
      className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border"
      style={{
        backgroundColor: "oklch(0.28 0.03 250)",
        backgroundImage:
          "radial-gradient(circle at 30% 40%, oklch(0.34 0.04 160 / 0.6), transparent 45%), radial-gradient(circle at 70% 65%, oklch(0.3 0.03 250 / 0.7), transparent 40%), repeating-linear-gradient(0deg, oklch(1 0 0 / 0.04) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, oklch(1 0 0 / 0.04) 0 1px, transparent 1px 40px)",
      }}
    >
      {/* property center marker */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center gap-1">
          <MapPin className="h-5 w-5 text-white/70" />
          <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/80">Property</span>
        </div>
      </div>

      {assets.map((a) => {
        const pos = positions[a.id] ?? { xPct: 50, yPct: 50 }
        const Icon = ASSET_ICON[a.assetType] ?? Bot
        return (
          <button
            key={a.id}
            draggable
            onDragEnd={(e) => onDrop(a.id, e.clientX, e.clientY)}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center gap-1 active:cursor-grabbing",
            )}
            style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
            title={`${a.label} — drag to place`}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg",
                a.status === "proposed" ? "border-dashed border-white/60 bg-black/40" : "border-primary bg-primary",
              )}
            >
              <Icon className={cn("h-4 w-4", a.status === "proposed" ? "text-white/80" : "text-primary-foreground")} />
            </span>
            <span className="max-w-[90px] truncate rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
              {a.label}
            </span>
          </button>
        )
      })}

      <p className="absolute bottom-2 left-2 rounded bg-black/40 px-2 py-1 text-[10px] text-white/70">
        Drag markers to place · satellite view
      </p>
    </div>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
