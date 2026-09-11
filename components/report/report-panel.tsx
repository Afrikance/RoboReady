"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { generateReport } from "@/app/actions/report"
import { ReportView, type ReportContext } from "@/components/report/report-view"
import { TierStatus } from "@/components/assessment/tier-picker"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { FileText, Loader2, Printer, Sparkles } from "lucide-react"

export function ReportPanel({ propertyId, ctx }: { propertyId: string; ctx: ReportContext }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const hasAssessment = ctx.score != null

  function generate() {
    startTransition(async () => {
      const res = await generateReport(propertyId)
      if (res.ok) {
        toast.success("Report generated")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  if (!hasAssessment) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium">Nothing to report yet</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          Run an assessment first — the report is built from the score, findings, site concept, and infrastructure plan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Client-ready report</p>
          <p className="text-xs text-muted-foreground">
            {ctx.report ? "Regenerate the narrative, print to PDF, or share with the client." : "Generate an AI narrative, then print or share."}
          </p>
          <TierStatus purchasedTier={ctx.tier} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={generate} disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            {ctx.report ? "Regenerate" : "Generate report"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/report/${propertyId}`} target="_blank" rel="noreferrer">
              <Printer className="mr-1.5 h-4 w-4" /> Print / PDF
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/portal/${propertyId}`} target="_blank" rel="noreferrer">
              <FileText className="mr-1.5 h-4 w-4" /> Client view
            </a>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <ReportView ctx={ctx} />
      </div>
    </div>
  )
}
