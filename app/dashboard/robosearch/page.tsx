import { redirect } from "next/navigation"

import { getOrgContext } from "@/lib/tenancy"
import { isAdminRole } from "@/lib/access"
import { graphCounts } from "@/lib/robosearch/core"
import { listResearchJobs } from "@/lib/robosearch/research"
import { RobosearchConsole } from "@/components/robosearch/robosearch-console"

export const metadata = { title: "RoboSearch" }

export default async function RobosearchPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect("/sign-in?next=/dashboard/robosearch")
  if (!isAdminRole(ctx.role)) redirect("/dashboard")

  const [counts, jobs] = await Promise.all([graphCounts(), listResearchJobs(ctx)])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">RoboSearch · RoboGraph</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
          Autonomous-readiness intelligence graph
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
          Dispatch AI research crews to discover companies, robots, and properties, then review every
          proposal before it enters the canonical RoboGraph. Provenance is tracked on every claim.
        </p>
      </div>

      <RobosearchConsole counts={counts} initialJobs={jobs} />
    </div>
  )
}
