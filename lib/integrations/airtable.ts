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

const SAFE_CRM_FIELD = /company|organization|partner|supplier|manufacturer|brand|model|product|website|url|category|type|region|location|coverage|capabilit|status|tier|source|offering|service|industry|robot|cobot|description|summary/i
const PRIVATE_CRM_FIELD = /email|phone|mobile|contact|address|notes|internal|confidential|first\s*name|last\s*name/i
const MAX_PAGES_PER_TABLE = 10
const PAGE_SIZE = 100

export type TierOneCrmRecord = {
  id: string
  tableId: string
  tableName: string
  fields: Record<string, string>
}

export async function getRoboticsCrmSnapshot() {
  const token = await getAirtableAppToken(["schema.bases:read", "data.records:read"])
  const headers = { Authorization: `Bearer ${token}` }

  const basesResponse = await fetch("https://api.airtable.com/v0/meta/bases", {
    headers,
    cache: "no-store",
  })
  if (!basesResponse.ok) {
    throw new AirtableApiError(basesResponse.status, "schema")
  }

  const basesPayload: unknown = await basesResponse.json()
  const bases = isRecord(basesPayload) && Array.isArray(basesPayload.bases) ? basesPayload.bases : []
  const base = bases.find(
    (candidate) =>
      isRecord(candidate) &&
      typeof candidate.name === "string" &&
      normalizeBaseName(candidate.name) === ROBOTICS_CRM_BASE_NAME.toLocaleLowerCase(),
  )

  if (!isRecord(base) || typeof base.id !== "string" || typeof base.name !== "string") {
    return { base: null, tables: [], tierOneRecords: [], scanComplete: true }
  }

  const schemaResponse = await fetch(
    `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(base.id)}/tables`,
    { headers, cache: "no-store" },
  )
  if (!schemaResponse.ok) {
    throw new AirtableApiError(schemaResponse.status, "schema")
  }

  const schemaPayload: unknown = await schemaResponse.json()
  const rawTables = isRecord(schemaPayload) && Array.isArray(schemaPayload.tables) ? schemaPayload.tables : []
  const tables = rawTables.flatMap((table) => {
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
  })

  const tierOneRecords: TierOneCrmRecord[] = []
  let scanComplete = true

  for (const table of tables) {
    const notesField = table.fields.find((field) => field.name.trim().toLocaleLowerCase() === "notes")
    if (!notesField) continue

    const displayFields = table.fields.filter(
      (field) => field.id !== notesField.id && SAFE_CRM_FIELD.test(field.name) && !PRIVATE_CRM_FIELD.test(field.name),
    )
    let offset: string | undefined
    let page = 0

    do {
      const params = new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        filterByFormula: `SEARCH("Tier 1", {${notesField.id}})`,
      })
      params.append("fields[]", notesField.name)
      for (const field of displayFields) params.append("fields[]", field.name)
      if (offset) params.set("offset", offset)

      const recordsResponse = await fetch(
        `https://api.airtable.com/v0/${encodeURIComponent(base.id)}/${encodeURIComponent(table.id)}?${params.toString()}`,
        { headers, cache: "no-store" },
      )
      if (!recordsResponse.ok) {
        throw new AirtableApiError(recordsResponse.status, "records")
      }

      const recordsPayload: unknown = await recordsResponse.json()
      const records = isRecord(recordsPayload) && Array.isArray(recordsPayload.records) ? recordsPayload.records : []
      for (const record of records) {
        if (!isRecord(record) || typeof record.id !== "string" || !isRecord(record.fields)) continue
        const notes = record.fields[notesField.name]
        if (typeof notes !== "string" || !/\btier[\s-]*1\b/i.test(notes)) continue

        const safeFields: Record<string, string> = {}
        for (const field of displayFields) {
          const value = displayValue(record.fields[field.name])
          if (value) safeFields[field.name] = value
        }
        tierOneRecords.push({ id: record.id, tableId: table.id, tableName: table.name, fields: safeFields })
      }

      offset = isRecord(recordsPayload) && typeof recordsPayload.offset === "string" ? recordsPayload.offset : undefined
      page += 1
      if (offset && page >= MAX_PAGES_PER_TABLE) scanComplete = false
    } while (offset && page < MAX_PAGES_PER_TABLE)
  }

  return { base: { id: base.id, name: base.name }, tables, tierOneRecords, scanComplete }
}

function normalizeBaseName(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/^airtable\s*-\s*/, "")
}

function displayValue(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim().slice(0, 400) || undefined
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string | number => typeof item === "string" || typeof item === "number")
      .map(String)
      .filter(Boolean)
    return items.length > 0 ? items.join(", ").slice(0, 400) : undefined
  }
  return undefined
}

export class AirtableApiError extends Error {
  constructor(readonly status: number, readonly resource: "schema" | "records") {
    super(`Airtable ${resource} request failed with status ${status}`)
    this.name = "AirtableApiError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
