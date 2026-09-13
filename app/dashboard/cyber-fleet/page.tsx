import { redirect } from "next/navigation"
import { Bot } from "lucide-react"
import { ensureOrganization } from "@/lib/tenancy"
import { isOperator, isAdminRole, OPERATOR_HOME } from "@/lib/access"
import { getPartnerSettings, listMyReferrals, listReferrals } from "@/app/actions/cyber-fleet"
import { PARTNER } from "@/lib/cyber-fleet"
import { AdminReferrals } from "@/components/cyber-fleet/admin-referrals"
import { ClientReferrals } from "@/components/cyber-fleet/client-referrals"

export const metadata = { title: `${PARTNER.name} referrals` }

export default async function CyberFleetPage() {
  const ctx = await ensureOrganization()
  // Field staff have no partner surface.
  if (isOperator(ctx.role)) redirect(OPERATOR_HOME)

  const isAdmin = isAdminRole(ctx.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{PARTNER.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {isAdmin
              ? "Qualified property referrals ready to hand off to the partner. Track each one from eligible to deal."
              : `Autonomous security & robotics operations for your robot-ready properties. Request a ${PARTNER.name} evaluation whenever you are ready.`}
          </p>
        </div>
      </div>

      {isAdmin ? <AdminSection /> : <ClientSection userName={ctx.user.name} userEmail={ctx.user.email} />}
    </div>
  )
}

async function AdminSection() {
  const [referrals, range] = await Promise.all([listReferrals(), getPartnerSettings()])
  return (
    <>
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Qualifying band:{" "}
        <span className="font-medium text-foreground">
          {range.enabled ? `${range.min}–${range.max}` : "Offer disabled"}
        </span>
        . Adjust this in Settings.
      </div>
      <AdminReferrals referrals={referrals} />
    </>
  )
}

async function ClientSection({ userName, userEmail }: { userName: string; userEmail: string }) {
  const referrals = await listMyReferrals()
  return <ClientReferrals referrals={referrals} contactName={userName} contactEmail={userEmail} />
}
