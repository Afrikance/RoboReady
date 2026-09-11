import type React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/logo"
import { SidebarNav } from "@/components/shell/sidebar-nav"
import { UserMenu } from "@/components/shell/user-menu"
import { getSessionUser, ensureOrganization } from "@/lib/tenancy"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")

  // Lazily provision the user's workspace on first entry.
  const ctx = await ensureOrganization()

  return (
    <div className="grid min-h-svh lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Link href="/dashboard">
            <Logo invert size="md" imageUrl={ctx.logoUrl} />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav role={ctx.role} />
        </div>
        <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/50">
          RoboReady · MVP
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/dashboard">
              <Logo size="md" imageUrl={ctx.logoUrl} />
            </Link>
          </div>
          <div className="hidden text-sm text-muted-foreground lg:block">
            {ctx.organizationName}
          </div>
          <UserMenu
            name={ctx.user.name}
            email={ctx.user.email}
            role={ctx.role}
            orgName={ctx.organizationName}
          />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
