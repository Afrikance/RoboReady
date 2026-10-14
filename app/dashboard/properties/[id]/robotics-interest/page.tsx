import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { getCustomerRoboticsInterest } from "@/app/actions/robotics-interest"
import { getCustomerRoboticsCollaborationRequests } from "@/app/actions/robotics-collaboration"
import { OwnerRoboticsCollaborationConsent } from "@/components/robotics-interest/collaboration-panels"
import { RoboticsInterestForm } from "@/components/robotics-interest/interest-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getAuthorizedProperty, getOrgContext, isClient } from "@/lib/tenancy"

export const metadata = { title: "Robotics fit review" }

export default async function PropertyRoboticsInterestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getOrgContext()
  if (!ctx || !isClient(ctx.role)) redirect("/dashboard")

  const property = await getAuthorizedProperty(ctx, id, "read")
  if (!property) notFound()

  const [existingRequest, collaborationRequests] = await Promise.all([
    getCustomerRoboticsInterest(id),
    getCustomerRoboticsCollaborationRequests(id),
  ])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit px-0">
          <Link href={`/dashboard/properties/${property.id}`}>
            <ArrowLeft className="size-4" /> Back to {property.name}
          </Link>
        </Button>
        <div>
          <p className="text-sm font-medium text-primary">Property fit review</p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Robotics interest</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Share the recurring work and site conditions you want us to evaluate. This request is separate from your property assessment and does not contact solution partners.
          </p>
        </div>
      </div>

      {existingRequest ? (
        <>
          <Card>
            <CardContent className="flex flex-col items-start gap-4 pt-6">
              <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Your request is with RoboReady</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  We received your robotics fit-review request for {property.name} on {new Date(existingRequest.submittedAt).toLocaleDateString()}. A team member will follow up using your selected contact preference.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/dashboard/properties/${property.id}`}>Return to {property.name}</Link>
              </Button>
            </CardContent>
          </Card>
          <OwnerRoboticsCollaborationConsent requests={collaborationRequests} />
        </>
      ) : (
        <RoboticsInterestForm
          propertyId={property.id}
          propertyName={property.name}
          contactName={ctx.user.name}
          contactEmail={ctx.user.email}
        />
      )}
    </div>
  )
}

