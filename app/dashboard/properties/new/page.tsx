import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PropertyForm } from "@/components/property/property-form"

export const metadata = { title: "Add property" }

export default function NewPropertyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard/properties"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Properties
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add a property</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Share the building details and everything you know about it, then upload photos, a walkthrough video, floor
          plans, and CAD files. The richer the picture, the sharper your AI assessment.
        </p>
      </div>
      <PropertyForm />
    </div>
  )
}
