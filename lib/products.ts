// Source of truth for RoboReady's fixed-price SKUs. Prices are placeholders you
// can edit; the server always charges the amount defined here (or, for a
// proposal deposit, the amount computed server-side from the stored proposal),
// never a value sent by the client.

export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
}

export const PRODUCTS: Product[] = [
  {
    id: "readiness-assessment",
    name: "RoboReady Assessment",
    description:
      "Full autonomous-readiness assessment: RoboReady Score, findings, site concept, and infrastructure plan.",
    priceInCents: 250000, // $2,500.00 — placeholder, edit in lib/products.ts
  },
]

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

// Default deposit rate applied to a proposal subtotal when a client accepts.
// Editable placeholder; stored per-proposal so historical proposals are stable.
export const DEFAULT_DEPOSIT_RATE = 0.1
