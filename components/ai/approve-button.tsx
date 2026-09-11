"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { approveAiJob } from "@/app/actions/ai"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"

export function ApproveButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      size="sm"
      onClick={() =>
        startTransition(async () => {
          const res = await approveAiJob(jobId)
          if (res.ok) {
            toast.success("Output approved")
            router.refresh()
          } else {
            toast.error(res.error)
          }
        })
      }
      disabled={pending}
    >
      {pending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-2 h-3.5 w-3.5" />}
      Approve
    </Button>
  )
}
