import Link from "next/link"
import { FileText, FileDown, Building2, Palette, Bot } from "lucide-react"
import { ensureOrganization } from "@/lib/tenancy"
import { listProperties } from "@/app/actions/properties"
import { canDownloadBlankIntake, canDownloadFilledIntake } from "@/lib/intake/access"
import { canManageTeam, isAdminRole } from "@/lib/access"
import { LogoUploader } from "@/components/branding/logo-uploader"
import { PartnerSettingsForm } from "@/components/cyber-fleet/partner-settings-form"
import { getPartnerSettings } from "@/app/actions/cyber-fleet"
import { PARTNER } from "@/lib/cyber-fleet"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const metadata = { title: "Settings" }

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  operator: "Field Operator",
  vendor: "Vendor",
  contractor: "Contractor",
  client: "Client",
}

export default async function SettingsPage() {
  const ctx = await ensureOrganization()
  const canBlank = canDownloadBlankIntake(ctx.role)
  const canFilled = canDownloadFilledIntake(ctx.role)
  const canBrand = canManageTeam(ctx.role)
  const canPartner = isAdminRole(ctx.role)
  const properties = canFilled ? await listProperties() : []
  const partnerRange = canPartner ? await getPartnerSettings() : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace tools for {ctx.organizationName}. You are signed in as{" "}
          <Badge variant="secondary">{ROLE_LABEL[ctx.role] ?? ctx.role}</Badge>.
        </p>
      </div>

      {canBrand ? (
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Branding</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Customize the logo shown across your workspace. Admins and owners only.
          </p>
          <LogoUploader initialLogoUrl={ctx.logoUrl} />
        </section>
      ) : null}

      {canPartner && partnerRange ? (
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{PARTNER.name} referrals</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Control the partner referral offer shown to owners after an assessment. Admins and owners only.
          </p>
          <PartnerSettingsForm initial={partnerRange} />
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Intake form downloads</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Print or save as PDF. Available to Admins, Clients, and Field Operators.
        </p>

        {!canBlank && !canFilled ? (
          <p className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Your role doesn&apos;t have access to intake form downloads. Ask an admin if you need the field survey
            template or a completed export.
          </p>
        ) : null}

        {canBlank ? (
          <div className="mt-5 flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Blank field survey template</p>
              <p className="text-sm text-muted-foreground text-pretty">
                The on-site checklist a Field Operator fills in, including the interior room-to-pickup path.
              </p>
            </div>
            <Link
              href="/intake-form/blank"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "shrink-0")}
            >
              <FileDown className="h-4 w-4" /> Download blank
            </Link>
          </div>
        ) : null}

        {canFilled ? (
          <div className="mt-4 rounded-md border border-border p-4">
            <p className="text-sm font-medium">Completed intake export</p>
            <p className="text-sm text-muted-foreground text-pretty">
              A property&apos;s full intake, including interior survey data collected on-site.
            </p>
            {properties.length === 0 ? (
              <p className="mt-3 text-sm italic text-muted-foreground">No properties yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-md border border-border">
                {properties.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {p.name}
                    </span>
                    <Link
                      href={`/intake-form/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
                    >
                      <FileDown className="h-4 w-4" /> Export
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </div>
  )
}
