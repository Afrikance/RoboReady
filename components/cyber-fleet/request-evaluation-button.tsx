"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PARTNER } from "@/lib/cyber-fleet"
import { requestCyberFleetEvaluation } from "@/app/actions/cyber-fleet"

/**
 * A button that opens the Cyber Fleet evaluation request dialog. Shared by the
 * report/portal CTA and the referrals list so the request flow lives in one
 * place.
 */
export function RequestEvaluationButton({
  propertyId,
  defaultName = "",
  defaultEmail = "",
  label = "Request an evaluation",
  variant = "default",
  size = "default",
  className,
  icon = <ShieldCheck className="mr-2 size-4" />,
}: {
  propertyId: string
  defaultName?: string | null
  defaultEmail?: string | null
  label?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg"
  className?: string
  icon?: ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    contactName: defaultName ?? "",
    contactEmail: defaultEmail ?? "",
    contactPhone: "",
    notes: "",
  })

  function submit() {
    startTransition(async () => {
      const res = await requestCyberFleetEvaluation(propertyId, form)
      if (res.ok) {
        toast.success(`${PARTNER.name} evaluation requested — our team will be in touch.`)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {icon}
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a {PARTNER.name} evaluation</DialogTitle>
            <DialogDescription className="text-pretty">
              Confirm how the {PARTNER.name} team should reach you. We&apos;ll pass along your RoboReady assessment so
              they can prepare a tailored fleet plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cf-name">Contact name</Label>
              <Input
                id="cf-name"
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cf-email">Email</Label>
                <Input
                  id="cf-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-phone">Phone (optional)</Label>
                <Input
                  id="cf-phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-notes">Anything specific you want covered? (optional)</Label>
              <Textarea
                id="cf-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Priorities, timelines, problem areas…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ArrowRight className="mr-2 size-4" />}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
