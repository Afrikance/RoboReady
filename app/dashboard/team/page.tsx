import { ensureOrganization } from "@/lib/tenancy"
import { listMembers } from "@/app/actions/team"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Team" }

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  client: "Client",
}

export default async function TeamPage() {
  const ctx = await ensureOrganization()
  const members = await listMembers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">People with access to {ctx.organizationName}.</p>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {m.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
            </div>
            <Badge variant={m.role === "owner" ? "default" : "secondary"}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Inviting teammates and clients is coming in a later MVP. Roles today: owners and admins can approve AI output
        and manage the workspace; members can run assessments; clients get read-only report access.
      </p>
    </div>
  )
}
