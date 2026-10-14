import "server-only"

import { getToken } from "@vercel/connect"

export const AIRTABLE_CONNECTOR_UID = "airtable/acme-airtable"

export function getAirtableAppToken(): Promise<string> {
  return getToken(AIRTABLE_CONNECTOR_UID, {
    subject: { type: "app" },
    scopes: [],
  })
}
