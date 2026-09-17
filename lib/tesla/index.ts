// Tesla telemetry provider factory. Picks the live Tesla Fleet / Tesla for
// Business provider when a credential is present, otherwise the manual/mock
// provider. Same pattern as the AI adapter's createRuntime() — feature code
// calls createTeslaAdapter() and never branches on which provider it got.

import { MockTeslaProvider } from "./mock-provider"
import { TeslaFleetProvider } from "./fleet-provider"
import type { TeslaFleetAdapter } from "./adapter"

export * from "./adapter"
export { MockTeslaProvider } from "./mock-provider"
export { TeslaFleetProvider, TeslaNotConfiguredError } from "./fleet-provider"

/** Reads the (optional) Tesla credentials from the environment. */
function readTeslaEnv(): { fleet?: string; business?: string } {
  return {
    fleet: process.env.TESLA_FLEET_TOKEN || undefined,
    business: process.env.TESLA_BUSINESS_TOKEN || undefined,
  }
}

export type TeslaIntegrationStatus = {
  connected: boolean
  source: "tesla_fleet" | "tesla_business" | "manual"
  label: string
}

/** Describes the currently-selected provider for UI ("Live" vs "Manual"). */
export function teslaIntegrationStatus(): TeslaIntegrationStatus {
  const { fleet, business } = readTeslaEnv()
  if (fleet) return { connected: true, source: "tesla_fleet", label: "Tesla Fleet API" }
  if (business) return { connected: true, source: "tesla_business", label: "Tesla for Business" }
  return { connected: false, source: "manual", label: "Manual / demo" }
}

/**
 * Returns the active Tesla telemetry adapter. Live provider when a token is
 * configured; the manual/mock provider otherwise. Wire-ready: connecting Tesla
 * later is purely an env change, no code change at the call sites.
 */
export function createTeslaAdapter(): TeslaFleetAdapter {
  const { fleet, business } = readTeslaEnv()
  if (fleet) return new TeslaFleetProvider(fleet, "fleet")
  if (business) return new TeslaFleetProvider(business, "business")
  return new MockTeslaProvider()
}
