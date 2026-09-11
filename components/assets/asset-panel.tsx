"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addAsset, deleteAsset, setAssetStatus } from "@/app/actions/assets"
import { ASSET_TYPES } from "@/lib/assets/types"
import { AssetMap, type MapAsset } from "@/components/assets/asset-map"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Check, Plus, Trash2 } from "lucide-react"

type Asset = MapAsset & { quantity: number; unitCost: string | null }

const TYPE_LABELS: Record<string, string> = {
  "ev-charger": "EV charger",
  "robot-charger": "Robot charger",
  "landing-pad": "Landing pad",
  "drone-pad": "Drone pad",
  sensor: "Sensor",
  beacon: "Beacon",
}

export function AssetPanel({
  propertyId,
  centerLat,
  centerLng,
  initialAssets,
}: {
  propertyId: string
  centerLat: number | null
  centerLng: number | null
  initialAssets: Asset[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [assetType, setAssetType] = useState<string>("ev-charger")
  const [label, setLabel] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [unitCost, setUnitCost] = useState<string>("")

  const total = initialAssets.reduce((sum, a) => sum + (a.unitCost ? Number(a.unitCost) * a.quantity : 0), 0)

  function submit() {
    if (!label.trim()) {
      toast.error("Give the asset a label.")
      return
    }
    startTransition(async () => {
      const res = await addAsset({
        propertyId,
        assetType,
        label,
        quantity,
        unitCost: unitCost === "" ? null : Number(unitCost),
      })
      if (res.ok) {
        toast.success("Asset added")
        setLabel("")
        setQuantity(1)
        setUnitCost("")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function approve(id: string) {
    startTransition(async () => {
      await setAssetStatus(id, "planned")
      toast.success("Asset confirmed")
      router.refresh()
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteAsset(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <AssetMap
        centerLat={centerLat}
        centerLng={centerLng}
        assets={initialAssets}
        onPlaced={() => router.refresh()}
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-sm font-medium">Add infrastructure asset</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs">Type</Label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs">Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Lobby charging bay" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Qty</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Unit cost ($)</Label>
            <Input
              type="number"
              min={0}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={submit} disabled={pending}>
            <Plus className="mr-1.5 h-4 w-4" /> Add asset
          </Button>
        </div>
      </div>

      {initialAssets.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Asset</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Est. cost</th>
                <th className="px-4 py-2 text-right font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialAssets.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2.5 font-medium">{a.label}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{TYPE_LABELS[a.assetType] ?? a.assetType}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.quantity}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {a.unitCost ? `$${(Number(a.unitCost) * a.quantity).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge variant={a.status === "proposed" ? "outline" : "secondary"} className="capitalize">
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {a.status === "proposed" ? (
                        <button
                          onClick={() => approve(a.id)}
                          disabled={pending}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          aria-label="Confirm asset"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => remove(a.id)}
                        disabled={pending}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete asset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-muted/30">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-right text-xs uppercase tracking-wide text-muted-foreground">
                  Estimated total
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">${total.toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No assets yet. Run an assessment to get AI recommendations, or add them manually.
        </p>
      )}
    </div>
  )
}
