import { redirect } from "next/navigation"
import { AirtableConnectStatus } from "@/components/integrations/airtable-connect-status"
import { isAdminRole } from "@/lib/access"
import { getOrgContext } from "@/lib/tenancy"

export const metadata = { title: "Airtable Connect" }

export default async function AirtableIntegrationPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect("/sign-in?next=/dashboard/integrations/airtable")
  if (!isAdminRole(ctx.role)) redirect("/dashboard")

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Integrations</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Airtable Connect</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Check that this project can obtain its shared Airtable credential through Vercel Connect. The credential stays server-side.
        </p>
      </header>
      <AirtableConnectStatus />
    </main>
  )
}
