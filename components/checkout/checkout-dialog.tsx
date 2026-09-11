"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { confirmPayment, type CheckoutStart } from "@/app/actions/payments"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CheckCircle2, CreditCard } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string)

export function CheckoutDialog({
  start,
  triggerLabel,
  title,
  priceLabel,
  variant = "default",
  size = "default",
}: {
  start: () => Promise<CheckoutStart>
  triggerLabel: string
  title: string
  priceLabel: string
  variant?: "default" | "secondary" | "outline"
  size?: "default" | "sm"
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const paymentIdRef = useRef<string | null>(null)
  const router = useRouter()

  const fetchClientSecret = useCallback(async () => {
    const res = await start()
    paymentIdRef.current = res.paymentId
    return res.clientSecret
  }, [start])

  const onComplete = useCallback(() => {
    const pid = paymentIdRef.current
    if (!pid) return
    confirmPayment(pid).then((r) => {
      if (r.ok) {
        setDone(true)
        toast.success("Payment received")
        router.refresh()
      } else {
        toast.error(r.error)
      }
    })
  }, [router])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setDone(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <CreditCard className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-[var(--score-high)]" />
            <p className="text-sm font-medium">Payment complete</p>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            <p className="mb-3 text-sm text-muted-foreground text-pretty">{priceLabel}</p>
            {open ? (
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret, onComplete }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
