import { redirect } from "next/navigation"
import { getPartnerWorkspaceForAdmin } from "@/app/actions/partner-matching"
import { PartnerWorkspace } from "@/components/partners/partner-workspace"

export const metadata = { title: "Solution Partners" }

export default async function PartnersPage() {
  const workspace = await getPartnerWorkspaceForAdmin()
  if (!workspace) redirect("/dashboard")

  return <PartnerWorkspace initialWorkspace={workspace} />
}

// The page is admin-only. The server action also enforces that boundary and scopes
// all reads to the active organization before returning this initial payload.
