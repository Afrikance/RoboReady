"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"

type RunResult = { ok: true; data?: unknown } | { ok: false; error: string }

/**
 * Generic "run an AI employee" button. Pass a server action already bound to
 * its arguments (e.g. `runWayfinding.bind(null, propertyId)`).
 */
export function RunAI({
  action,
  label,
  runningLabel = "Running the workforce...",
  successMessage = "Done",
  variant = "default",
  size = "default",
}: {
  action: () => Promise<RunResult>
  label: string
  runningLabel?: string
  successMessage?: string
  variant?: "default" | "secondary" | "outline"
  size?: "default" | "sm"
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await action()
          if (res.ok) {
            toast.success(successMessage)
            router.refresh()
          } else {
            toast.error(res.error)
          }
        })
      }
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {pending ? runningLabel : label}
    </Button>
  )
}
