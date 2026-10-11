"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { UserPlus, X, Mail, Copy, KeyRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { changeMemberRole, createTeamAccount, inviteMember, removeMember, revokeInvite } from "@/app/actions/team"

type Role = "owner" | "admin" | "member" | "operator" | "vendor" | "contractor" | "client"

export type MemberItem = {
  userId: string
  role: string
  name: string
  email: string
}

export type InviteItem = {
  id: string
  email: string
  role: string
  createdAt: string | Date
}

// Kept in sync with ASSIGNABLE_ROLES / ROLE_LABELS in lib/roles.ts.
const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: "admin", label: "Sub-Admin", hint: "Approve AI output, manage the workspace" },
  { value: "operator", label: "Field Operator", hint: "On-site intake & documents" },
  { value: "vendor", label: "Vendor", hint: "Build out assigned properties" },
  { value: "contractor", label: "Contractor", hint: "Build out assigned properties" },
  { value: "client", label: "Client", hint: "Read-only report access" },
]

const ROLE_LABEL: Record<string, string> = {
  owner: "Super Admin",
  admin: "Sub-Admin",
  member: "Member",
  operator: "Field Operator",
  vendor: "Vendor",
  contractor: "Contractor",
  client: "Client",
}

export function TeamManager({
  members,
  invites,
  currentUserId,
  canManage,
  canCreateAccounts,
}: {
  members: MemberItem[]
  invites: InviteItem[]
  currentUserId: string
  canManage: boolean
  canCreateAccounts: boolean
}) {
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("client")
  const [accountName, setAccountName] = useState("")
  const [accountEmail, setAccountEmail] = useState("")
  const [accountRole, setAccountRole] = useState<Role>("client")
  const [setupUrl, setSetupUrl] = useState("")
  const [pending, startTransition] = useTransition()

  function submitInvite() {
    const value = inviteEmail.trim()
    if (!value) {
      toast.error("Enter an email address.")
      return
    }
    startTransition(async () => {
      const res = await inviteMember(value, inviteRole)
      if (res.ok) {
        toast.success(`Invited ${value} as ${ROLE_LABEL[inviteRole]}.`)
        setInviteEmail("")
        setInviteRole("client")
      } else {
        toast.error(res.error)
      }
    })
  }

  function submitAccountCreation() {
    setSetupUrl("")
    startTransition(async () => {
      const res = await createTeamAccount({ name: accountName, email: accountEmail, role: accountRole })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setSetupUrl(`${window.location.origin}/account-setup?token=${encodeURIComponent(res.data.setupToken)}`)
      setAccountName("")
      setAccountEmail("")
      setAccountRole("client")
      toast.success("Login account created. Share the setup link with its owner.")
    })
  }

  async function copySetupLink() {
    try {
      await navigator.clipboard.writeText(setupUrl)
      toast.success("Password setup link copied.")
    } catch {
      toast.error("Could not copy the link. Select and copy it manually.")
    }
  }

  return (
    <div className="space-y-8">
      {canCreateAccounts ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Create a login account</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground text-pretty">
            The account and team access are created immediately. Share the one-time link so the person can choose their own password. It expires after 24 hours.
          </p>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
            onSubmit={(event) => {
              event.preventDefault()
              submitAccountCreation()
            }}
          >
            <Input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Full name"
              aria-label="Account holder name"
              autoComplete="name"
              maxLength={120}
              required
              className="sm:flex-1"
            />
            <Input
              type="email"
              inputMode="email"
              value={accountEmail}
              onChange={(event) => setAccountEmail(event.target.value)}
              placeholder="name@company.com"
              aria-label="Account holder email"
              autoComplete="email"
              maxLength={254}
              required
              className="sm:flex-1"
            />
            <Select value={accountRole} onValueChange={(value) => setAccountRole(value as Role)}>
              <SelectTrigger className="sm:w-52" aria-label="New account role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={pending}>
              <UserPlus className="size-4" />
              Create account
            </Button>
          </form>
          {setupUrl ? (
            <div className="mt-4 rounded-md border border-border bg-muted/40 p-4" role="status">
              <p className="text-sm font-medium">Account created. Share this password setup link.</p>
              <div className="mt-3 flex gap-2">
                <Input value={setupUrl} readOnly aria-label="One-time password setup link" className="min-w-0 flex-1" />
                <Button type="button" variant="outline" onClick={copySetupLink} aria-label="Copy password setup link">
                  <Copy className="size-4" />
                  <span className="sr-only">Copy setup link</span>
                </Button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                This link can be used once and expires in 24 hours. Treat it like a password; anyone with it can set the account password.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {canManage ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Invite a person</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground text-pretty">
            They join this workspace with the role you pick the first time they sign in with this email — that is how
            clients, field operators, vendors, and contractors log in.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              type="email"
              inputMode="email"
              placeholder="name@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) submitInvite()
              }}
              className="sm:flex-1"
              aria-label="Email to invite"
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
              <SelectTrigger className="sm:w-52" aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.filter((option) => option.value !== "admin" || canCreateAccounts).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={submitInvite} disabled={pending}>
              Send invite
            </Button>
          </div>
        </section>
      ) : null}

      {invites.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Pending invites</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">Invited as {ROLE_LABEL[inv.role] ?? inv.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Pending</Badge>
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Revoke invite for ${inv.email}`}
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await revokeInvite(inv.id)
                          if (res.ok) toast.success("Invite revoked.")
                          else toast.error(res.error)
                        })
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Members</h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {members.map((m) => {
            const isOwner = m.role === "owner"
            const isSelf = m.userId === currentUserId
            const editable = canManage && !isOwner && !isSelf
            return (
              <li key={m.userId} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {m.name}
                      {isSelf ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editable ? (
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        startTransition(async () => {
                          const res = await changeMemberRole(m.userId, v)
                          if (res.ok) toast.success(`${m.name} is now ${ROLE_LABEL[v] ?? v}.`)
                          else toast.error(res.error)
                        })
                      }
                    >
                      <SelectTrigger className="w-44" aria-label={`Role for ${m.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={isOwner ? "default" : "secondary"}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
                  )}
                  {editable ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${m.name}`}
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await removeMember(m.userId)
                          if (res.ok) toast.success(`${m.name} removed.`)
                          else toast.error(res.error)
                        })
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
