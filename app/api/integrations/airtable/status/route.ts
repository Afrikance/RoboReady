import { AirtableApiError, getRoboticsCrmSchema, ROBOTICS_CRM_BASE_NAME } from "@/lib/integrations/airtable"
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
    const schema = await getRoboticsCrmSchema()
    return Response.json(
      {
        connected: true,
        scope: "app",
        baseName: ROBOTICS_CRM_BASE_NAME,
        base: schema.base,
        tables: schema.tables,
        message: schema.base
          ? `Read-only schema loaded from ${schema.base.name}. No Airtable records were read or changed.`
          : `The Airtable credential works, but the exact base “${ROBOTICS_CRM_BASE_NAME}” was not found in its accessible bases.`,
      },
      { headers: noStoreHeaders },
    )
  } catch (error) {
    const code = error instanceof AirtableApiError && error.status === 403 ? "schema_scope_missing" : "connector_unavailable"
    return Response.json(
      { connected: false, error: code },
      { status: 503, headers: noStoreHeaders },
    )
  }
}
