import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/tenancy"
import { canAccessProspectDatabase, OPERATOR_HOME } from "@/lib/access"
import { listProspects } from "@/app/actions/prospecting"
import { ProspectDatabase } from "@/components/prospecting/prospect-database"
import type { ProspectRow } from "@/lib/prospecting/filter"

export const metadata = { title: "Prospect database" }

export default async function ProspectDatabasePage() {
  const ctx = await getOrgContext()
  if (!ctx || !canAccessProspectDatabase(ctx.role)) redirect(OPERATOR_HOME)

  const prospects = (await listProspects()) as ProspectRow[]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prospect database</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Scout finds candidate properties, pre-fills the intake, and sends them to Field Work for the team to complete.
          Manually added properties stage here until you hand them over. Verified properties move to the Properties page.
        </p>
      </div>
      <ProspectDatabase initialProspects={prospects} />
    </div>
  )
}
