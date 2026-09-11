"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type TabDef = { id: string; label: string; badge?: string }

export function PropertyTabs({
  tabs,
  panels,
  initial,
}: {
  tabs: TabDef[]
  panels: Record<string, ReactNode>
  initial?: string
}) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id)
  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.badge ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="pt-6">{panels[active]}</div>
    </div>
  )
}
