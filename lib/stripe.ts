import "server-only"

import Stripe from "stripe"

// The Stripe integration provisions STRIPE_SECRET_KEY. The stripe package pins
// its own API version; v22 uses the `embedded_page` ui_mode value.
//
// Instantiated lazily so importing this module never throws at load time. The
// production build's page-data collection evaluates the server-action module
// graph, and a top-level `new Stripe(undefined)` would crash the whole build
// when the key isn't present in that step. Callers still use `stripe.<api>` as
// before; the real client is created on first property access and only errors
// (as Stripe itself would) if actually used without a key.
let client: Stripe | null = null

function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY as string)
  }
  return client
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver)
  },
}) as Stripe
