"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { verifyAccessibility } from "@/app/actions/planners"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, ShieldCheck } from "lucide-react"

export function VerifyAccessibility({ propertyId }: { propertyId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await verifyAccessibility(propertyId)
          if (res.ok) {
            toast.success("Audit marked as professionally verified")
            router.refresh()
          } else {
            toast.error(res.error)
          }
        })
      }
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
      Mark as professionally verified
    </Button>
  )
}
