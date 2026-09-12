"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  ImageIcon,
  Video,
  Box,
  Loader2,
  UploadCloud,
  Check,
} from "lucide-react"

export type UploadCategory = {
  value: string
  label: string
}

const CATEGORIES: UploadCategory[] = [
  { value: "photo", label: "Photos" },
  { value: "video", label: "Video walkthrough" },
  { value: "floor-plan", label: "Floor plans" },
  { value: "cad-dxf", label: "CAD / DXF" },
  { value: "spec", label: "Specs & docs" },
  { value: "permit", label: "Permits" },
  { value: "general", label: "Other" },
]

// Accept images, video, PDFs, Word/Excel/CSV, and CAD files.
const ACCEPT = ".pdf,.doc,.docx,.xlsx,.csv,.txt,.dxf,.dwg,image/*,video/*"

type Uploaded = {
  id: string
  name: string
  category: string
  kind: "image" | "video" | "cad" | "doc"
}

function kindFor(file: File): Uploaded["kind"] {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/") || ["mp4", "mov", "webm"].includes(ext)) return "video"
  if (["dxf", "dwg"].includes(ext)) return "cad"
  return "doc"
}

function KindIcon({ kind }: { kind: Uploaded["kind"] }) {
  const cls = "h-4 w-4 text-muted-foreground"
  if (kind === "image") return <ImageIcon className={cls} />
  if (kind === "video") return <Video className={cls} />
  if (kind === "cad") return <Box className={cls} />
  return <FileText className={cls} />
}

/**
 * Multi-file uploader used on the add-property flow and reusable elsewhere.
 * Uploads each file to /api/documents/upload against a known propertyId, so it
 * requires the property to exist first.
 */
export function PropertyMediaUploader({
  propertyId,
  onCountChange,
}: {
  propertyId: string
  onCountChange?: (count: number) => void
}) {
  const [category, setCategory] = useState("photo")
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<Uploaded[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadOne(file: File): Promise<boolean> {
    const form = new FormData()
    form.set("file", file)
    form.set("propertyId", propertyId)
    form.set("category", category)
    const res = await fetch("/api/documents/upload", { method: "POST", body: form })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(`${file.name}: ${json.error ?? "Upload failed"}`)
      return false
    }
    setItems((prev) => {
      const next = [{ id: json.id as string, name: file.name, category, kind: kindFor(file) }, ...prev]
      onCountChange?.(next.length)
      return next
    })
    return true
  }

  async function onFiles(files: FileList) {
    setBusy(true)
    try {
      // Upload sequentially so large videos don't all contend at once.
      for (const file of Array.from(files)) {
        await uploadOne(file)
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-medium">What kind of files are these?</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors " +
                (category === c.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted")
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:opacity-60"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <UploadCloud className="h-5 w-5 text-primary" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{busy ? "Uploading…" : "Click to add files"}</p>
          <p className="text-xs text-muted-foreground">
            Images, video, PDF, Word, and CAD (DXF/DWG). Up to 200 MB per video, 25 MB per file otherwise.
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
        }}
      />

      {items.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <KindIcon kind={it.kind} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.name}</p>
                <Badge variant="secondary" className="mt-0.5 capitalize">
                  {it.category.replace("-", " ")}
                </Badge>
              </div>
              <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Uploaded" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
