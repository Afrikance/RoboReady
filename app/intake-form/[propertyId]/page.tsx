import { notFound, redirect } from "next/navigation"
import { getOrgContext } from "@/lib/tenancy"
import { canDownloadFilledIntake } from "@/lib/intake/access"
import { getProperty } from "@/app/actions/properties"
import { getIntake } from "@/app/actions/intake"
import { IntakePrintable } from "@/components/intake/intake-printable"
import { PrintTrigger } from "@/components/report/print-trigger"

export const metadata = { title: "Intake form — export" }

export default async function FilledIntakeFormPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params
  const ctx = await getOrgContext()
  if (!ctx) redirect(`/sign-in?next=/intake-form/${propertyId}`)
  if (!canDownloadFilledIntake(ctx.role)) redirect("/dashboard/settings")

  const prop = await getProperty(propertyId)
  if (!prop) notFound()
  const intake = await getIntake(propertyId)
  const answers = (intake?.answers as Record<string, unknown>) ?? {}

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex justify-end print:hidden">
          <PrintTrigger auto />
        </div>
        <IntakePrintable
          mode="filled"
          answers={answers}
          propertyName={prop.name}
          organizationName={ctx.organizationName}
        />
        <footer className="mt-12 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          RoboReady intake export · {new Date().toLocaleDateString()}
        </footer>
      </div>
    </div>
  )
}
