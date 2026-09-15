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
    id: "interior",
    title: "Interior & Field Survey",
    description:
      "Collected on-site by a Field Operator: the interior path a passenger walks from their room to the robotaxi pickup, plus physical measurements the AI can't see from the outside.",
    fields: [
      { id: "guestPathStart", label: "Where the passenger journey begins", type: "select", options: ["Guest room floor", "Lobby", "Amenity floor", "Parking level"], help: "The starting point for room-to-pickup wayfinding." },
      { id: "pathToCurbSteps", label: "Turns / decision points from room to pickup", type: "number", placeholder: "e.g. 4" },
      { id: "pathElevatorRequired", label: "Elevator required to reach pickup", type: "boolean" },
      { id: "pathElevatorType", label: "Elevator type on the guest path", type: "select", options: ["No elevator on path", "Standard elevators", "Elevators with API/BMS integration", "Dedicated service elevator"] },
      { id: "pathDoorTypes", label: "Doors along the interior path", type: "multiselect", options: ["Automatic sliding doors", "Manual swing doors", "Revolving doors", "Secured / badge doors", "None"] },
      { id: "pathWidthCm", label: "Narrowest point on the guest path", type: "number", unit: "cm", placeholder: "e.g. 110" },
      { id: "pickupFloorLevel", label: "Pickup elevation relative to the guest path", type: "select", options: ["Street level", "Below grade", "Elevated deck"] },
      { id: "indoorPositioning", label: "Indoor guidance available to guests", type: "select", options: ["None", "Wi-Fi positioning", "BLE beacons", "Signage only"], help: "How a guest is guided indoors toward the pickup." },
      { id: "interiorSignagePresent", label: "Interior directional signage present", type: "boolean" },
      { id: "wayfindingLandmarks", label: "Landmarks along the path", type: "textarea", placeholder: "e.g. pass the front desk, turn left at the cafe, exit through the east doors..." },
      { id: "elevationChangeM", label: "Total elevation change room to pickup", type: "number", unit: "m", placeholder: "e.g. 3" },
      { id: "siteMeasurementsNotes", label: "Operator measurements & observations", type: "textarea", placeholder: "Curb heights, door widths, ramp slopes, obstructions measured on-site..." },
      { id: "fieldMediaNotes", label: "Photos / video captured on-site (references)", type: "textarea", placeholder: "Describe or reference media captured during the survey." },
      { id: "staffContact", label: "On-site staff contact", type: "text", placeholder: "Name & role" },
      { id: "staffInterviewNotes", label: "Staff interview notes", type: "textarea", placeholder: "Operating hours, peak times, access constraints the staff flagged..." },
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
    id: "ev",
    title: "EV & Charging Network Readiness",
    description:
      "Qualifies the property for EV infrastructure and as a charging network site — property-wide electrical capacity, existing and future charging, energy storage, and the grid-upgrade path.",
    fields: [
      { id: "evServiceExisting", label: "Existing EV charging on site", type: "select", options: ["None", "A few Level 2", "Networked Level 2", "DC fast charging present"] },
      { id: "electricalSpareCapacity", label: "Spare electrical / panel capacity", type: "select", options: ["Ample", "Some", "Little", "Unknown"], help: "Headroom on the existing service before an upgrade is required." },
      { id: "utilityServiceAmps", label: "Main service size / available amperage", type: "number", unit: "A", placeholder: "e.g. 800" },
      { id: "dcFastFeasible", label: "DC fast-charging feasibility (property-wide)", type: "select", options: ["Existing", "Feasible with upgrades", "Difficult", "Unknown"] },
      { id: "chargeStallsToday", label: "Chargeable stalls today", type: "number", placeholder: "e.g. 4" },
      { id: "chargeNetworkTarget", label: "Desired stall count (network site sizing)", type: "number", placeholder: "e.g. 20" },
      { id: "energyStorage", label: "On-site energy storage / generation", type: "select", options: ["Battery + solar", "Solar only", "Planned", "None"] },
      { id: "gridUpgradePath", label: "Utility grid-upgrade path", type: "select", options: ["Clear", "Constrained", "Unknown"] },
      { id: "chargingSiting", label: "Where charging / storage can sit", type: "multiselect", options: ["Surface lot", "Garage", "Perimeter", "Canopy", "Dedicated pad", "None"] },
      { id: "energyMgmtSystem", label: "Charging / energy management system present", type: "boolean" },
    ],
  },
  {
    id: "robotics",
    title: "Physical AI & Robotics Readiness",
    description:
      "Qualifies the property for physical robotics: repetitive workflows, operating environment, internal access and routes, staffing patterns, and the physical conditions required for a successful deployment.",
    fields: [
      { id: "repetitiveWorkflows", label: "Repetitive / automatable tasks", type: "multiselect", options: ["Cleaning", "Internal delivery", "Security patrol", "Inventory", "Concierge", "Trash & linen", "None"] },
      { id: "workflowVolume", label: "How repetitive / high-volume are they", type: "select", options: ["Very", "Moderate", "Low"] },
      { id: "operatingEnvironment", label: "Operating conditions robots would face", type: "multiselect", options: ["Climate-controlled", "Outdoor exposure", "Wet areas", "Dusty", "Tight spaces"] },
      { id: "obstacleDensity", label: "Clutter / dynamic obstacle density", type: "select", options: ["Low", "Moderate", "High"] },
      { id: "robotRouteContinuity", label: "Step-free continuous internal routes", type: "select", options: ["Fully continuous", "Mostly", "Fragmented"], help: "Builds on the access & interior survey (thresholds, corridor width, elevators)." },
      { id: "staffingPattern", label: "Shift coverage for human-robot handoff", type: "select", options: ["24/7 staffed", "Day only", "Minimal", "Unstaffed"] },
      { id: "humanTrafficPeaks", label: "Peak times / areas robots must yield", type: "textarea", placeholder: "e.g. lobby 8-10am checkout rush, corridors during housekeeping..." },
      { id: "robotDockingSpace", label: "Room for robot charging / storage / docking", type: "select", options: ["Dedicated", "Shareable", "None"] },
      { id: "elevatorAutomation", label: "Elevators callable via API / BMS", type: "boolean" },
    ],
  },
  {
    id: "delivery",
    title: "Autonomous Delivery Readiness",
    description:
      "Qualifies the property for autonomous delivery (sidewalk robots and AV vans): access, routes, the pedestrian environment, handoff, loading areas, building access, security, and operational workflows.",
    fields: [
      { id: "deviceAccess", label: "Sidewalk-robot / AV-van access to the site", type: "select", options: ["Direct & easy", "Some barriers", "Difficult"] },
      { id: "sidewalkRoutes", label: "Sidewalk / route continuity + curb cuts to the door", type: "select", options: ["Continuous with curb cuts", "Partial", "None"] },
      { id: "pedestrianEnvironment", label: "Pedestrian environment on delivery paths", type: "select", options: ["Calm", "Moderate", "Congested"] },
      { id: "deliveryHandoff", label: "Where the delivery handoff happens", type: "select", options: ["Dedicated bay / locker", "Lobby desk", "Curb only", "Undefined"] },
      { id: "loadingAreas", label: "Loading dock / zone", type: "select", options: ["Dedicated dock", "Shared", "Street only", "None"] },
      { id: "buildingAccessDelivery", label: "Entry available for delivery", type: "multiselect", options: ["Automatic doors", "Badge / secured", "Staffed lobby", "Direct unit access"] },
      { id: "securityPosture", label: "Security in place", type: "multiselect", options: ["Cameras", "Access control", "Package room", "Guard", "None"] },
      { id: "deliveryWorkflows", label: "Current receiving / mailroom / room-delivery workflow", type: "textarea", placeholder: "How parcels and room deliveries are received and distributed today..." },
      { id: "parcelStorage", label: "Parcel / charging storage for delivery devices", type: "select", options: ["Lockers", "Mailroom", "None"] },
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
