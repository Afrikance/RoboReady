// The Tesla AV-telemetry boundary. Every request for a property's live AV
// arrival/departure activity goes through this interface, so the provider
// (manual/mock now, the real Tesla Fleet / Tesla for Business / satellite API
// later) can be swapped without touching feature code. This mirrors the
// StaffGPTAdapter seam used for the AI workforce.
//
// Client-safe: types + the pure event reducer only. The provider factory that
// reads env lives in ./index.

export type AvEventKind = "arriving" | "departing" | "idle" | "arrived" | "departed"

export type AvEventSource = "manual" | "tesla_fleet" | "tesla_business" | "satellite"

export const AV_EVENT_KINDS: readonly AvEventKind[] = ["arriving", "departing", "idle", "arrived", "departed"]

export function isAvEventKind(v: unknown): v is AvEventKind {
  return typeof v === "string" && (AV_EVENT_KINDS as readonly string[]).includes(v)
}

/** A single logged AV movement, from a manual entry or a Tesla API webhook. */
export type AvEventInput = {
  vehicleRef: string
  kind: AvEventKind
  occurredAt: Date | string
  source?: AvEventSource
  label?: string
}

/** Current resolved state of one vehicle at a site. */
export type AvVehicleState = "arriving" | "departing" | "idle"

export type AvVehicle = {
  ref: string
  state: AvVehicleState
  label?: string
  /** ISO timestamp of the event that put the vehicle in this state. */
  since: string
}

/** The activity snapshot a listing shows. */
export type AvActivity = {
  listingId: string
  arriving: number
  departing: number
  idle: number
  vehicles: AvVehicle[]
  /** Which provider produced this snapshot. */
  source: string
  /** ISO timestamp of the snapshot. */
  at: string
  /** True only when backed by a live Tesla connection (never for mock/manual). */
  live: boolean
}

export interface TeslaFleetAdapter {
  /** manual | tesla_fleet | tesla_business | satellite */
  readonly source: AvEventSource
  /** Whether this adapter is backed by a live Tesla connection. */
  readonly live: boolean
  /**
   * Returns the current AV activity for a site. Implementations may derive it
   * from the supplied recorded events (mock/manual) or from a live API call
   * (Tesla Fleet/Business). Must throw on a connection failure.
   */
  getSiteActivity(input: { listingId: string; events?: AvEventInput[] }): Promise<AvActivity>
}

function toTime(v: Date | string): number {
  return v instanceof Date ? v.getTime() : new Date(v).getTime()
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString()
}

/**
 * Pure reducer: collapses an append-only event log into a per-site activity
 * snapshot by taking the latest event per vehicle. A vehicle whose latest event
 * is `departed` has left the site and is dropped. Deterministic — the mock
 * provider and any future replay tooling share this.
 */
export function summarizeAvEvents(
  listingId: string,
  events: AvEventInput[],
  meta: { source: AvEventSource; live: boolean; at?: Date | string },
): AvActivity {
  const latestByVehicle = new Map<string, AvEventInput>()
  for (const e of events) {
    if (!isAvEventKind(e.kind) || !e.vehicleRef) continue
    const prev = latestByVehicle.get(e.vehicleRef)
    if (!prev || toTime(e.occurredAt) >= toTime(prev.occurredAt)) {
      latestByVehicle.set(e.vehicleRef, e)
    }
  }

  const vehicles: AvVehicle[] = []
  for (const e of latestByVehicle.values()) {
    let state: AvVehicleState
    if (e.kind === "arriving") state = "arriving"
    else if (e.kind === "departing") state = "departing"
    else if (e.kind === "idle" || e.kind === "arrived") state = "idle"
    else continue // departed → gone
    vehicles.push({ ref: e.vehicleRef, state, label: e.label, since: toIso(e.occurredAt) })
  }

  vehicles.sort((a, b) => new Date(b.since).getTime() - new Date(a.since).getTime())

  return {
    listingId,
    arriving: vehicles.filter((v) => v.state === "arriving").length,
    departing: vehicles.filter((v) => v.state === "departing").length,
    idle: vehicles.filter((v) => v.state === "idle").length,
    vehicles,
    source: meta.source,
    at: toIso(meta.at ?? new Date()),
    live: meta.live,
  }
}
