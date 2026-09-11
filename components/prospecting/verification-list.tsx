"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, Phone, BadgeCheck, Undo2, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { verifyProperty, returnToField } from "@/app/actions/prospecting"
import {
  filterProperties,
  distanceFrom,
  readPrefill,
  propertyTypeLabel,
  type ProspectRow,
  type PropertyFilter,
} from "@/lib/prospecting/filter"
import { QueueFilterBar } from "@/components/prospecting/queue-filter-bar"

export function VerificationList({ initialRows }: { initialRows: ProspectRow[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<PropertyFilter>({})
  const [verifying, setVerifying] = useState<string | null>(null)
  const filtered = useMemo(() => filterProperties(initialRows, filter), [initialRows, filter])

  function verify(id: string) {
    setVerifying(id)
    verifyProperty(id).then((res) => {
      setVerifying(null)
      if (res.ok) {
        toast.success("Property verified. Ready for assessment.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  if (initialRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <BadgeCheck className="mb-3 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">Nothing to verify</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
          Submitted field forms will appear here for your review before assessment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <QueueFilterBar value={filter} onChange={setFilter} count={filtered.length} />
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No submissions match these filters.
        </p>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((p) => {
            const prefill = readPrefill(p.metadata)
            const miles = distanceFrom(p, filter.ref)
            return (
              <li key={p.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{p.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{propertyTypeLabel(p.propertyType)}</Badge>
                      {miles != null ? <span className="text-xs text-muted-foreground">{miles.toFixed(1)} mi</span> : null}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {[p.addressLine1, p.city, p.region, p.postalCode].filter(Boolean).join(", ") || "No address"}
                    </p>
                    {p.phone ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" /> {p.phone}
                      </p>
                    ) : null}
                    {prefill?.summary ? (
                      <p className="mt-2 text-xs text-muted-foreground text-pretty">{prefill.summary}</p>
                    ) : null}
                    <Link
                      href={`/dashboard/properties/${p.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Review full intake <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="flex flex-col items-stretch gap-2">
                    <Button size="sm" onClick={() => verify(p.id)} disabled={verifying === p.id}>
                      <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                      {verifying === p.id ? "Verifying…" : "Verify"}
                    </Button>
                    <ReturnDialog propertyId={p.id} onDone={() => router.refresh()} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ReturnDialog({ propertyId, onDone }: { propertyId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = await returnToField(propertyId, note)
      if (res.ok) {
        toast.success("Returned to the field team.")
        setOpen(false)
        setNote("")
        onDone()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Return
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return to field work</DialogTitle>
          <DialogDescription>
            Reopen this intake for the field team with a note on what still needs collecting.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs">Note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Missing corridor width measurements and elevator type."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || note.trim().length === 0}>
            {pending ? "Returning…" : "Return to field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
