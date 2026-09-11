import { redirect } from "next/navigation"
import { listActivity } from "@/app/actions/ai"
import { ensureOrganization } from "@/lib/tenancy"
import { isOperator, OPERATOR_HOME } from "@/lib/access"
import { Badge } from "@/components/ui/badge"
import { ApproveButton } from "@/components/ai/approve-button"
import { Bot, Cpu, Clock } from "lucide-react"

export const metadata = { title: "AI Activity" }

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-[var(--score-high)] text-white",
  awaiting_approval: "bg-[var(--score-mid)] text-white",
  failed: "bg-destructive text-destructive-foreground",
  running: "bg-muted text-muted-foreground",
}

function formatWhen(d: Date | string) {
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export default async function ActivityPage() {
  const ctx = await ensureOrganization()
  if (isOperator(ctx.role)) redirect(OPERATOR_HOME)
  const jobs = await listActivity()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every task dispatched to the AI workforce, with full traceability and approval gates.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Bot className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No AI activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Run an assessment on a property to get started.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {job.employeeName} <span className="text-muted-foreground">·</span>{" "}
                      <span className="capitalize">{job.jobType.replace(/-/g, " ")}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> {job.adapterKind}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatWhen(job.createdAt)}
                      </span>
                      {job.reasoning ? <span>{job.reasoning}</span> : null}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_STYLES[job.status] ?? "bg-muted text-muted-foreground"}>
                    {job.status === "awaiting_approval" ? "Awaiting approval" : job.status}
                  </Badge>
                  {job.status === "awaiting_approval" ? <ApproveButton jobId={job.id} /> : null}
                </div>
              </div>
              {job.errorDetail ? (
                <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{job.errorDetail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
