"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { qualifyLead } from "@/app/actions/leads"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"

export function QualifyLead({ leadId, label = "Qualify with AI" }: { leadId: string; label?: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await qualifyLead(leadId)
          if (res.ok) {
            toast.success(`Qualified — fit score ${res.data.fitScore}`)
            router.refresh()
          } else {
            toast.error(res.error)
          }
        })
      }
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {pending ? "Mercer is reviewing..." : label}
    </Button>
  )
}
