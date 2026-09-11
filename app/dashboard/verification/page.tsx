import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/tenancy"
import { canAccessVerification, OPERATOR_HOME } from "@/lib/access"
import { listVerificationQueue } from "@/app/actions/prospecting"
import { VerificationList } from "@/components/prospecting/verification-list"
import type { ProspectRow } from "@/lib/prospecting/filter"

export const metadata = { title: "Verification" }

export default async function VerificationPage() {
  const ctx = await getOrgContext()
  if (!ctx || !canAccessVerification(ctx.role)) redirect(OPERATOR_HOME)

  const rows = (await listVerificationQueue()) as ProspectRow[]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verification queue</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Review field-submitted properties. Verify to unlock assessment, or return to the field for more data.
        </p>
      </div>
      <VerificationList initialRows={rows} />
    </div>
  )
}
