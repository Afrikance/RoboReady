import { notFound, redirect } from "next/navigation"
import { getSessionUser } from "@/lib/tenancy"
import { buildReportContext } from "@/app/actions/report"
import { ReportView } from "@/components/report/report-view"
import { PrintTrigger } from "@/components/report/print-trigger"

export const metadata = { title: "Report" }

export default async function ReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect(`/sign-in?next=/report/${id}`)

  const ctx = await buildReportContext(id)
  if (!ctx) notFound()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex justify-end print:hidden">
          <PrintTrigger auto />
        </div>
        <ReportView ctx={ctx} />
        <footer className="mt-12 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Generated with RoboReady · {new Date().toLocaleDateString()}
        </footer>
      </div>
    </div>
  )
}
