"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Building2, Bot, FileText, Users, Contact, Settings, DatabaseZap, ClipboardList, BadgeCheck, LifeBuoy, ShieldCheck, MapPinned } from "lucide-react"
import { canUseNavHref } from "@/lib/access"
import type { Role } from "@/lib/tenancy"

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/leads", label: "Leads", icon: Contact },
  { href: "/dashboard/properties/database", label: "Prospect DB", icon: DatabaseZap, exact: true },
  { href: "/dashboard/properties", label: "Properties", icon: Building2 },
  { href: "/dashboard/handover", label: "Field Work", icon: ClipboardList },
  { href: "/dashboard/verification", label: "Verification", icon: BadgeCheck },
  { href: "/dashboard/activity", label: "AI Activity", icon: Bot },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/network", label: "Network", icon: MapPinned },
  { href: "/dashboard/cyber-fleet", label: "Cyber Fleet", icon: ShieldCheck },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = NAV.filter((item) => canUseNavHref(role, item.href))

  // Highlight exactly one item: the one whose href is the longest prefix of the
  // current path. This keeps "Properties" from also lighting up on the nested
  // "Prospect DB" route (/dashboard/properties/database).
  const activeHref = items
    .filter((item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav className="flex flex-col gap-1 px-3 py-2" aria-label="Primary">
      {items.map((item) => {
        const active = item.href === activeHref
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
