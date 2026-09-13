"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Circle, Loader2, AlertTriangle, FileText, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TierPicker } from "@/components/assessment/tier-picker"
import { CyberFleetCta } from "@/components/cyber-fleet/cyber-fleet-cta"
import type { ReferralCtaData } from "@/lib/cyber-fleet"
import {
  getAssessmentRunState,
  resumeAssessmentRun,
  tickAssessmentRun,
  type AssessmentRunState,
} from "@/app/actions/assessment-run"
import {
  STAGE_COPY,
  TRACKER_STAGES,
  isStageComplete,
  stageIndex,
  stageProgress,
  type AssessmentStage,
} from "@/lib/assessment/stages"
import type { AssessmentTierId } from "@/lib/products"

const POLL_MS = 4000

export function ClientAssessment({
  propertyId,
  initialState,
  purchasedTier,
  cyberFleet,
}: {
  propertyId: string
  initialState: AssessmentRunState
  purchasedTier: AssessmentTierId | null
  cyberFleet?: ReferralCtaData | null
}) {
  const router = useRouter()
  const [state, setState] = useState<AssessmentRunState>(initialState)
  const wasReady = useRef(initialState.stage === "ready")

  // The server re-renders (via router.refresh) after a payment completes, which
  // is when a run first exists. useState won't pick up the new prop on its own,
  // so mirror a server-reported run into local state — this is what flips the
  // view from the purchase prompt to the live tracker right after checkout.
  useEffect(() => {
    setState((prev) => {
      if (initialState.exists && (!prev.exists || stageIndex(initialState.stage) > stageIndex(prev.stage))) {
        return initialState
      }
      return prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialState.exists, initialState.stage])

  // Drive the pipeline forward and self-heal a stalled run: each poll ticks the
  // run one step server-side (the per-step lock makes this safe alongside the
  // background worker) and reflects the new state.
  const poll = useCallback(async () => {
    try {
      const next = await tickAssessmentRun(propertyId)
      setState(next)
      if (next.stage === "ready" && !wasReady.current) {
        wasReady.current = true
        // Re-render the server page so the finished report/score appears.
        router.refresh()
      }
      return next
    } catch {
      // Fall back to a read-only fetch if ticking is not permitted.
      try {
        const s = await getAssessmentRunState(propertyId)
        setState(s)
        return s
      } catch {
        return null
      }
    }
  }, [propertyId, router])

  useEffect(() => {
    if (!state.exists || state.done) return
    let active = true
    const id = setInterval(() => {
      if (active) void poll()
    }, POLL_MS)
    // Kick immediately so the client doesn't wait a full interval.
    void poll()
    return () => {
      active = false
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.exists, state.done])

  // Pre-purchase: no run yet → show the purchase flow.
  if (!state.exists) {
    return <PurchasePrompt propertyId={propertyId} purchasedTier={purchasedTier} />
  }

  if (state.stage === "failed") {
    return (
      <FailedState
        error={state.error}
        onRetry={async () => {
          const next = await resumeAssessmentRun(propertyId)
          setState(next)
        }}
      />
    )
  }

  if (state.stage === "ready") {
    return <ReadyState propertyId={propertyId} cyberFleet={cyberFleet} />
  }

  return <Tracker stage={state.stage} />
}

function PurchasePrompt({
  propertyId,
  purchasedTier,
}: {
  propertyId: string
  purchasedTier: AssessmentTierId | null
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-balance">Get your RoboReady assessment</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          Choose a package below. As soon as your payment clears, our AI workforce starts assessing your property and
          you can track every stage right here — no waiting on a callback.
        </p>
      </div>
      <TierPicker propertyId={propertyId} purchasedTier={purchasedTier} />
    </div>
  )
}

function Tracker({ stage }: { stage: AssessmentStage }) {
  const pct = stageProgress(stage)
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <div>
            <h2 className="text-base font-semibold">Assessment in progress</h2>
            <p className="text-sm text-muted-foreground">{STAGE_COPY[stage].description}</p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol className="space-y-3">
        {TRACKER_STAGES.map((s) => {
          const complete = isStageComplete(stage, s)
          const active = stage === s
          return (
            <li
              key={s}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
              aria-current={active ? "step" : undefined}
            >
              <span className="mt-0.5 shrink-0">
                {complete ? (
                  <CheckCircle2 className="size-5 text-[var(--score-high)]" />
                ) : active ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <Circle className="size-5 text-muted-foreground/40" />
                )}
              </span>
              <div>
                <p className={`text-sm font-medium ${!complete && !active ? "text-muted-foreground" : ""}`}>
                  {STAGE_COPY[s].label}
                </p>
                {active ? (
                  <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{STAGE_COPY[s].description}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
      <p className="text-center text-xs text-muted-foreground">
        You can leave this page — we&apos;ll email you and drop an in-app notification as each stage completes.
      </p>
    </div>
  )
}

function ReadyState({ propertyId, cyberFleet }: { propertyId: string; cyberFleet?: ReferralCtaData | null }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center rounded-xl border border-[var(--score-high)]/40 bg-[var(--score-high)]/5 px-6 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--score-high)]/15 text-[var(--score-high)]">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-balance">Your assessment is ready</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
          Your RoboReady report is complete. View it online or download a PDF to share with your team and contractors.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href={`/portal/${propertyId}`}>
              <FileText className="mr-2 size-4" /> View &amp; download report
            </Link>
          </Button>
        </div>
      </div>

      {cyberFleet ? <CyberFleetCta propertyId={propertyId} data={cyberFleet} /> : null}
    </div>
  )
}

function FailedState({ onRetry, error }: { onRetry: () => Promise<unknown>; error: string | null }) {
  const [retrying, setRetrying] = useState(false)
  return (
    <div className="flex flex-col items-center rounded-xl border border-[var(--score-low)]/40 bg-[var(--score-low)]/5 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--score-low)]/15 text-[var(--score-low)]">
        <AlertTriangle className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-balance">Your assessment hit a snag</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">
        {error
          ? "Something interrupted the assessment. You can resume it now, or our team will pick it up shortly."
          : "Something interrupted the assessment. You can resume it now."}
      </p>
      <Button
        className="mt-5"
        disabled={retrying}
        onClick={async () => {
          setRetrying(true)
          await onRetry()
          setRetrying(false)
        }}
      >
        {retrying ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Resume assessment
      </Button>
    </div>
  )
}
