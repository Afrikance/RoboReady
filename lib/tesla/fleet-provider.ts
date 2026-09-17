// Live Tesla provider — wired but inert until credentials exist. When a
// TESLA_FLEET_TOKEN / TESLA_BUSINESS_TOKEN (or a satellite-tracking key) is
// present, the factory in ./index selects this provider and getSiteActivity
// will call the real Tesla Fleet / Tesla for Business telemetry endpoints to
// resolve which AVs are arriving, departing, or idling at a site.
//
// No secrets are invented here: without a token this class is never
// instantiated, and if it is reached without a working connection it throws
// TeslaNotConfiguredError so callers fall back to the recorded (manual) events.

import type { AvActivity, AvEventInput, AvEventSource, TeslaFleetAdapter } from "./adapter"

export class TeslaNotConfiguredError extends Error {
  constructor(message = "Tesla live telemetry is not connected yet.") {
    super(message)
    this.name = "TeslaNotConfiguredError"
  }
}

export type TeslaFleetMode = "fleet" | "business"

export class TeslaFleetProvider implements TeslaFleetAdapter {
  readonly source: AvEventSource
  readonly live = true

  constructor(
    private readonly token: string,
    mode: TeslaFleetMode,
  ) {
    this.source = mode === "business" ? "tesla_business" : "tesla_fleet"
  }

  async getSiteActivity(_input: { listingId: string; events?: AvEventInput[] }): Promise<AvActivity> {
    // Real implementation lands when the Tesla Fleet / Business telemetry
    // contract is available. The shape is already defined by AvActivity, so the
    // swap is local to this method:
    //
    //   const res = await fetch(`${TESLA_FLEET_BASE}/sites/${siteId}/telemetry`, {
    //     headers: { Authorization: `Bearer ${this.token}` },
    //   })
    //   ...map Tesla vehicle telemetry into AvVehicle[] and counts...
    //
    // Until then, refuse loudly so the caller uses recorded events instead of
    // presenting fabricated live data.
    throw new TeslaNotConfiguredError()
  }
}
