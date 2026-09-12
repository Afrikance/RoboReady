// Client-safe assessment lifecycle definitions shared by the background engine
// (lib/assessment/lifecycle.ts) and the client-facing progress tracker. No
// server-only imports here so it can be bundled for the browser.

export type AssessmentStage =
  | "queued"
  | "analyzing"
  | "designing"
  | "planning"
  | "reporting"
  | "ready"
  | "failed"

/** Ordered pipeline stages, excluding the terminal `failed`. */
export const STAGE_ORDER: AssessmentStage[] = [
  "queued",
  "analyzing",
  "designing",
  "planning",
  "reporting",
  "ready",
]

/** The stages shown as tracker steps (queued is folded into "Payment confirmed"). */
export const TRACKER_STAGES: Exclude<AssessmentStage, "queued" | "failed">[] = [
  "analyzing",
  "designing",
  "planning",
  "reporting",
  "ready",
]

type StageCopy = { label: string; description: string }

export const STAGE_COPY: Record<AssessmentStage, StageCopy> = {
  queued: {
    label: "Payment confirmed",
    description: "Your assessment is queued and about to begin.",
  },
  analyzing: {
    label: "Assessing readiness",
    description: "Our AI analyst is scoring your property against the RoboReady model.",
  },
  designing: {
    label: "Designing site concept",
    description: "Mapping arrival zones, pickup points, and the passenger journey.",
  },
  planning: {
    label: "Planning infrastructure",
    description: "Specifying the charging, landing, and wayfinding assets your site needs.",
  },
  reporting: {
    label: "Compiling your report",
    description: "Assembling findings, recommendations, and your RoboReady Score into a report.",
  },
  ready: {
    label: "Ready to download",
    description: "Your AI assessment is complete and ready to download as a PDF.",
  },
  failed: {
    label: "Needs attention",
    description: "Something interrupted your assessment. Our team has been notified.",
  },
}

export function stageIndex(stage: AssessmentStage): number {
  const i = STAGE_ORDER.indexOf(stage)
  return i < 0 ? 0 : i
}

/** True when `stage` is complete relative to the run's current stage. */
export function isStageComplete(current: AssessmentStage, stage: AssessmentStage): boolean {
  if (current === "ready") return true
  return stageIndex(current) > stageIndex(stage)
}

export function isTerminal(stage: AssessmentStage): boolean {
  return stage === "ready" || stage === "failed"
}

/** 0-100 progress for a progress bar. */
export function stageProgress(stage: AssessmentStage): number {
  if (stage === "failed") return 100
  if (stage === "ready") return 100
  // queued..reporting map across the bar; reporting sits near the end.
  const denom = STAGE_ORDER.length - 1 // ready is the last
  return Math.round((stageIndex(stage) / denom) * 100)
}
