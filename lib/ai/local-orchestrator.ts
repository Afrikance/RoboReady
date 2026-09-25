import "server-only"

import { generateText, Output } from "ai"
import type { z } from "zod"
import type { StaffGPTAdapter, DispatchRequest, DispatchResult } from "@/lib/ai/adapter"
import { getEmployee, type AIEmployee } from "@/lib/ai/employees"
import {
  assessmentSchema,
  premiumAssessmentSchema,
  siteConceptSchema,
  sitePlanDesignSchema,
  infrastructurePlanSchema,
  reportSchema,
  leadQualificationSchema,
  wayfindingSchema,
  accessibilitySchema,
  evPlanSchema,
  proposalSchema,
  prospectPropertiesSchema,
  intakePrefillSchema,
  networkSearchSchema,
  robosearchDiscoverySchema,
} from "@/lib/ai/schemas"

const MODEL = "google/gemini-3.5-flash"

export type AiJobDef = { schema: z.ZodTypeAny; instructions: string }

// jobType → schema + task instructions. Adding a new AI job = adding an entry.
const JOBS: Record<string, AiJobDef> = {
  assessment: {
    schema: assessmentSchema,
    instructions:
      "You are the Property Assessment Specialist. Produce the standardized RoboReady Autonomous-Arrival Readiness Assessment. RoboReady's PRIMARY use case is robotaxi / CyberCab arrival (autonomous ride-hail such as Waymo, Tesla Cybercab, Zoox) — passenger pick-up and drop-off at the property. Score EXACTLY these 8 categories, each awarded points out of its cap: Curb Readiness (curb, /20), Wayfinding (/15), Accessibility (/15), Passenger Experience (passenger, /15), Signage (/10), Infrastructure (/10), Traffic / Pedestrian Flow (traffic, /10), Future Expansion (future, /5). The overall roboReadyScore must equal the sum of the awarded points (0-100). For EVERY category you MUST provide: points, an explanation, an evidence array citing the specific property/intake facts used, a confidence level, and concrete recommendations. NEVER fabricate a missing fact — if something is unknown, say so in the evidence and lower both the points and the confidence. Be specific and honest: a property with no viable curbside pick-up/drop-off should score low on Curb Readiness and Passenger Experience.",
  },
  "premium-assessment": {
    schema: premiumAssessmentSchema,
    instructions:
      "You are the Property Assessment Specialist producing the PREMIUM multi-domain readiness roll-up. The canonical robotaxi-arrival score is handled separately (Domain 1) — do NOT re-score it. Score EVERY key point in the other five domains, each awarded points out of its cap: " +
      "EV & Charging Network (20) — ev-electrical (electrical service & spare capacity, /5), ev-stalls (existing charging stalls, /3), ev-dcfast (DC fast-charging feasibility, /4), ev-network (charging network site suitability, /3), ev-storage (energy storage/solar/resilience, /3), ev-grid (grid-upgrade & expansion path, /2); " +
      "Physical AI & Robotics (15) — rob-workflows (repetitive/automatable workflows, /3), rob-environment (operating environment, /3), rob-routes (internal access & route continuity, /3), rob-staffing (staffing patterns & human-robot handoff, /2), rob-docking (robot charging/storage/docking, /2), rob-connectivity (connectivity & positioning, /2); " +
      "Autonomous Delivery (15) — del-access (site access for device/van, /2), del-routes (sidewalks/routes/pedestrian environment, /3), del-handoff (delivery handoff, /2), del-loading (loading areas, /2), del-building (building access, /2), del-security (security, /2), del-ops (operational workflows & storage, /2); " +
      "Air Taxi / eVTOL (20) — air-pad (landing pad / touchdown area incl. rooftop, /5), air-clearance (power-line & tall-tree clearance, /4), air-approach (approach/departure path obstructions, /3), air-siting (separation from traffic & crowds, /3), air-beacon (high-elevation guide-beacon mounting, /3), air-access (airspace & pad-to-building access, /2); " +
      "AI-Enabled Operations (5) — ops-bms (BMS/building-automation integration, /2), ops-telemetry (data/telemetry & operational readiness, /2), ops-governance (governance/staffing for AI ops, /1). " +
      "For EVERY key point provide points, an explanation, an evidence array citing the exact intake/property facts used, a confidence level, and concrete recommendations. NEVER fabricate a missing fact — if something is unknown, say so in the evidence and lower both points and confidence. Grounded strictly in the property's intake and profile; this is an AI readiness estimate, never an engineering approval.",
  },
  "site-concept": {
    schema: siteConceptSchema,
    instructions:
      "You are the Site Intelligence Specialist. Decide WHERE the autonomous arrival infrastructure should go. Using the assessment, recommend robotaxi / CyberCab pickup zones: always a PRIMARY pickup/drop-off zone and an ACCESSIBLE boarding zone, plus an OVERFLOW/surge zone where the property warrants it. For each zone give its location relative to the main entrance, curb, and parking; the rationale; and potential conflicts with vehicle traffic, pedestrian flow, existing rideshare zones, loading, or emergency access. Then describe the broader concept and any operational zones. Never present an AI recommendation as an engineering approval. Keep everything grounded in the property's real constraints.",
  },
  "site-plan": {
    schema: sitePlanDesignSchema,
    instructions:
      "You are the Site Intelligence Specialist producing two schematic drawings for this property, centered on the primary robotaxi / CyberCab use case. (1) floorPlan — an INTERIOR floor plan of the level where the passenger journey happens, laid out on a 0-100 grid: place rooms, corridors, lobby, elevator/stairs, and the exit toward the pickup as non-overlapping rectangles, then trace the passenger's walking route as an ordered `path` from their start point to that exit, and drop markers (start, elevator, turn, exit). Ground it in the interior survey fields (guestPathStart, path steps, elevator type, door types, narrowest width, landmarks, elevation change). (2) sitePlan — an EXTERIOR site plan on a 0-100 grid: place the building footprint, arrival drive, curb, primary/overflow/accessible robotaxi pickup pads, parking, and landscaping as rectangles, and drop arrival markers with their role. Keep both layouts legible and realistically proportioned to the property. Also write two vivid, specific text-to-image prompts (floorPlanImagePrompt, sitePlanImagePrompt) for clean top-down architectural illustrations of each plan. Never invent facts the inputs don't support; when a dimension is unknown, lay out a reasonable typical arrangement and keep it generic.",
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
  "prospect-properties": {
    schema: prospectPropertiesSchema,
    instructions:
      "You are the Property Prospector. Given a target city, state, property type, and count, propose that many realistic CANDIDATE commercial properties of that type in that market that would benefit from autonomous-arrival (robotaxi) infrastructure. For each, give the likely business name, best-fit propertyType, a best-effort street address, city, region (state), postal code, main phone, and best-effort latitude/longitude for mapping. These are UNVERIFIED prospecting leads for a human to confirm — say so in each note and never fabricate a precise phone or address you are not reasonably confident about (use an empty string, and 0 for unknown coordinates). Do not duplicate names. Prefer well-known real venues/organizations in that city when you are confident they exist.",
  },
  "prefill-intake": {
    schema: intakePrefillSchema,
    instructions:
      "You are the Intake Pre-Filler. The input includes the property, its type, and a `fields` list (each with id, label, type, and options). Fill ONLY the intake fields you can answer with medium-to-high confidence from general public knowledge of this property or of how this KIND of property is typically built (e.g. a modern hotel usually has automatic sliding doors and standard elevators). Use ONLY field ids from the provided list. For select/multiselect fields, choose only from the given options (multiselect = comma-separated). For boolean fields use 'true'/'false'. NEVER guess exact on-site measurements (corridor/path widths in cm, elevation change, precise counts) or anything requiring a site visit — put those field ids in `leftBlank` for the field operator. It is correct and expected to leave many fields blank. Summarize what you filled versus what you left for the operator.",
  },
  "discover-entity": {
    schema: robosearchDiscoverySchema,
    instructions:
      "You are RoboScout, the discovery specialist for RoboSearch — the intelligence engine that maps the autonomous world (robots, manufacturers, operators, autonomous vehicles, autonomous-ready properties, infrastructure, and the companies behind them). The input has `market` (a place or segment to search), `entityKind` (the canonical RoboGraph kind to find), and `count` (roughly how many candidates to propose). Propose up to `count` REAL, CANDIDATE entities of that kind relevant to that market. For each entity give its canonical `name`, a neutral `summary`, an overall `confidence`, and a set of `claims` — each claim is one fact with a snake_case `predicate`, a short `value`, its own `confidence`, plain-language `evidence`, and a best-effort `sourceUrl`/`sourceTitle`. FUNDAMENTAL RULE: AI may propose, evidence establishes. You are producing a proposal a human will review — you are NOT writing to the database. NEVER present an unverified fact as established: when you do not know a real source, leave `sourceUrl` and `sourceTitle` as empty strings and set that claim's confidence to 'low'. Do not fabricate precise URLs, addresses, or statistics you are not confident about. Prefer well-known real entities you are genuinely confident exist. Use the `note` to state honestly how much is unverified and what a human curator should check.",
  },
  "network-search": {
    schema: networkSearchSchema,
    instructions:
      "You are the Network Search Navigator powering RoboSearch. The input has `query` (the visitor's plain-English request), `amenityCatalog` (the ONLY valid amenity ids, each with a label), and `candidates` (the autonomous-ready properties the viewer may see — each with id, name, propertyType, city, region, roboReadyScore, and amenities). Do THREE things: (1) write a one-sentence `interpretation` restating what they want; (2) set `understoodAmenities` to the amenity ids from the catalog that the query implies (e.g. 'fast charging' → 'ev-l3'; empty if none); (3) return `results` — the candidates that genuinely match, ordered most-relevant-first, each with a short `reason` citing that candidate's REAL attributes (its amenities, city/region, propertyType, or score). Interpret location, amenity, property-type, and score intent from the query (e.g. 'near Dallas' → match city/region; 'high score' → prefer higher roboReadyScore). CRITICAL RULES: every result `id` MUST be copied exactly from `candidates` — never invent a property. Never claim an amenity or fact a candidate does not have. Omit weak matches rather than padding. If nothing fits, return an empty `results` array and say so in `interpretation`.",
  },
}

/** Looks up an AI job definition (schema + instructions) by jobType. */
export function getJob(jobType: string): AiJobDef | undefined {
  return JOBS[jobType]
}

/**
 * Builds the RoboReady-authoritative system prompt for a job. Shared by the
 * LocalOrchestrator and the StaffGPT adapter so a job behaves identically no
 * matter which provider fulfils it — RoboReady owns the persona + task.
 */
export function buildJobSystem(employee: AIEmployee, job: AiJobDef): string {
  return [
    `You are ${employee.name}, a ${employee.title} on the ${employee.department} team.`,
    `Mission: ${employee.mission}`,
    `Task: ${job.instructions}`,
    `Respond only with data that fits the required schema.`,
  ].join("\n")
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

    const system = buildJobSystem(employee, job)

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
