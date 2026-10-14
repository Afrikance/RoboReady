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
  message: string
}

async function checkAirtableStatus(url: string): Promise<AirtableStatus> {
  const response = await fetch(url, { cache: "no-store" })
  const body = await response.json().catch(() => null)

  if (!response.ok || !body?.connected) {
    throw new Error(
      body?.error === "connector_unavailable"
        ? "Vercel Connect could not provide the Airtable credential."
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
          The status check retrieves the credential on the server and never sends the token to your browser. It does not read or write Airtable records.
        </p>
        {data ? (
          <div className="flex items-start gap-2 text-sm text-foreground" role="status">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{data.message}</span>
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
