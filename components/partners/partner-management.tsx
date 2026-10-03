"use client"

import { useRef, useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import { ImageUp, Loader2, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  deleteSitePartner,
  saveSitePartner,
  updatePartnerDisplaySettings,
} from "@/app/actions/site-partners"
import type { AdminSitePartner } from "@/lib/db/schema"

type PartnerDisplaySettings = { visible: boolean; marquee: boolean }

export function PartnerManagement({
  initialPartners,
  initialSettings,
}: {
  initialPartners: AdminSitePartner[]
  initialSettings: PartnerDisplaySettings
}) {
  return (
    <div className="mt-5 flex flex-col gap-6">
      <PartnerDisplayForm initial={initialSettings} />
      <div className="flex flex-col gap-4">
        {initialPartners.map((partner) => (
          <PartnerEditor key={partner.id} initial={partner} />
        ))}
        <PartnerEditor key="new-partner" />
      </div>
    </div>
  )
}

function PartnerDisplayForm({ initial }: { initial: PartnerDisplaySettings }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [visible, setVisible] = useState(initial.visible)
  const [marquee, setMarquee] = useState(initial.marquee)

  function save() {
    startTransition(async () => {
      const result = await updatePartnerDisplaySettings({ visible, marquee })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Partner display settings saved.")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-medium">Show partner section</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
            Display visible partners on the home page above pricing.
          </span>
        </span>
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
          className="size-4 accent-primary"
          aria-label="Show partner section on the home page"
          disabled={pending}
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-medium">Kyron — scrolling marquee</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
            Turn on for a moving logo strip; turn off for a fixed, wrapping row. Reduced-motion preferences are always respected.
          </span>
        </span>
        <input
          type="checkbox"
          checked={marquee}
          onChange={(event) => setMarquee(event.target.checked)}
          className="size-4 accent-primary"
          aria-label="Enable Kyron partner logo marquee"
          disabled={pending}
        />
      </label>
      <div>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          Save display settings
        </Button>
      </div>
    </div>
  )
}

function PartnerEditor({ initial }: { initial?: AdminSitePartner }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [visible, setVisible] = useState(initial?.visible ?? true)
  const [linkActive, setLinkActive] = useState(initial?.linkActive ?? false)
  const [destinationUrl, setDestinationUrl] = useState(initial?.destinationUrl ?? "")
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    data.set("id", initial?.id ?? "")
    data.set("visible", String(visible))
    data.set("linkActive", String(linkActive))

    startTransition(async () => {
      const result = await saveSitePartner(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (!initial) {
        formRef.current?.reset()
        setVisible(true)
        setLinkActive(false)
        setDestinationUrl("")
        setLogoUrl(null)
      } else {
        const logoInput = form.querySelector<HTMLInputElement>('[name="logo"]')
        if (logoInput) logoInput.value = ""
        if (result.logoUrl !== undefined) setLogoUrl(result.logoUrl)
      }
      toast.success(initial ? "Partner updated." : "Partner added.")
      router.refresh()
    })
  }

  function remove() {
    if (!initial || !window.confirm(`Delete ${initial.name} from the partner list?`)) return
    startTransition(async () => {
      const result = await deleteSitePartner(initial.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Partner deleted.")
      router.refresh()
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-md border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${initial?.name ?? "Partner"} logo preview`}
              width={120}
              height={48}
              unoptimized
              className="h-10 w-auto max-w-32 object-contain"
            />
          ) : null}
          <h3 className="font-medium">{initial?.name ?? "Add a partner"}</h3>
        </div>
        {initial ? (
          <Button type="button" size="sm" variant="destructive" onClick={remove} disabled={pending}>
            <Trash2 data-icon="inline-start" /> Delete
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Partner name
          <Input
            name="name"
            defaultValue={initial?.name ?? ""}
            placeholder="StaffGPT"
            minLength={2}
            maxLength={80}
            required
            disabled={pending}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Destination URL (optional)
          <Input
            name="destinationUrl"
            type="url"
            value={destinationUrl}
            onChange={(event) => {
              const value = event.target.value
              setDestinationUrl(value)
              if (!value.trim()) setLinkActive(false)
            }}
            placeholder="https://example.com"
            maxLength={2048}
            disabled={pending}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
          Logo image (PNG, JPG, or WEBP; up to 3 MB)
          <Input name="logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={pending} />
        </label>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={visible}
            onChange={(event) => setVisible(event.target.checked)}
            className="size-4 accent-primary"
            disabled={pending}
          />
          Visible on home page
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={linkActive}
            onChange={(event) => setLinkActive(event.target.checked)}
            className="size-4 accent-primary"
            disabled={pending || !destinationUrl.trim()}
          />
          Link is active
        </label>
        <label className="flex items-center gap-2 text-sm">
          Sort order
          <Input
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={initial?.sortOrder ?? 0}
            className="w-24"
            disabled={pending}
          />
        </label>
      </div>

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ImageUp className="mr-2 size-4" />}
          {initial ? "Save partner" : "Add partner"}
        </Button>
      </div>
    </form>
  )
}
