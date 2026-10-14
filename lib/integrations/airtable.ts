import "server-only"

import { getToken } from "@vercel/connect"

export const AIRTABLE_CONNECTOR_UID = "airtable/acme-airtable"
export const ROBOTICS_CRM_BASE_NAME = "RoboReady/Humanoid Robotics CRM"

export function getAirtableAppToken(scopes: string[] = []): Promise<string> {
  return getToken(AIRTABLE_CONNECTOR_UID, {
    subject: { type: "app" },
    scopes,
  })
}

export async function getRoboticsCrmSchema() {
  const token = await getAirtableAppToken(["schema.bases:read"])
  const headers = { Authorization: `Bearer ${token}` }

  const basesResponse = await fetch("https://api.airtable.com/v0/meta/bases", {
    headers,
    cache: "no-store",
  })
  if (!basesResponse.ok) {
    throw new AirtableApiError(basesResponse.status)
  }

  const basesPayload: unknown = await basesResponse.json()
  const bases = isRecord(basesPayload) && Array.isArray(basesPayload.bases) ? basesPayload.bases : []
  const base = bases.find(
    (candidate) =>
      isRecord(candidate) &&
      typeof candidate.name === "string" &&
      candidate.name.trim().toLocaleLowerCase() === ROBOTICS_CRM_BASE_NAME.toLocaleLowerCase(),
  )

  if (!isRecord(base) || typeof base.id !== "string" || typeof base.name !== "string") {
    return { base: null, tables: [] }
  }

  const schemaResponse = await fetch(
    `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(base.id)}/tables`,
    { headers, cache: "no-store" },
  )
  if (!schemaResponse.ok) {
    throw new AirtableApiError(schemaResponse.status)
  }

  const schemaPayload: unknown = await schemaResponse.json()
  const tables = isRecord(schemaPayload) && Array.isArray(schemaPayload.tables) ? schemaPayload.tables : []

  return {
    base: { id: base.id, name: base.name },
    tables: tables.flatMap((table) => {
      if (!isRecord(table) || typeof table.id !== "string" || typeof table.name !== "string") return []
      const fields = Array.isArray(table.fields)
        ? table.fields.flatMap((field) => {
            if (!isRecord(field) || typeof field.id !== "string" || typeof field.name !== "string") return []
            const choices =
              isRecord(field.options) && Array.isArray(field.options.choices)
                ? field.options.choices.flatMap((choice) =>
                    isRecord(choice) && typeof choice.name === "string" ? [choice.name] : [],
                  )
                : []
            return [{ id: field.id, name: field.name, type: typeof field.type === "string" ? field.type : "unknown", choices }]
          })
        : []
      return [{ id: table.id, name: table.name, fields }]
    }),
  }
}

export class AirtableApiError extends Error {
  constructor(readonly status: number) {
    super(`Airtable API request failed with status ${status}`)
    this.name = "AirtableApiError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
