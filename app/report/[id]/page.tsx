import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { getSessionUser } from "@/lib/tenancy"
import { buildReportContext } from "@/app/actions/report"
import { ReportView } from "@/components/report/report-view"
import { PrintTrigger } from "@/components/report/print-trigger"
import { Button } from "@/components/ui/button"

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
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/reports">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to workspace
            </Link>
          </Button>
          <PrintTrigger auto />
        </div>
        <ReportView ctx={ctx} enforce />
        <footer className="mt-12 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Generated with RoboReady · {new Date().toLocaleDateString()}
        </footer>
      </div>
    </div>
  )
}
