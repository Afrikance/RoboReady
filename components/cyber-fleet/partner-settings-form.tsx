"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePartnerSettings } from "@/app/actions/cyber-fleet"
import type { ScoreRange } from "@/lib/cyber-fleet"

/**
 * Admin control for the Cyber Fleet referral offer: toggle it on/off and set the
 * inclusive RoboReady Score band that qualifies a property.
 */
export function PartnerSettingsForm({ initial }: { initial: ScoreRange }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [min, setMin] = useState(String(initial.min))
  const [max, setMax] = useState(String(initial.max))

  function save() {
    startTransition(async () => {
      const res = await updatePartnerSettings({ min: Number(min), max: Number(max), enabled })
      if (res.ok) {
        setMin(String(res.data.min))
        setMax(String(res.data.max))
        toast.success("Partner settings saved.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="mt-4 space-y-5">
      <label className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
        <span>
          <span className="text-sm font-medium">Offer Cyber Fleet referrals</span>
          <span className="mt-0.5 block text-sm text-muted-foreground text-pretty">
            When on, qualifying owners are notified and can request an evaluation from their report.
          </span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 accent-primary"
          aria-label="Offer Cyber Fleet referrals"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cf-min">Minimum qualifying score</Label>
          <Input
            id="cf-min"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            disabled={!enabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-max">Maximum qualifying score</Label>
          <Input
            id="cf-max"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            disabled={!enabled}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-pretty">
        Properties whose RoboReady Score lands in this inclusive range (0–100) are offered the partner referral.
        Default is 50–100.
      </p>

      <Button onClick={save} disabled={pending}>
        {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Save partner settings
      </Button>
    </div>
  )
}
