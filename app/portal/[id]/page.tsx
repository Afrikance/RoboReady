import { notFound, redirect } from "next/navigation"
import { getSessionUser } from "@/lib/tenancy"
import { buildReportContext } from "@/app/actions/report"
import { ReportView } from "@/components/report/report-view"
import { PrintTrigger } from "@/components/report/print-trigger"
import { Logo } from "@/components/brand/logo"

export const metadata = { title: "RoboReady — Client Report" }

export default async function PortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect(`/sign-in?next=/portal/${id}`)

  const ctx = await buildReportContext(id)
  if (!ctx) notFound()

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <PrintTrigger />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
          <ReportView ctx={ctx} enforce />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          This assessment was prepared by {ctx.organizationName} using RoboReady.
        </p>
      </main>
    </div>
  )
}
