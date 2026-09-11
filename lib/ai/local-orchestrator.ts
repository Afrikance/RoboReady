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
      "Analyze the property and intake answers. Produce a rigorous RoboReady Score (0-100) with a per-category breakdown across access, connectivity, layout, and goals. Be specific and honest — a poorly-suited property should score low. Ground every finding in the provided data.",
  },
  "site-concept": {
    schema: siteConceptSchema,
    instructions:
      "Using the assessment, design a practical site concept: name the zones, their purpose, and which autonomous systems operate where. Keep it grounded in the property's real constraints.",
  },
  "infrastructure-plan": {
    schema: infrastructurePlanSchema,
    instructions:
      "Recommend physical infrastructure assets with realistic quantities and indicative US-dollar unit costs. Only recommend what the assessment and goals justify.",
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
      "Design robot/drone circulation for this property: named routes between key zones with clearance requirements, plus machine-readable signage/beacon placements. Ground it in the property's real layout and assessment.",
  },
  accessibility: {
    schema: accessibilitySchema,
    instructions:
      "Audit this property for accessibility as it intersects with autonomous operations. Produce a 0-100 score and specific findings by area with severity and recommendations. Set needsProfessionalVerification=true for anything that legally or practically requires a licensed professional to confirm — err toward flagging.",
  },
  "ev-plan": {
    schema: evPlanSchema,
    instructions:
      "Plan EV and robot charging for this property. Recommend a realistic station mix and counts, estimate peak electrical load and whether a service upgrade is likely, and give indicative installed unit costs in USD. Only recommend what the property's scale and goals justify.",
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
