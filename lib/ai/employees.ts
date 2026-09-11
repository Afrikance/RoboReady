// RoboReady's AI employees. Each maps to a StaffGPT department so that when the
// real StaffGPT API is available, RoboReady requests the matching specialist.
// Until then the LocalOrchestrator fulfils these roles via the AI Gateway.
//
// `requiresApproval` marks employees whose output must be reviewed by a human
// before it is acted on (approval gates in the spec).

export type EmployeeSlug =
  | "readiness-analyst"
  | "site-designer"
  | "infrastructure-planner"
  | "report-writer"

export type AIEmployee = {
  slug: EmployeeSlug
  name: string
  title: string
  department: string // StaffGPT department this maps to
  mission: string
  requiresApproval: boolean
}

export const AI_EMPLOYEES: Record<EmployeeSlug, AIEmployee> = {
  "readiness-analyst": {
    slug: "readiness-analyst",
    name: "Ada",
    title: "Robot Readiness Analyst",
    department: "Operations",
    mission:
      "Assess a commercial property's readiness for robots, drones, and autonomous vehicles and produce a 0-100 RoboReady Score with category breakdowns, findings, and prioritized recommendations.",
    requiresApproval: false,
  },
  "site-designer": {
    slug: "site-designer",
    name: "Vitra",
    title: "Autonomous Site Designer",
    department: "Design",
    mission:
      "Translate a readiness assessment into a concrete site concept: zones, circulation routes, and where automation infrastructure should live.",
    requiresApproval: false,
  },
  "infrastructure-planner": {
    slug: "infrastructure-planner",
    name: "Cir",
    title: "Infrastructure Planner",
    department: "Engineering",
    mission:
      "Recommend physical infrastructure assets (EV/robot charging, landing pads, drone pads) with quantities, placements, and indicative costs.",
    // Cost/spec recommendations should be reviewed before they reach a client.
    requiresApproval: true,
  },
  "report-writer": {
    slug: "report-writer",
    name: "Quill",
    title: "Report Writer",
    department: "Marketing",
    mission:
      "Compose a clear, client-ready narrative report from the assessment, site concept, and infrastructure plan.",
    requiresApproval: false,
  },
}

export function getEmployee(slug: EmployeeSlug): AIEmployee {
  const e = AI_EMPLOYEES[slug]
  if (!e) throw new Error(`Unknown AI employee: ${slug}`)
  return e
}
