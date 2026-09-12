import { redirect } from "next/navigation"
import { ensureOrganization } from "@/lib/tenancy"
import { isClient, isOperator, canManageTeam, CLIENT_HOME, OPERATOR_HOME } from "@/lib/access"
import { listInvites, listMembers } from "@/app/actions/team"
import { TeamManager } from "@/components/team/team-manager"

export const metadata = { title: "Team" }

export default async function TeamPage() {
  const ctx = await ensureOrganization()
  if (isClient(ctx.role)) redirect(CLIENT_HOME)
  if (isOperator(ctx.role)) redirect(OPERATOR_HOME)

  const [members, invites] = await Promise.all([listMembers(), listInvites()])
  const canManage = canManageTeam(ctx.role)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People with access to {ctx.organizationName}. Invite clients, field operators, vendors, and contractors and
          assign each a role.
        </p>
      </div>

      <TeamManager
        members={members}
        invites={invites.map((i) => ({ ...i, createdAt: i.createdAt as unknown as string }))}
        currentUserId={ctx.user.id}
        canManage={canManage}
      />
    </div>
  )
}
