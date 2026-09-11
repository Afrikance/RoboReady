// The RoboReady intake questionnaire. This is the single source of truth for
// both the intake UI and the assessment engine's inputs. Grouped into sections
// that map to the RoboReady Score categories.

export type IntakeFieldType = "text" | "number" | "select" | "multiselect" | "boolean" | "textarea"

export type IntakeField = {
  id: string
  label: string
  type: IntakeFieldType
  help?: string
  options?: string[]
  placeholder?: string
  unit?: string
}

export type IntakeSection = {
  id: string
  title: string
  description: string
  fields: IntakeField[]
}

export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    id: "robotaxi",
    title: "Robotaxi / CyberCab Readiness",
    description:
      "The primary use case: readiness for autonomous ride-hail (Waymo, Tesla Cybercab, Zoox) pick-up and drop-off at this property.",
    fields: [
      { id: "curbAccess", label: "Curbside pick-up / drop-off (PUDO)", type: "select", options: ["Dedicated PUDO lane or apron", "Shared curb with signage", "Street-only, no on-site curb", "None"], help: "A dedicated off-street PUDO area is the single biggest robotaxi readiness factor." },
      { id: "pudoPoints", label: "Potential PUDO points on site", type: "number", placeholder: "e.g. 2" },
      { id: "avStaging", label: "Staging / short-term parking for idle AVs", type: "select", options: ["Dedicated AV staging", "Shared lot with spare capacity", "Limited", "None"] },
      { id: "avCharging", label: "On-site robotaxi fast-charging feasibility", type: "select", options: ["Existing DC fast charging", "Feasible with upgrades", "Difficult", "Unknown"] },
      { id: "avPermits", label: "Local AV permitting / geofencing status", type: "select", options: ["City permits robotaxi operations", "In progress", "Not yet", "Unknown"] },
      { id: "adaLoading", label: "ADA-compliant passenger loading area", type: "boolean", help: "Autonomous ride-hail must still serve riders with disabilities." },
      { id: "fleetPartners", label: "Preferred robotaxi fleets", type: "multiselect", options: ["Waymo", "Tesla Cybercab", "Zoox", "Cruise", "Other / undecided"] },
    ],
  },
  {
    id: "access",
    title: "Access & Circulation",
    description: "How robots and autonomous devices enter and move through the property.",
    fields: [
      { id: "entryTypes", label: "Entrance types", type: "multiselect", options: ["Automatic sliding doors", "Manual swing doors", "Revolving doors", "Loading dock", "Service entrance"], help: "Automatic doors are far more robot-friendly." },
      { id: "elevatorAccess", label: "Elevator access", type: "select", options: ["No elevators", "Standard elevators", "Elevators with API/BMS integration", "Dedicated service elevator"] },
      { id: "floorTransitions", label: "Floor surface transitions", type: "select", options: ["Mostly flush", "Some thresholds", "Frequent steps/ramps", "Stairs only in places"] },
      { id: "corridorWidthCm", label: "Narrowest corridor width", type: "number", unit: "cm", placeholder: "e.g. 120" },
    ],
  },
  {
    id: "connectivity",
    title: "Connectivity & Power",
    description: "Network coverage and charging infrastructure that autonomous systems depend on.",
    fields: [
      { id: "wifiCoverage", label: "Wi-Fi coverage", type: "select", options: ["Full building coverage", "Partial / dead zones", "Public areas only", "None"] },
      { id: "cellularCoverage", label: "Cellular / 5G coverage", type: "select", options: ["Strong", "Variable", "Weak", "Unknown"] },
      { id: "powerForCharging", label: "Available power for charging stations", type: "select", options: ["Dedicated circuits available", "Spare capacity", "Would need upgrades", "Unknown"] },
      { id: "hasBms", label: "Building management system (BMS) present", type: "boolean" },
    ],
  },
  {
    id: "layout",
    title: "Layout & Environment",
    description: "Physical characteristics that affect navigation and safety.",
    fields: [
      { id: "floorMaterials", label: "Predominant floor materials", type: "multiselect", options: ["Polished concrete", "Tile", "Carpet", "Hardwood", "Rubber/vinyl", "Gravel/outdoor"] },
      { id: "lightingQuality", label: "Lighting consistency", type: "select", options: ["Consistent & bright", "Mostly good", "Uneven", "Poor / many dark areas"] },
      { id: "outdoorAreas", label: "Relevant outdoor areas", type: "multiselect", options: ["Parking lot", "Loading area", "Rooftop", "Courtyard", "None"] },
      { id: "footTraffic", label: "Typical foot traffic", type: "select", options: ["Low", "Moderate", "High", "Very high / crowded"] },
    ],
  },
  {
    id: "goals",
    title: "Automation Goals",
    description: "What the operator wants robots and autonomous systems to do here.",
    fields: [
      { id: "useCases", label: "Target use cases", type: "multiselect", options: ["Robotaxi / CyberCab (AV pick-up & drop-off)", "Delivery robots", "Cleaning robots", "Security patrol", "Drone operations", "EV / robot charging", "Concierge / info kiosks", "Inventory"], help: "Robotaxi / CyberCab is RoboReady's primary use case." },
      { id: "timeline", label: "Deployment timeline", type: "select", options: ["Exploring", "Within 6 months", "6-12 months", "12+ months"] },
      { id: "budgetBand", label: "Budget band", type: "select", options: ["Not sure yet", "Under $25k", "$25k-$100k", "$100k-$500k", "$500k+"] },
      { id: "notes", label: "Anything else we should know?", type: "textarea", placeholder: "Constraints, priorities, existing systems..." },
    ],
  },
]

export const INTAKE_FIELD_IDS = INTAKE_SECTIONS.flatMap((s) => s.fields.map((f) => f.id))

export function intakeCompletion(answers: Record<string, unknown>): number {
  const total = INTAKE_FIELD_IDS.length
  if (total === 0) return 0
  let filled = 0
  for (const id of INTAKE_FIELD_IDS) {
    const v = answers[id]
    if (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "") filled++
  }
  return Math.round((filled / total) * 100)
}
