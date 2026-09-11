import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { listPropertiesForTable } from "@/app/actions/properties"
import { PropertiesTable } from "@/components/properties/properties-table"
import { ViewToggle } from "@/components/properties/view-toggle"

export const metadata = { title: "Properties" }

export default async function PropertiesListPage() {
  const rows = await listPropertiesForTable()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "property" : "properties"} in your portfolio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle active="table" />
          <Button asChild>
            <Link href="/dashboard/properties/new">
              <Plus className="size-4" />
              Add property
            </Link>
          </Button>
        </div>
      </div>

      <PropertiesTable rows={rows} />
    </div>
  )
}
