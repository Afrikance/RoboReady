"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Lock, MapPinned, Search, SlidersHorizontal, Sparkles, X } from "lucide-react"
import type { NetworkListingView } from "@/lib/network/data"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AmenityFilter } from "@/components/network/amenity-filter"
import { ListingCard } from "@/components/network/listing-card"
import { cn } from "@/lib/utils"

const NetworkMap = dynamic(() => import("@/components/network/network-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted" />,
})

export function NetworkExplorer({
  listings,
  signedIn,
  isCarePlan,
}: {
  listings: NetworkListingView[]
  signedIn: boolean
  isCarePlan: boolean
}) {
  const [q, setQ] = useState("")
  const [amenities, setAmenities] = useState<string[]>([])
  const [match, setMatch] = useState<"and" | "or">("and")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let out = listings
    if (amenities.length > 0) {
      out = out.filter((l) => {
        const have = new Set(l.amenities)
        return match === "and" ? amenities.every((a) => have.has(a as never)) : amenities.some((a) => have.has(a as never))
      })
    }
    const query = q.trim().toLowerCase()
    if (query) {
      out = out.filter((l) =>
        [l.name, l.address, l.headline, l.city, l.region].filter(Boolean).some((s) => s!.toLowerCase().includes(query)),
      )
    }
    return out
  }, [listings, amenities, match, q])

  function toggleAmenity(id: string) {
    setAmenities((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-4">
      {/* Search + filter controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, city, or address"
            className="pl-9"
            aria-label="Search the network"
          />
        </div>
        <Button
          type="button"
          variant={showFilters || amenities.length > 0 ? "default" : "outline"}
          onClick={() => setShowFilters((s) => !s)}
          className="gap-2"
        >
          <SlidersHorizontal className="size-4" />
          Amenities
          {amenities.length > 0 ? (
            <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary-foreground/20 text-xs">
              {amenities.length}
            </span>
          ) : null}
        </Button>
      </div>

      {showFilters ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs" role="tablist" aria-label="Match mode">
              {(["and", "or"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={match === m}
                  onClick={() => setMatch(m)}
                  className={cn(
                    "rounded px-2.5 py-1 font-medium transition-colors",
                    match === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "and" ? "Match all" : "Match any"}
                </button>
              ))}
            </div>
            {amenities.length > 0 ? (
              <button
                onClick={() => setAmenities([])}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" /> Clear
              </button>
            ) : null}
          </div>
          <AmenityFilter selected={amenities} onToggle={toggleAmenity} />
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "property" : "properties"} in the network
      </p>

      {listings.length === 0 ? (
        <EmptyState signedIn={signedIn} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="order-2 h-[420px] lg:order-1 lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
            <NetworkMap listings={filtered} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="order-1 space-y-3 lg:order-2">
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No properties match your filters. Try removing a few amenities.
              </div>
            ) : (
              filtered.map((l) => (
                <ListingCard key={l.id} listing={l} selected={l.id === selectedId} onSelect={setSelectedId} />
              ))
            )}
            {!isCarePlan ? <UpgradeBanner signedIn={signedIn} /> : null}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
      <MapPinned className="mb-3 size-8 text-muted-foreground" />
      <p className="text-sm font-medium">No properties are listed here yet</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
        Assessed properties appear here once published to the network.
        {!signedIn ? " Sign in to see members-only sites as they come online." : null}
      </p>
    </div>
  )
}

function UpgradeBanner({ signedIn }: { signedIn: boolean }) {
  return signedIn ? (
    <Link
      href="/dashboard/properties"
      className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/50"
    >
      <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-medium">RoboArrival Care Plan unlocks more of the network</p>
        <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
          Care Plan members see gated sites and live AV arrival tracking. Manage plans from your properties.
        </p>
      </div>
    </Link>
  ) : (
    <Link
      href="/sign-in"
      className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/50"
    >
      <Lock className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-medium">Sign in to see more of the network</p>
        <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
          Signed-in members and RoboArrival Care Plan subscribers can access additional listings and live tracking.
        </p>
      </div>
    </Link>
  )
}
