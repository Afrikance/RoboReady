"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteDocument } from "@/app/actions/documents"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { FileText, ImageIcon, Trash2, Upload, Download, Loader2 } from "lucide-react"

type Doc = {
  id: string
  name: string
  category: string
  url: string
  contentType: string | null
  sizeBytes: number | null
  createdAt: Date | string
}

const CATEGORIES = ["general", "floor-plan", "photo", "spec", "permit"]

function formatSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentPanel({ propertyId, initialDocs }: { propertyId: string; initialDocs: Doc[] }) {
  const [category, setCategory] = useState("general")
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function onFile(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.set("file", file)
      form.set("propertyId", propertyId)
      form.set("category", category)
      const res = await fetch("/api/documents/upload", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Upload failed")
      toast.success("Document uploaded")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteDocument(id)
        toast.success("Document removed")
        router.refresh()
      } catch {
        toast.error("Could not remove document")
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Upload floor plans, photos, permits, and specs</p>
            <p className="text-xs text-muted-foreground">PDF, images, spreadsheets — up to 25 MB each</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  "rounded-md border px-3 py-1 text-xs capitalize transition-colors " +
                  (category === c ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")
                }
              >
                {c.replace("-", " ")}
              </button>
            ))}
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {uploading ? "Uploading..." : "Choose file"}
          </Button>
        </div>
      </div>

      {initialDocs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {initialDocs.map((doc) => {
            const isImage = doc.contentType?.startsWith("image/")
            return (
              <li key={doc.id} className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  {isImage ? (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="secondary" className="mr-2 capitalize">
                      {doc.category.replace("-", " ")}
                    </Badge>
                    {formatSize(doc.sizeBytes)}
                  </p>
                </div>
                <a
                  href={`/api/documents/file?pathname=${encodeURIComponent(doc.url)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Download ${doc.name}`}
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => remove(doc.id)}
                  disabled={pending}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${doc.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
