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
  | "sales-qualifier"
  | "wayfinding-planner"
  | "accessibility-auditor"
  | "ev-planner"
  | "proposal-writer"
  | "property-prospector"
  | "intake-prefiller"
  | "support-concierge"

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
  "sales-qualifier": {
    slug: "sales-qualifier",
    name: "Mercer",
    title: "Sales Qualifier",
    department: "Sales",
    mission:
      "Qualify inbound leads for autonomous-readiness services: score fit, infer likely needs and budget band, and recommend next actions so the team focuses on the best opportunities.",
    requiresApproval: false,
  },
  "wayfinding-planner": {
    slug: "wayfinding-planner",
    name: "Patha",
    title: "Wayfinding Planner",
    department: "Design",
    mission:
      "Design robot and drone circulation: named routes between key zones, turning/clearance needs, and machine-readable signage/beacon placement so autonomous systems can navigate the property.",
    requiresApproval: false,
  },
  "accessibility-auditor": {
    slug: "accessibility-auditor",
    name: "Vera",
    title: "Accessibility Auditor",
    department: "Operations",
    mission:
      "Audit the property against accessibility expectations (ADA-style) as they intersect with autonomous operations, flagging every finding that must be confirmed by a licensed professional.",
    // Accessibility/compliance output must be verified by a professional.
    requiresApproval: true,
  },
  "ev-planner": {
    slug: "ev-planner",
    name: "Volt",
    title: "EV Charging Planner",
    department: "Engineering",
    mission:
      "Plan EV and robot charging: recommend station mix and counts, estimate electrical load and any service-upgrade needs, and give indicative costs.",
    requiresApproval: false,
  },
  "proposal-writer": {
    slug: "proposal-writer",
    name: "Sable",
    title: "Proposal Writer",
    department: "Sales",
    mission:
      "Turn a property's assessment and plans into a persuasive, itemized commercial proposal with a clear scope, line items, and pricing.",
    requiresApproval: false,
  },
  "property-prospector": {
    slug: "property-prospector",
    name: "Scout",
    title: "Property Prospector",
    department: "Sales",
    mission:
      "Build a prospect pipeline: identify candidate commercial properties (hotels, apartment complexes, schools, business parks, shopping centers, hospitals, event venues) in a target market with best-effort contact details, clearly flagged as unverified for a human to confirm.",
    requiresApproval: false,
  },
  "intake-prefiller": {
    slug: "intake-prefiller",
    name: "Vero",
    title: "Intake Pre-Filler",
    department: "Operations",
    mission:
      "Pre-fill a property's intake with only the information that is confidently verifiable from public knowledge, and leave everything uncertain blank for the field operator — never guessing on-site measurements.",
    requiresApproval: false,
  },
  "support-concierge": {
    slug: "support-concierge",
    name: "Robo",
    title: "Contact & Support Concierge",
    department: "Support",
    mission:
      "Be the friendly front door to RoboReady: answer questions about what RoboReady does, how assessments and pricing work, and guide visitors to the right next step — then capture their details so a human can follow up.",
    requiresApproval: false,
  },
}

export function getEmployee(slug: EmployeeSlug): AIEmployee {
  const e = AI_EMPLOYEES[slug]
  if (!e) throw new Error(`Unknown AI employee: ${slug}`)
  return e
}
