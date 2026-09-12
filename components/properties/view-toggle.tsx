import Link from "next/link"
import { LayoutGrid, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Card grid vs. table view switch, shared by both properties views. */
export function ViewToggle({ active }: { active: "grid" | "table" }) {
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border" role="group" aria-label="View">
      <Link
        href="/dashboard/properties"
        aria-current={active === "grid" ? "page" : undefined}
        className={cn(
          base,
          active === "grid"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="size-4" /> Cards
      </Link>
      <Link
        href="/dashboard/properties/list"
        aria-current={active === "table" ? "page" : undefined}
        className={cn(
          base,
          "border-l border-border",
          active === "table"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        <Table2 className="size-4" /> Table
      </Link>
    </div>
  )
}
