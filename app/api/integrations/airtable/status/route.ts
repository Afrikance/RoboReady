import { getAirtableAppToken } from "@/lib/integrations/airtable"
import { isAdminRole } from "@/lib/access"
import { getOrgContext } from "@/lib/tenancy"

export const dynamic = "force-dynamic"

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" }

export async function GET() {
  const ctx = await getOrgContext()
  if (!ctx) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: noStoreHeaders })
  }

  if (!isAdminRole(ctx.role)) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: noStoreHeaders })
  }

  try {
    const token = await getAirtableAppToken()
    if (!token) throw new Error("Airtable connector returned no token")

    return Response.json(
      {
        connected: true,
        scope: "app",
        message: "Vercel Connect supplied the app-scoped Airtable credential. Airtable data access has not been tested.",
      },
      { headers: noStoreHeaders },
    )
  } catch {
    return Response.json(
      { connected: false, error: "connector_unavailable" },
      { status: 503, headers: noStoreHeaders },
    )
  }
}
