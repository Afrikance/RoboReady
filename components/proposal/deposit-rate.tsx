"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setDepositRate } from "@/app/actions/proposals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function DepositRateEditor({ proposalId, rate }: { proposalId: string; rate: number }) {
  const [percent, setPercent] = useState(Math.round(rate * 100))
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1">
        <label htmlFor="deposit-rate" className="text-xs text-muted-foreground">
          Deposit %
        </label>
        <Input
          id="deposit-rate"
          type="number"
          min={0}
          max={50}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="w-24"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await setDepositRate(proposalId, percent / 100)
            if (res.ok) {
              toast.success("Deposit updated")
              router.refresh()
            } else {
              toast.error(res.error)
            }
          })
        }
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Update
      </Button>
    </div>
  )
}
