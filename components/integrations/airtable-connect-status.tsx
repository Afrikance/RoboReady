"use client"

import useSWRMutation from "swr/mutation"
import { Check, Database, LoaderCircle, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AirtableStatus = {
  connected: true
  scope: "app"
  baseName: string
  base: { id: string; name: string } | null
  tierOneRecords: Array<{
    id: string
    tableId: string
    tableName: string
    fields: Record<string, string>
  }>
  scanComplete: boolean
  message: string
}

async function checkAirtableStatus(url: string): Promise<AirtableStatus> {
  const response = await fetch(url, { cache: "no-store" })
  const body = await response.json().catch(() => null)

  if (!response.ok || !body?.connected) {
    throw new Error(
      body?.error === "schema_scope_missing"
        ? "The Airtable connector credential needs schema.bases:read to inspect the base structure."
        : body?.error === "records_scope_missing"
          ? "The Airtable connector credential needs data.records:read to find Tier 1 records."
          : body?.error === "connector_unavailable"
            ? "Vercel Connect or Airtable could not complete the read-only CRM query."
            : "Unable to check Airtable Connect status.",
    )
  }

  return body as AirtableStatus
}

export function AirtableConnectStatus() {
  const { trigger, data, error, isMutating } = useSWRMutation(
    "/api/integrations/airtable/status",
    checkAirtableStatus,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database aria-hidden="true" className="size-5 text-primary" />
          Shared app connection
        </CardTitle>
        <CardDescription>
          This connector uses one app-scoped Airtable credential, not separate credentials for each user.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The server searches only tables with a Notes field for a distinct “Tier 1” label. It returns non-contact CRM fields to admins; the token and Notes contents stay server-side. The query never changes Airtable records.
        </p>
        {data ? (
          <div className="flex flex-col gap-4" role="status">
            <div className="flex items-start gap-2 text-sm text-foreground">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{data.message}</span>
            </div>
            {data.base ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">Tier 1 CRM records</h3>
                  {!data.scanComplete ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Scan reached its per-table safety limit. Results may be incomplete.
                    </p>
                  ) : null}
                </div>
                {data.tierOneRecords.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {data.tierOneRecords.map((record) => (
                      <li key={`${record.tableId}-${record.id}`} className="flex flex-col gap-2 rounded-md border p-4">
                        <h4 className="text-sm font-semibold">{record.tableName}</h4>
                        {Object.keys(record.fields).length > 0 ? (
                          <dl className="flex flex-col gap-2">
                            {Object.entries(record.fields).map(([name, value]) => (
                              <div key={name} className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-3">
                                <dt className="font-medium">{name}</dt>
                                <dd className="min-w-0 break-words text-muted-foreground">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="text-sm leading-relaxed text-muted-foreground">No display-safe fields found.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-md border p-4 text-sm leading-relaxed text-muted-foreground">
                    No records contain “Tier 1” in the Notes field.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <div className="flex items-start gap-2 text-sm text-destructive" role="alert">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{error.message}</span>
          </div>
        ) : null}
        <Button type="button" disabled={isMutating} onClick={() => void trigger()}>
          {isMutating ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
          {isMutating ? "Searching Airtable…" : "Find Tier 1 records"}
        </Button>
      </CardContent>
    </Card>
  )
}
