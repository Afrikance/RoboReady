import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/tenancy"
import { canAccessProspectDatabase, OPERATOR_HOME } from "@/lib/access"
import { listProspects } from "@/app/actions/prospecting"
import { ProspectDatabase } from "@/components/prospecting/prospect-database"
import type { ProspectRow } from "@/lib/prospecting/filter"

export const metadata = { title: "Prospect database" }

export default async function ProspectDatabasePage() {
  const ctx = await getOrgContext()
  if (!ctx || !canAccessProspectDatabase(ctx.role)) redirect(OPERATOR_HOME)

  const prospects = (await listProspects()) as ProspectRow[]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prospect database</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Scout finds candidate properties, pre-fills the intake, and sends them to Field Work for the team to complete.
          Manually added properties stage here until you hand them over. Verified properties move to the Properties page.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Property type &amp; channel-development focus</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Our proposed channel-development focus is on identifying enterprise customers with clear automation needs and
          opportunities for practical robotics deployment. Relevant target markets may include:
        </p>
        <ul className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <li>
            <h3 className="font-medium">Manufacturing and industrial operations</h3>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Applications involving repetitive workflows, material movement, operational assistance, and productivity
              improvement.
            </p>
          </li>
          <li>
            <h3 className="font-medium">Warehousing and logistics</h3>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Opportunities involving internal transportation, workflow support, and operational automation, depending
              on the capabilities of the selected platform.
            </p>
          </li>
          <li>
            <h3 className="font-medium">Commercial facilities and enterprise environments</h3>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Potential applications in customer-facing environments, facility operations, and other structured
              settings.
            </p>
          </li>
          <li>
            <h3 className="font-medium">Research, innovation, and pilot programs</h3>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Organizations interested in evaluating robotics platforms through proof-of-concept projects before
              committing to larger deployments.
            </p>
          </li>
        </ul>
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed">
          Our objective is to prioritize opportunities based on customer demand, technical suitability, deployment
          feasibility, budget, and the potential for repeat business.
        </p>
      </section>

      <ProspectDatabase initialProspects={prospects} />
    </div>
  )
}
