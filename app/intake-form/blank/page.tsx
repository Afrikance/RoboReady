import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/tenancy"
import { canDownloadBlankIntake } from "@/lib/intake/access"
import { IntakePrintable } from "@/components/intake/intake-printable"
import { PrintTrigger } from "@/components/report/print-trigger"

export const metadata = { title: "Intake form — blank template" }

export default async function BlankIntakeFormPage() {
  const ctx = await getOrgContext()
  if (!ctx) redirect(`/sign-in?next=/intake-form/blank`)
  if (!canDownloadBlankIntake(ctx.role)) redirect("/dashboard/settings")

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex justify-end print:hidden">
          <PrintTrigger auto />
        </div>
        <IntakePrintable mode="blank" />
        <footer className="mt-12 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          RoboReady field survey · {new Date().toLocaleDateString()}
        </footer>
      </div>
    </div>
  )
}
