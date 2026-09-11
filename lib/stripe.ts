import "server-only"

import Stripe from "stripe"

// The Stripe integration provisions STRIPE_SECRET_KEY. The stripe package pins
// its own API version; v22 uses the `embedded_page` ui_mode value.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
