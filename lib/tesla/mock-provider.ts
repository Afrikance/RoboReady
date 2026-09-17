// Manual / demo AV-telemetry provider. Derives a site's live status from the
// events recorded in network_av_event (admin "record AV event" today). This is
// the "manual use" path that works before the Tesla API is connected. It is
// deterministic — the same events always yield the same snapshot — and never
// claims to be a live Tesla feed (`live: false`).

import { summarizeAvEvents, type AvActivity, type AvEventInput, type TeslaFleetAdapter } from "./adapter"

export class MockTeslaProvider implements TeslaFleetAdapter {
  readonly source = "manual" as const
  readonly live = false

  async getSiteActivity({ listingId, events = [] }: { listingId: string; events?: AvEventInput[] }): Promise<AvActivity> {
    return summarizeAvEvents(listingId, events, { source: this.source, live: this.live })
  }
}
