"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Loader2, Lock, MapPinned, Search, SlidersHorizontal, Sparkles, X } from "lucide-react"
import type { NetworkListingView } from "@/lib/network/data"
import { runNetworkSearch, type NetworkSearchHit } from "@/app/actions/network-search"
import { getAmenity } from "@/lib/network/amenities"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AmenityFilter } from "@/components/network/amenity-filter"
import { ListingCard } from "@/components/network/listing-card"
import { cn } from "@/lib/utils"

const NetworkMap = dynamic(() => import("@/components/network/network-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted" />,
})

const AI_EXAMPLES = [
  "Hotels near Dallas with fast EV charging and robotaxi pickup",
  "High-scoring sites cleared for humanoid robots",
  "Properties with air-taxi landing pads and ADA loading",
]

export function NetworkExplorer({
  listings,
  signedIn,
  isCarePlan,
  aiEnabled = false,
  upgradeHref = "/dashboard/properties",
}: {
  listings: NetworkListingView[]
  signedIn: boolean
  isCarePlan: boolean
  /** RoboSearch (AI natural-language search) — unlocks at the Quality Pro tier. */
  aiEnabled?: boolean
  upgradeHref?: string
}) {
  const [q, setQ] = useState("")
  const [amenities, setAmenities] = useState<string[]>([])
  const [match, setMatch] = useState<"and" | "or">("and")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // RoboSearch state.
  const [aiQuery, setAiQuery] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [ai, setAi] = useState<{
    interpretation: string
    understood: string[]
    hits: NetworkSearchHit[]
  } | null>(null)

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

  async function submitAiSearch() {
    const query = aiQuery.trim()
    if (query.length < 2 || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    setSelectedId(null)
    try {
      const res = await runNetworkSearch(query)
      if (res.ok) {
        setAi({ interpretation: res.interpretation, understood: res.understoodAmenities, hits: res.hits })
      } else {
        setAi(null)
        setAiError(res.message)
      }
    } catch {
      setAi(null)
      setAiError("AI search is unavailable right now. Please try again.")
    } finally {
      setAiLoading(false)
    }
  }

  function clearAiSearch() {
    setAi(null)
    setAiError(null)
    setAiQuery("")
    setSelectedId(null)
  }

  const aiActive = ai !== null
  const displayList = aiActive ? ai!.hits.map((h) => h.listing) : filtered
  const reasonById = useMemo(
    () => (aiActive ? new Map(ai!.hits.map((h) => [h.listing.id, h.reason])) : new Map<string, string>()),
    [aiActive, ai],
  )

  return (
    <div className="space-y-4">
      {/* RoboSearch — AI natural-language search (premium, Quality Pro+) */}
      {aiEnabled ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submitAiSearch()
          }}
          className="rounded-xl border border-primary/30 bg-primary/5 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">RoboSearch</span>
            <span className="text-xs text-muted-foreground">AI search · Quality Pro</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
              }}
              placeholder="Describe what you're looking for, in plain English"
              className="flex-1 bg-background"
              aria-label="Describe what you're looking for"
              disabled={aiLoading}
            />
            <Button type="submit" className="gap-2 sm:w-32" disabled={aiLoading || aiQuery.trim().length < 2}>
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {aiLoading ? "Searching" : "Search"}
            </Button>
          </div>
          {!aiActive && !aiLoading ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AI_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setAiQuery(ex)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          ) : null}
          {aiError ? <p className="mt-2 text-xs text-destructive">{aiError}</p> : null}
        </form>
      ) : (
        <AiUpsell signedIn={signedIn} upgradeHref={upgradeHref} />
      )}

      {/* AI interpretation banner */}
      {aiActive ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm text-foreground text-pretty">{ai!.interpretation}</p>
              {ai!.understood.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {ai!.understood.map((id) => (
                    <span
                      key={id}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {getAmenity(id)?.short ?? id}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={clearAiSearch}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" /> Clear
          </button>
        </div>
      ) : null}

      {/* Keyword + amenity controls (hidden while AI results are showing) */}
      {!aiActive ? (
        <>
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
        </>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {aiActive
          ? `${displayList.length} AI ${displayList.length === 1 ? "match" : "matches"}`
          : `${filtered.length} ${filtered.length === 1 ? "property" : "properties"} in the network`}
      </p>

      {listings.length === 0 ? (
        <EmptyState signedIn={signedIn} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="order-2 h-[420px] lg:order-1 lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
            <NetworkMap listings={displayList} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="order-1 space-y-3 lg:order-2">
            {displayList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {aiActive
                  ? "RoboSearch found no matching properties. Try describing it differently."
                  : "No properties match your filters. Try removing a few amenities."}
              </div>
            ) : (
              displayList.map((l) => (
                <div key={l.id} className="space-y-1.5">
                  <ListingCard listing={l} selected={l.id === selectedId} onSelect={setSelectedId} />
                  {aiActive && reasonById.get(l.id) ? (
                    <p className="flex items-start gap-1.5 px-1 text-xs text-muted-foreground text-pretty">
                      <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
                      <span>{reasonById.get(l.id)}</span>
                    </p>
                  ) : null}
                </div>
              ))
            )}
            {!isCarePlan && !aiActive ? <UpgradeBanner signedIn={signedIn} /> : null}
          </div>
        </div>
      )}
    </div>
  )
}

function AiUpsell({ signedIn, upgradeHref }: { signedIn: boolean; upgradeHref: string }) {
  return (
    <Link
      href={signedIn ? upgradeHref : "/sign-in"}
      className="flex items-start gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/50"
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Sparkles className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">
          RoboSearch — AI search in plain English
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary align-middle">
            <Lock className="size-3" /> Quality Pro
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
          Describe what you need — “hotels near Dallas with fast EV charging and robotaxi pickup” — and let the AI rank
          the network for you. Unlocks with a Quality Pro Report or higher.
        </p>
      </div>
    </Link>
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
