"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createLead } from "@/app/actions/leads"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Plus } from "lucide-react"

export function NewLeadDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const f = new FormData(e.currentTarget)
    const est = Number(f.get("estimatedValue"))
    const res = await createLead({
      company: String(f.get("company") ?? ""),
      contactName: String(f.get("contactName") ?? ""),
      contactEmail: String(f.get("contactEmail") ?? ""),
      contactPhone: String(f.get("contactPhone") ?? ""),
      source: String(f.get("source") ?? ""),
      estimatedValue: Number.isNaN(est) || est === 0 ? null : est,
      notes: String(f.get("notes") ?? ""),
    })
    setLoading(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Lead added")
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" required placeholder="Harbor Logistics" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactName">Contact name</Label>
            <Input id="contactName" name="contactName" placeholder="Jane Doe" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" name="source" placeholder="Website, referral..." />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" name="contactEmail" type="email" placeholder="jane@harbor.co" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactPhone">Phone</Label>
            <Input id="contactPhone" name="contactPhone" placeholder="(555) 123-4567" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="estimatedValue">Estimated value (USD)</Label>
            <Input id="estimatedValue" name="estimatedValue" type="number" min={0} placeholder="50000" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="What are they looking for?" />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Add lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
