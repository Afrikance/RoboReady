"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ImageUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"
import { removeOrgLogo } from "@/app/actions/branding"

export function LogoUploader({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/branding/upload", { method: "POST", body })
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string }
      if (!res.ok || !data.ok || !data.url) {
        toast.error(data.error ?? "Upload failed.")
        return
      }
      setLogoUrl(data.url)
      toast.success("Logo updated.")
      router.refresh()
    } catch {
      toast.error("Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  function remove() {
    startTransition(async () => {
      const res = await removeOrgLogo()
      if (res.ok) {
        setLogoUrl(null)
        toast.success("Logo removed. Using the default RoboReady mark.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="mt-5 flex flex-col gap-4 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted/40">
          <Logo size="md" showWordmark={false} imageUrl={logoUrl} />
        </div>
        <div>
          <p className="text-sm font-medium">Workspace logo</p>
          <p className="text-sm text-muted-foreground text-pretty">
            {logoUrl
              ? "Shown in the dashboard sidebar and header. PNG, JPG, WEBP, SVG, or GIF up to 5 MB."
              : "Upload your own mark to replace the default RoboReady logo. Up to 5 MB."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="sr-only"
          onChange={onFile}
        />
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading || pending}>
          <ImageUp className="h-4 w-4" /> {uploading ? "Uploading…" : logoUrl ? "Replace" : "Upload"}
        </Button>
        {logoUrl ? (
          <Button size="sm" variant="outline" onClick={remove} disabled={uploading || pending}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        ) : null}
      </div>
    </div>
  )
}
