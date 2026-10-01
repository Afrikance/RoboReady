"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateRoboDefaultOpen } from "@/app/actions/site-settings"

export function RoboDefaultSettings({ initial }: { initial: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [defaultOpen, setDefaultOpen] = useState(initial)

  function save() {
    startTransition(async () => {
      const result = await updateRoboDefaultOpen(defaultOpen)
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      await mutate("/api/site-settings/robo", { defaultOpen }, { revalidate: false })
      toast.success("Robo display setting saved.")
      router.refresh()
    })
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <label className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
        <span>
          <span className="text-sm font-medium">Open Robo by default</span>
          <span className="mt-0.5 block text-sm text-muted-foreground text-pretty">
            Automatically open the support chat for visitors when they load the site. Visitors can still close it.
          </span>
        </span>
        <input
          type="checkbox"
          checked={defaultOpen}
          onChange={(event) => setDefaultOpen(event.target.checked)}
          className="size-4 accent-primary"
          aria-label="Open Robo by default for visitors"
        />
      </label>

      <div>
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save Robo setting
        </Button>
      </div>
    </div>
  )
}
