import "server-only"

import { generateText, Output } from "ai"
import type { z } from "zod"
import type { StaffGPTAdapter, DispatchRequest, DispatchResult } from "@/lib/ai/adapter"
import { getEmployee } from "@/lib/ai/employees"
import {
  assessmentSchema,
  siteConceptSchema,
  infrastructurePlanSchema,
  reportSchema,
  leadQualificationSchema,
  wayfindingSchema,
  accessibilitySchema,
  evPlanSchema,
  proposalSchema,
} from "@/lib/ai/schemas"

const MODEL = "google/gemini-3.5-flash"

// jobType → schema + task instructions. Adding a new AI job = adding an entry.
const JOBS: Record<string, { schema: z.ZodTypeAny; instructions: string }> = {
  assessment: {
    schema: assessmentSchema,
    instructions:
      "You are the Property Assessment Specialist. Produce the standardized RoboReady Autonomous-Arrival Readiness Assessment. RoboReady's PRIMARY use case is robotaxi / CyberCab arrival (autonomous ride-hail such as Waymo, Tesla Cybercab, Zoox) — passenger pick-up and drop-off at the property. Score EXACTLY these 8 categories, each awarded points out of its cap: Curb Readiness (curb, /20), Wayfinding (/15), Accessibility (/15), Passenger Experience (passenger, /15), Signage (/10), Infrastructure (/10), Traffic / Pedestrian Flow (traffic, /10), Future Expansion (future, /5). The overall roboReadyScore must equal the sum of the awarded points (0-100). For EVERY category you MUST provide: points, an explanation, an evidence array citing the specific property/intake facts used, a confidence level, and concrete recommendations. NEVER fabricate a missing fact — if something is unknown, say so in the evidence and lower both the points and the confidence. Be specific and honest: a property with no viable curbside pick-up/drop-off should score low on Curb Readiness and Passenger Experience.",
  },
  "site-concept": {
    schema: siteConceptSchema,
    instructions:
      "You are the Site Intelligence Specialist. Decide WHERE the autonomous arrival infrastructure should go. Using the assessment, recommend robotaxi / CyberCab pickup zones: always a PRIMARY pickup/drop-off zone and an ACCESSIBLE boarding zone, plus an OVERFLOW/surge zone where the property warrants it. For each zone give its location relative to the main entrance, curb, and parking; the rationale; and potential conflicts with vehicle traffic, pedestrian flow, existing rideshare zones, loading, or emergency access. Then describe the broader concept and any operational zones. Never present an AI recommendation as an engineering approval. Keep everything grounded in the property's real constraints.",
  },
  "infrastructure-plan": {
    schema: infrastructurePlanSchema,
    instructions:
      "Recommend physical infrastructure assets with realistic quantities and indicative US-dollar unit costs. Prioritize the primary robotaxi / CyberCab use case (robotaxi-stand berths and pudo-zone pick-up/drop-off areas) before secondary assets. Only recommend what the assessment and goals justify.",
  },
  report: {
    schema: reportSchema,
    instructions:
      "Write a clear, client-ready report from the assessment, site concept, and infrastructure plan. Professional but readable; no jargon dumps.",
  },
  "lead-qualification": {
    schema: leadQualificationSchema,
    instructions:
      "Qualify this sales lead for autonomous-readiness services. Score fit 0-100, rate hot/warm/cold, infer a budget band and likely needs, and recommend concrete next actions. Ground everything in the lead details provided; if information is thin, say so and lean cold.",
  },
  wayfinding: {
    schema: wayfindingSchema,
    instructions:
      "Design circulation for this property, centered on the primary robotaxi / CyberCab use case. (1) passengerJourney: produce an ordered, plain-language route a HOTEL GUEST follows from their room / start point (use the interior survey fields: guestPathStart, path steps, elevators, doors, landmarks, pickup elevation) to the robotaxi LandingPad / pickup zone — each step has a location, a clear instruction, a confirming landmark, a mode (walk/elevator/outdoor), and the boarding signal to expect. (2) boardingSignals: give the guest-facing signal legend — Blue = vehicle reserved and en route (start walking); Amber = arriving, get ready at the boarding line; GREEN FLASHING = doors open, board now; Red = do not approach (maneuvering/emergency). (3) routes: use mode 'robotaxi' for curb-to-entrance handoff plus robot/drone routes with clearance requirements. (4) signage: machine-readable signage/beacon placements. Ground everything in the property's real layout, interior survey, and assessment.",
  },
  accessibility: {
    schema: accessibilitySchema,
    instructions:
      "Audit this property for accessibility as it intersects with autonomous operations. Produce a 0-100 score and specific findings by area with severity and recommendations. Set needsProfessionalVerification=true for anything that legally or practically requires a licensed professional to confirm — err toward flagging.",
  },
  "ev-plan": {
    schema: evPlanSchema,
    instructions:
      "Plan charging for this property with the primary robotaxi / CyberCab use case in mind — autonomous ride-hail fleets need high-throughput DC fast charging to stay in service. Recommend a realistic station mix and counts (favoring dc-fast where robotaxi operations are planned), estimate peak electrical load and whether a service upgrade is likely, and give indicative installed unit costs in USD. Only recommend what the property's scale and goals justify.",
  },
  proposal: {
    schema: proposalSchema,
    instructions:
      "Write a persuasive, itemized commercial proposal from the property's assessment and plans. Include a compelling summary and clear line items with realistic USD unit prices. Do not invent work the plans don't support.",
  },
}

/**
 * Fulfils AI-employee jobs locally via the Vercel AI Gateway. This is the
 * default adapter until the real StaffGPT API is available. It deliberately
 * mimics what the StaffGPT adapter will do: pick the right specialist, run the
 * job, return structured output + reasoning + the raw response.
 */
export class LocalOrchestrator implements StaffGPTAdapter {
  readonly kind = "local" as const

  async dispatch<TInput, TOutput>(req: DispatchRequest<TInput>): Promise<DispatchResult<TOutput>> {
    const employee = getEmployee(req.employeeSlug)
    const job = JOBS[req.jobType]
    if (!job) throw new Error(`Unknown jobType: ${req.jobType}`)

    const system = [
      `You are ${employee.name}, a ${employee.title} on the ${employee.department} team.`,
      `Mission: ${employee.mission}`,
      `Task: ${job.instructions}`,
      `Respond only with data that fits the required schema.`,
    ].join("\n")

    const result = await generateText({
      model: MODEL,
      system,
      prompt: JSON.stringify(req.input, null, 2),
      output: Output.object({ schema: job.schema }),
    })

    return {
      output: result.output as TOutput,
      reasoning: `${employee.name} (${employee.title}) via local orchestrator`,
      raw: result.output,
    }
  }
}
