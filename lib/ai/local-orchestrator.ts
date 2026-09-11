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
      "Analyze the property and intake answers. RoboReady's PRIMARY use case is robotaxi / CyberCab (autonomous ride-hail such as Waymo, Tesla Cybercab, Zoox) pick-up and drop-off — weight the robotaxi intake answers (curbside PUDO, AV staging/parking, fast-charging, local permitting/geofencing, ADA loading) heavily, then account for any secondary use cases. Produce a rigorous RoboReady Score (0-100) with a per-category breakdown across access, connectivity, layout, and goals. Be specific and honest — a property with no viable curbside pick-up/drop-off should score low for robotaxi readiness. Ground every finding in the provided data.",
  },
  "site-concept": {
    schema: siteConceptSchema,
    instructions:
      "Using the assessment, design a practical site concept. Lead with the robotaxi / CyberCab experience — where AVs enter, pick up and drop off passengers (PUDO), stage while idle, and charge — then cover any secondary autonomous systems. Name the zones, their purpose, and which autonomous systems operate where. Keep it grounded in the property's real constraints.",
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
      "Design circulation for this property. Prioritize the primary robotaxi / CyberCab use case: use mode 'robotaxi' for curb-to-entrance passenger handoff routes between pick-up/drop-off zones and building entrances, then add robot/drone routes. Include clearance requirements and machine-readable signage/beacon placements. Ground it in the property's real layout and assessment.",
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
