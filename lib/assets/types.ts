export const ASSET_TYPES = [
  "robotaxi-stand",
  "pudo-zone",
  "ev-charger",
  "robot-charger",
  "landing-pad",
  "drone-pad",
  "sensor",
  "beacon",
] as const

export type AssetType = (typeof ASSET_TYPES)[number]
