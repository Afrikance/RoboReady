"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { updateBlogSettingsAction } from "@/app/dashboard/blog/actions"
import type { BlogSettings } from "@/lib/blog/types"

export function BlogSettingsForm({ initial, staffGptConfigured }: { initial: BlogSettings; staffGptConfigured: boolean }) {
  const [settings, setSettings] = useState({
    ...initial,
    staffgptAutoPublish: initial.staffgptAutoPublish && staffGptConfigured,
  })
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await updateBlogSettingsAction(settings)
      if (result.ok) toast.success("Blog settings saved")
      else toast.error(result.error)
    })
  }

  return (
    <section className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6" aria-labelledby="blog-settings-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="blog-settings-title" className="text-lg font-semibold">Publishing controls</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Public visibility and StaffGPT auto-publishing are separate switches. The blog starts hidden, and imported posts stay drafts until auto-publishing is enabled.
          </p>
        </div>
        <Button onClick={save} disabled={isPending} size="sm">
          {isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-md border p-4">
          <input
            type="checkbox"
            checked={settings.visible}
            onChange={(event) => setSettings((current) => ({ ...current, visible: event.target.checked }))}
            className="mt-1 size-4 accent-primary"
          />
          <span className="flex flex-col gap-1">
            <span className="text-sm font-medium">Blog visible to the public</span>
            <span className="text-sm leading-relaxed text-muted-foreground">Controls public routes, footer navigation, robots, and sitemap exposure.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border p-4">
          <input
            type="checkbox"
            checked={settings.staffgptAutoPublish}
            disabled={!staffGptConfigured}
            onChange={(event) => setSettings((current) => ({ ...current, staffgptAutoPublish: event.target.checked }))}
            className="mt-1 size-4 accent-primary disabled:cursor-not-allowed"
          />
          <span className="flex flex-col gap-1">
            <span className="text-sm font-medium">Allow StaffGPT auto-publishing</span>
            <span className="text-sm leading-relaxed text-muted-foreground">Eligible imports can publish immediately after schema validation and source checks.</span>
          </span>
        </label>
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        StaffGPT inbound publishing: {staffGptConfigured ? "secret configured" : "inactive — STAFFGPT_BLOG_SECRET must be set (32+ characters)"}.
      </p>
    </section>
  )
}
