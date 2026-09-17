"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Globe, Radio, Send, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AmenityIcon } from "@/components/network/amenity-icon"
import { AvStatusPanel } from "@/components/network/av-status-panel"
import { NETWORK_AMENITIES, getAmenity } from "@/lib/network/amenities"
import { NETWORK_VISIBILITIES, VISIBILITY_HELP, VISIBILITY_LABELS, type NetworkVisibility } from "@/lib/network/visibility"
import { AV_EVENT_KINDS, type AvActivity, type AvEventKind } from "@/lib/tesla"
import { publishListing, recordAvEvent, refreshListingStatus, unpublishListing, type NetworkAdminState } from "@/app/actions/network"
import { cn } from "@/lib/utils"

export function NetworkListingPanel({ propertyId, state }: { propertyId: string; state: NetworkAdminState }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [visibility, setVisibility] = useState<NetworkVisibility>(state.visibility)
  const [headline, setHeadline] = useState(state.headline ?? "")
  const [blurb, setBlurb] = useState(state.blurb ?? "")
  const [enabled, setEnabled] = useState<Set<string>>(new Set(state.resolvedAmenities))
  const [liveStatus, setLiveStatus] = useState<AvActivity | null>(state.liveStatus)

  const derived = useMemo(() => new Set(state.derivedAmenities), [state.derivedAmenities])

  function toggleAmenity(id: string) {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function computeOverrides() {
    const added = [...enabled].filter((a) => !derived.has(a))
    const removed = [...derived].filter((a) => !enabled.has(a))
    return { added, removed }
  }

  function save(nextVisibility?: NetworkVisibility) {
    const vis = nextVisibility ?? visibility
    startTransition(async () => {
      const res = await publishListing(propertyId, {
        visibility: vis,
        headline,
        blurb,
        overrides: computeOverrides(),
      })
      if (res.ok) {
        setVisibility(vis)
        toast.success(vis === "none" ? "Saved as unlisted." : "Published to the network.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function unpublish() {
    startTransition(async () => {
      const res = await unpublishListing(propertyId)
      if (res.ok) {
        setVisibility("none")
        toast.success("Removed from the network.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  const listed = visibility !== "none"

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
        <Globe className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h2 className="font-semibold">Autonomous Ready Properties Network</h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            Publish this property to the RoboArrival network so it appears in the searchable directory and map. You
            control who can see it. RoboReady Score:{" "}
            <span className="font-medium text-foreground">{state.roboReadyScore ?? "not assessed"}</span>.
          </p>
        </div>
      </div>

      {/* Visibility */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Availability</label>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as NetworkVisibility)}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NETWORK_VISIBILITIES.map((v) => (
              <SelectItem key={v} value={v}>
                {VISIBILITY_LABELS[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{VISIBILITY_HELP[visibility]}</p>
      </section>

      {/* Amenities */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Wand2 className="size-4 text-primary" />
          <label className="text-sm font-medium">Amenities</label>
          <span className="text-xs text-muted-foreground">Auto-derived from intake — adjust as needed</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {NETWORK_AMENITIES.map((a) => {
            const on = enabled.has(a.id)
            const auto = derived.has(a.id)
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleAmenity(a.id)}
                title={auto ? "Auto-derived from intake" : "Manually added"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <AmenityIcon id={a.id} className="size-3.5" />
                {a.short}
                {auto ? <span className="ml-0.5 text-[9px] uppercase opacity-70">auto</span> : null}
              </button>
            )
          })}
        </div>
      </section>

      {/* Marketing copy */}
      <section className="grid gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="net-headline">
            Headline <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="net-headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Downtown CyberCab hub with rooftop vertiport"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="net-blurb">
            Description <span className="text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id="net-blurb"
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            placeholder="A short description shown on the network card."
            rows={3}
            maxLength={400}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => save()} disabled={pending}>
          {pending ? "Saving…" : listed ? "Save changes" : "Publish to network"}
        </Button>
        {listed ? (
          <Button variant="outline" onClick={unpublish} disabled={pending}>
            Remove from network
          </Button>
        ) : null}
      </div>

      {/* Live AV tracking */}
      <section className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Autonomous vehicle tracking</h3>
        </div>
        <p className="text-sm text-muted-foreground text-pretty">
          {state.tesla.connected
            ? `Live tracking via ${state.tesla.label}.`
            : "Tesla Fleet / Business tracking is wire-ready. Until it is connected, record arrivals manually below to demo live status."}
        </p>

        {listed ? (
          <>
            <AvStatusPanel status={liveStatus} />
            <ManualEvent
              propertyId={propertyId}
              disabled={pending}
              onRecorded={(s) => setLiveStatus(s)}
            />
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Publish this property to the network to record and track AV activity.
          </p>
        )}
      </section>
    </div>
  )
}

const KIND_LABELS: Record<AvEventKind, string> = {
  arriving: "Arriving",
  arrived: "Arrived (idle)",
  idle: "Idle on site",
  departing: "Departing",
  departed: "Departed (left)",
}

function ManualEvent({
  propertyId,
  disabled,
  onRecorded,
}: {
  propertyId: string
  disabled: boolean
  onRecorded: (status: AvActivity) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [kind, setKind] = useState<AvEventKind>("arriving")
  const [vehicleRef, setVehicleRef] = useState("")
  const [label, setLabel] = useState("")

  function record() {
    if (!vehicleRef.trim()) {
      toast.error("Enter a vehicle reference.")
      return
    }
    startTransition(async () => {
      const res = await recordAvEvent(propertyId, { kind, vehicleRef, label: label || undefined })
      if (res.ok) {
        onRecorded(res.data.liveStatus)
        setVehicleRef("")
        setLabel("")
        toast.success("AV event recorded.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function refresh() {
    startTransition(async () => {
      const res = await refreshListingStatus(propertyId)
      if (res.ok) {
        onRecorded(res.data.liveStatus)
        toast.success("Status refreshed.")
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Record a manual AV event</p>
      <div className="grid gap-2 sm:grid-cols-[9rem_1fr_1fr]">
        <Select value={kind} onValueChange={(v) => setKind(v as AvEventKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AV_EVENT_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={vehicleRef} onChange={(e) => setVehicleRef(e.target.value)} placeholder="Vehicle ref (e.g. CYBERCAB-07)" />
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={record} disabled={disabled || pending} className="gap-1.5">
          <Send className="size-3.5" /> Record event
        </Button>
        <Button size="sm" variant="outline" onClick={refresh} disabled={disabled || pending}>
          Refresh status
        </Button>
      </div>
    </div>
  )
}
