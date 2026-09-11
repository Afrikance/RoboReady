import { Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { listLeads } from "@/app/actions/leads"
import { NewLeadDialog } from "@/components/leads/new-lead-dialog"
import { LeadBoard } from "@/components/leads/lead-board"

export const metadata = { title: "Leads" }

export default async function LeadsPage() {
  const leads = await listLeads()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {leads.length} {leads.length === 1 ? "lead" : "leads"} — qualify with AI and move them down the funnel.
          </p>
        </div>
        <NewLeadDialog />
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Users className="size-6" />
            </span>
            <div>
              <p className="font-medium">No leads yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first lead, then let Mercer, the Sales Qualifier, score its fit and recommend next actions.
              </p>
            </div>
            <NewLeadDialog />
          </CardContent>
        </Card>
      ) : (
        <LeadBoard
          leads={leads.map((l) => ({
            id: l.id,
            company: l.company,
            contactName: l.contactName,
            stage: l.stage,
            estimatedValue: l.estimatedValue,
            source: l.source,
            qualification: l.qualification,
          }))}
        />
      )}
    </div>
  )
}
