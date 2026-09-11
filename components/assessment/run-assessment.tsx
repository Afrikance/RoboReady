"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { runAssessment } from "@/app/actions/assessment"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"

export function RunAssessment({ propertyId, label = "Run AI assessment" }: { propertyId: string; label?: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      onClick={() =>
        startTransition(async () => {
          const res = await runAssessment(propertyId)
          if (res.ok) {
            toast.success(`Assessment complete — RoboReady Score ${res.data.score}`)
            router.refresh()
          } else {
            toast.error(res.error)
          }
        })
      }
      disabled={pending}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {pending ? "Running the workforce..." : label}
    </Button>
  )
}
