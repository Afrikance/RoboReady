import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/tenancy"
import { canAccessHandover, OPERATOR_HOME } from "@/lib/access"
import { listHandoverQueue } from "@/app/actions/prospecting"
import { HandoverList } from "@/components/prospecting/handover-list"
import type { ProspectRow } from "@/lib/prospecting/filter"

export const metadata = { title: "Field work" }

export default async function HandoverPage() {
  const ctx = await getOrgContext()
  if (!ctx || !canAccessHandover(ctx.role)) redirect(OPERATOR_HOME)

  const rows = (await listHandoverQueue()) as ProspectRow[]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Field work</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Properties handed over for on-site data collection. Complete the fields the AI couldn&apos;t verify, then
          submit for admin verification.
        </p>
      </div>
      <HandoverList initialRows={rows} />
    </div>
  )
}
