"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { offerAssessment } from "@/app/actions/offers"
import { ASSESSMENT_TIERS, type AssessmentTierId } from "@/lib/products"
import { cn } from "@/lib/utils"

function priceLabel(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export function OfferAssessment({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [tier, setTier] = useState<AssessmentTierId>("standard")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function submit() {
    startTransition(async () => {
      const res = await offerAssessment(propertyId, email, tier)
      if (res.ok) {
        toast.success("Assessment offer sent")
        setOpen(false)
        setEmail("")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="mr-2 h-4 w-4" /> Offer assessment to client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Offer an assessment</DialogTitle>
          <DialogDescription className="text-pretty">
            Invite the owner of {propertyName} to purchase and track a RoboReady assessment. They&apos;ll get an email
            and, once signed in, this property in their portfolio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="offer-email" className="text-sm font-medium">
              Client email
            </label>
            <input
              id="offer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@company.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Recommended package</span>
            <div className="space-y-2">
              {ASSESSMENT_TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTier(t.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm",
                    tier === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60",
                  )}
                >
                  <span>
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{priceLabel(t.priceInCents)}</span>
                  </span>
                  {tier === t.id ? <Check className="size-4 text-primary" /> : null}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={submit} disabled={pending || !email} className="w-full">
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
            Send offer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
