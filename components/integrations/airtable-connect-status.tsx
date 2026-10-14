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
  tables: Array<{
    id: string
    name: string
    fields: Array<{ id: string; name: string; type: string; choices: string[] }>
  }>
  message: string
}

async function checkAirtableStatus(url: string): Promise<AirtableStatus> {
  const response = await fetch(url, { cache: "no-store" })
  const body = await response.json().catch(() => null)

  if (!response.ok || !body?.connected) {
    throw new Error(
      body?.error === "schema_scope_missing"
        ? "The Airtable connector credential does not have the schema.bases:read permission required for this read-only schema check."
        : body?.error === "connector_unavailable"
          ? "Vercel Connect or Airtable could not complete the read-only schema check."
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
          The server reads only the base and field schema for the named CRM, using an app-scoped token. It never sends the token to the browser and does not read or change CRM records.
        </p>
        {data ? (
          <div className="flex flex-col gap-4" role="status">
            <div className="flex items-start gap-2 text-sm text-foreground">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{data.message}</span>
            </div>
            {data.base && data.tables.length > 0 ? (
              <div className="flex flex-col gap-3">
                {data.tables.map((table) => (
                  <section key={table.id} className="flex flex-col gap-2 rounded-md border p-4">
                    <h3 className="text-sm font-semibold">{table.name}</h3>
                    <ul className="flex flex-col gap-2">
                      {table.fields.map((field) => (
                        <li key={field.id} className="flex flex-wrap items-start gap-x-2 text-sm">
                          <span className="font-medium">{field.name}</span>
                          <span className="text-muted-foreground">{field.type}</span>
                          {field.choices.length > 0 ? (
                            <span className="w-full text-xs leading-relaxed text-muted-foreground">
                              Options: {field.choices.join(", ")}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
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
          {isMutating ? "Checking connection…" : "Check connection"}
        </Button>
      </CardContent>
    </Card>
  )
}
