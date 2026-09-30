export type FeedCategory = "robotaxi" | "delivery-robots" | "drones" | "planning"

export type FeedSection = {
  heading: string
  paragraphs: string[]
}

export type FeedSource = {
  name: string
  url: string
  note: string
}

export type FeedArticle = {
  slug: string
  question: string
  title: string
  category: FeedCategory
  categoryLabel: string
  summary: string
  answer: string
  audience: string
  scope: string
  sections: FeedSection[]
  checklist: string[]
  sources: FeedSource[]
  publishedAt: string
}

export const FEED_CATEGORIES: { slug: FeedCategory; label: string; description: string }[] = [
  { slug: "robotaxi", label: "Robotaxi & curb", description: "Pick-up, drop-off, curb access, and property arrival design." },
  { slug: "delivery-robots", label: "Indoor delivery robots", description: "Building interfaces, circulation, operations, and safety planning." },
  { slug: "drones", label: "Drone delivery", description: "Rooftop and ground handoff, permissions, and operating constraints." },
  { slug: "planning", label: "Readiness & investment", description: "Assessments, budgets, procurement, pilots, and portfolio decisions." },
]

export const FEED_SOURCES: Record<string, FeedSource> = {
  faaDelivery: {
    name: "FAA — Package Delivery by Drone (Part 135)",
    url: "https://www.faa.gov/uas/advanced_operations/package_delivery_drone",
    note: "U.S. aviation authority overview of package-delivery operations and operator certification.",
  },
  faaPart107: {
    name: "FAA — Commercial drone operations",
    url: "https://www.faa.gov/uas/commercial_operators",
    note: "U.S. overview of commercial small-UAS operating rules; not a site-specific approval.",
  },
  nacto: {
    name: "NACTO — Curb Appeal",
    url: "https://nacto.org/publication/curb-appeal/",
    note: "Curb-management framework for allocating limited public street space.",
  },
  ada: {
    name: "U.S. Access Board — ADA Standards",
    url: "https://www.access-board.gov/ada/",
    note: "U.S. accessibility standards reference; local applicability and project review still matter.",
  },
  iso: {
    name: "ISO — ISO 3691-4:2020",
    url: "https://www.iso.org/standard/70660.html",
    note: "International safety requirements and verification for driverless industrial trucks and their systems; confirm current editions and scope before use.",
  },
  vda: {
    name: "VDA — VDA 5050",
    url: "https://www.vda.de/en/topics/automotive-industry/vda-5050",
    note: "Interface specification for communication between mobile robots and a master control system; it does not certify a building or robot.",
  },
  afdc: {
    name: "U.S. DOE Alternative Fuels Data Center — EV charging infrastructure",
    url: "https://afdc.energy.gov/fuels/electricity_infrastructure.html",
    note: "U.S. Department of Energy overview of electric-vehicle charging infrastructure.",
  },
  afdcTrends: {
    name: "U.S. DOE Alternative Fuels Data Center — Charging infrastructure trends",
    url: "https://afdc.energy.gov/fuels/electricity_infrastructure_trends.html",
    note: "U.S. charging infrastructure context; not a utility service-capacity determination.",
  },
}

const source = (...keys: (keyof typeof FEED_SOURCES)[]) => keys.map((key) => FEED_SOURCES[key])
const publishedAt = "2026-09-30"

export const FEED_ARTICLES: FeedArticle[] = [
  {
    slug: "prepare-commercial-property-robotaxis",
    question: "How do I prepare a commercial property for robotaxis?",
    title: "How to prepare a commercial property for robotaxis",
    category: "robotaxi",
    categoryLabel: "Robotaxi & curb",
    summary: "A site-planning framework for evaluating passenger access, curb control, circulation, accessibility, and operating ownership before an autonomous ride-hail service arrives.",
    answer: "Start with the passenger journey, not the vehicle. Map where a car can safely approach, stop, load, and leave; establish an accessible route between the stop and the entrance; then confirm that curb rights, traffic operations, signage, communications, and property management can support the proposed service. Requirements vary by operator, city, and site.",
    audience: "Owners, asset managers, hotel and retail operators, transportation planners, and project teams.",
    scope: "Global planning framework. Curb access and vehicle rules are jurisdiction-specific; the U.S. references below are examples, not universal approvals.",
    sections: [
      { heading: "Map the complete arrival", paragraphs: ["Trace the trip from the public street to the actual passenger destination. Include approach direction, turning movements, queues, the stopping position, door opening space, pedestrian desire lines, weather exposure, and the route into the lobby. A point on a map is not a functioning pick-up location if the vehicle cannot reach it or the passenger cannot safely finish the trip.", "Separate passenger pick-up from loading, valet, taxis, ride-hail, emergency access, and service traffic where conflicts are likely. At constrained sites, document time-of-day demand and who controls each space. A curb allocation plan should identify the responsible public agency as well as the property owner; private property cannot grant rights over a public curb."] },
      { heading: "Test access, safety, and operations", paragraphs: ["Check visibility, lighting, pavement markings, drainage, communications coverage, pedestrian crossings, and accessible connections. Do not let a new loading zone narrow an accessible route or block a curb ramp. Have the design team check applicable accessibility and fire-access requirements with the authority having jurisdiction; this guide is not an engineering or code determination.", "Name the operating owner for signage, wayfinding, incident response, cleaning, queue management, and service changes. Ask prospective mobility operators for their vehicle envelope, stopping tolerances, approach constraints, service boundaries, and operating assumptions. Those inputs turn a generic readiness discussion into a site-specific test plan."] },
    ],
    checklist: ["A measured curb-to-destination passenger path", "A documented curb owner and permission path", "An accessible route and emergency-access review", "Operator vehicle and operating assumptions", "Named owners for day-to-day curb operations"],
    sources: source("nacto", "ada"),
    publishedAt,
  },
  {
    slug: "robotaxi-pickup-dropoff-hotel",
    question: "What does a hotel need for robotaxi pick-up and drop-off?",
    title: "Robotaxi pick-up and drop-off planning for hotels",
    category: "robotaxi",
    categoryLabel: "Robotaxi & curb",
    summary: "How hotel arrival teams can evaluate guest handoff, valet interaction, luggage handling, curb space, accessible paths, and operator coordination.",
    answer: "A hotel needs a legible, legally usable stopping point, a safe passenger route to the entrance, and an operating plan that fits around valet, taxis, shuttles, deliveries, and emergency access. Whether the stop belongs at the porte-cochère or a separate curb depends on geometry, local permissions, operator requirements, and guest-service priorities.",
    audience: "Hotel owners, general managers, asset managers, architects, and mobility partners.",
    scope: "Global operational considerations; curb rules and accessibility obligations depend on the hotel’s jurisdiction.",
    sections: [
      { heading: "Design for a guest handoff", paragraphs: ["Walk the arrival as a guest with luggage, a mobility aid, or a child. The handoff should be easy to identify from the vehicle and from the lobby, with a continuous route that avoids vehicle conflict points. Consider shelter, lighting, after-hours access, luggage assistance, and how staff can help without standing in the vehicle path.", "Do not assume the hotel’s existing valet lane is automatically suitable. Robotaxi staging can compete with valet dwell time and create queues at peak check-in. Compare a shared curb with a distinct signed location, then test both against arrival volumes, turning space, operator stopping behavior, and the property’s emergency plan."] },
      { heading: "Integrate service without promising a vendor feature", paragraphs: ["Ask each operator how guests find the precise entrance, how a trip is assigned to the correct property, what happens when the stopping area is occupied, and how accessibility needs are handled. These are service-design questions: capabilities differ by provider and market, so get written confirmation rather than assuming a feature exists.", "Assign hotel roles for signage, guest communications, curb monitoring, incident escalation, and coordination with public agencies. A property plan should state what staff do when a vehicle arrives at the wrong entrance or a guest cannot reach the designated stop. Build a small operating rehearsal into any pilot before describing the service as ready for guests."] },
    ],
    checklist: ["Guest-tested wayfinding from vehicle to lobby", "Valet and shuttle conflict analysis", "Accessible route review", "Written operator assumptions", "Staff escalation and guest-support procedure"],
    sources: source("nacto", "ada"),
    publishedAt,
  },
  {
    slug: "design-curb-for-autonomous-vehicles",
    question: "How should a city or property design curb space for autonomous vehicles?",
    title: "Designing curb space for autonomous vehicle arrivals",
    category: "robotaxi",
    categoryLabel: "Robotaxi & curb",
    summary: "A practical curb-allocation method that accounts for passenger loading, pedestrians, transit, deliveries, accessible access, and public authority.",
    answer: "Treat autonomous-vehicle stops as one demand competing for finite curb space. Define the user and dwell activity, locate conflict points, preserve accessible pedestrian access, and coordinate with the agency that controls the curb. Technology does not remove the need for a clear stopping rule, enforcement plan, or operations owner.",
    audience: "Municipal transportation staff, property owners, planners, architects, and curb managers.",
    scope: "Planning concepts are broadly applicable; curb regulations and street-design authority are local.",
    sections: [
      { heading: "Allocate for the activity, not the label", paragraphs: ["Describe what happens at the curb: passenger boarding, alighting, waiting, loading, or vehicle staging. Estimate when demand occurs and how long the activity occupies the space. Compare it with transit stops, accessible loading, freight, micromobility, parking, and emergency needs before designating a new use.", "A curb plan should show the approach, stopping envelope, pedestrian crossing, visibility, queue behavior, and transition back into traffic. Where a vehicle may stop is not necessarily where a passenger should wait. Keep the passenger waiting area and the vehicle movement path legible and, where feasible, distinct."] },
      { heading: "Coordinate governance and accessibility", paragraphs: ["Identify who owns the right-of-way, who can authorize a change, and how the space will be monitored. A property can propose a curb use, but a public curb may require transportation-agency approval, public process, permits, or enforcement arrangements. Put responsibility for signs, markings, and changes in writing.", "Review the route from the curb to the entrance against applicable accessibility standards and local requirements. Protect curb ramps and clear pedestrian space; do not solve vehicle access by moving barriers into the accessible path. Use a site walk and a design review with the relevant accessibility and traffic professionals before implementation."] },
    ],
    checklist: ["Demand and dwell-time assumptions", "Street and pedestrian conflict map", "Curb authority and permit pathway", "Accessible route review", "Monitoring and enforcement owner"],
    sources: source("nacto", "ada"),
    publishedAt,
  },
  {
    slug: "robotaxi-parking-garage-readiness",
    question: "Can robotaxis pick up passengers in a parking garage?",
    title: "Robotaxi pick-up inside a parking garage: site questions to resolve",
    category: "robotaxi",
    categoryLabel: "Robotaxi & curb",
    summary: "Evaluate clearance, navigation, passenger circulation, cellular coverage, gate controls, dwell areas, and the alternative of a street-level handoff.",
    answer: "Possibly, but it depends on the vehicle and operator, garage geometry, access controls, connectivity, passenger route, and local rules. A garage stop should not be assumed from a vehicle’s ability to drive on public roads. Validate the exact route and stopping behavior with the operator and property team before committing to the design.",
    audience: "Parking operators, property managers, architects, hotels, and mobility providers.",
    scope: "Operator-specific technical review is essential; applicable building, fire, and accessibility requirements are local.",
    sections: [
      { heading: "Check the vehicle path", paragraphs: ["Measure clear height, ramp slope and transitions, turning radii, lane widths, speed-control devices, gate locations, and the route between the entrance and proposed stop. Compare measurements with a specific operator’s documented vehicle envelope and navigation constraints. A generic passenger-car dimension is not a substitute for the actual fleet specification.", "Review the route for reliable localization and communications, including underground levels, reflective or repetitive environments, lighting changes, and moving gates. Ask the provider what happens when a gate fails, a lane is blocked, or the vehicle cannot confirm its position. Do not design around an unconfirmed automation or connectivity feature."] },
      { heading: "Check passenger safety and operating value", paragraphs: ["A pick-up point needs room for the passenger to leave the vehicle without stepping into a live drive aisle. Check pedestrian sightlines, accessible path continuity, elevator access, security, emergency egress, and the interaction with parking customers. Identify whether passengers can reach the lobby without entering restricted areas or crossing vehicle ramps.", "Compare the garage option with a curbside handoff. Garage access may reduce street congestion but add gate integration, wayfinding, ventilation or fire-review questions, and operational dependencies. The best location is the one the operator can reliably serve and the property can safely operate—not necessarily the most sheltered location."] },
    ],
    checklist: ["Operator-specific vehicle envelope", "Measured garage path and clearance", "Gate and connectivity failure plan", "Pedestrian and accessibility review", "Garage-versus-curb operating comparison"],
    sources: source("nacto", "ada"),
    publishedAt,
  },
  {
    slug: "robotaxi-property-portfolio-readiness",
    question: "How do I assess robotaxi readiness across a property portfolio?",
    title: "A portfolio method for assessing robotaxi readiness",
    category: "robotaxi",
    categoryLabel: "Robotaxi & curb",
    summary: "Create a comparable site inventory without mistaking one portfolio score for a substitute for local engineering, curb approvals, or operator validation.",
    answer: "Use a common screening rubric to compare arrival demand, curb control, access geometry, pedestrian conditions, connectivity, and operating ownership, then keep a site-specific record of evidence and gaps. Portfolio screening helps order detailed investigations; it does not establish that every property is approved or serviceable by a particular operator.",
    audience: "Portfolio owners, REITs, facility leaders, investment teams, and consultants.",
    scope: "Global portfolio-management framework; legal, code, curb, and operator conditions must be assessed site by site.",
    sections: [
      { heading: "Build a comparable evidence set", paragraphs: ["Define a common set of fields before scoring: property use, arrival volumes, curb ownership, loading conflicts, entrance locations, site plans, accessible routes, garage constraints, connectivity observations, and known operator service areas. Record the source and date for each item. Missing evidence should be marked unknown, not silently treated as a pass.", "Separate portfolio-wide attributes from local facts. A shared policy can define an ideal curb concept or escalation owner, while local permits, road conditions, building layouts, and vendor footprints remain individual. This avoids false precision from comparing a well-documented city hotel with an unverified suburban office parcel."] },
      { heading: "Use screening to prioritize diligence", paragraphs: ["Group sites by operational pattern—street-front hotel, campus, mixed-use tower, destination retail, or airport-adjacent facility—then identify repeatable issues. Compare the cost and complexity of obtaining evidence, not just a single readiness score. A low score caused by missing documentation is different from a site with a known geometric barrier.", "Choose representative properties for operator workshops and field validation. Update portfolio records when curb permissions, construction, operator markets, or service assumptions change. Investment decisions should cite the underlying evidence, confidence, and unresolved approvals rather than implying that a high-level rating guarantees future vehicle service."] },
    ],
    checklist: ["Common evidence schema and definitions", "Unknown versus confirmed gap distinction", "Site-specific approval fields", "Representative sites for field validation", "Owner and review date for each record"],
    sources: source("nacto", "ada"),
    publishedAt,
  },
  {
    slug: "robotaxi-charging-at-commercial-properties",
    question: "Do commercial properties need EV chargers for robotaxis?",
    title: "Do commercial properties need to provide charging for robotaxis?",
    category: "robotaxi",
    categoryLabel: "Robotaxi & curb",
    summary: "Separate passenger loading from fleet charging, then verify who owns, funds, operates, and has utility authority for each charging use case.",
    answer: "Not automatically. Passenger pick-up and fleet charging are different functions, and charging responsibility depends on the fleet operator’s operating model, site agreement, utility capacity, and property strategy. Ask whether charging is actually required at the property and who would pay for, control, and maintain the equipment before building it into a readiness plan.",
    audience: "Property owners, fleet and mobility operators, electrical engineers, and investment teams.",
    scope: "The charging concepts apply broadly; electrical codes, utility processes, and incentives are jurisdiction-specific.",
    sections: [
      { heading: "Identify the charging use case", paragraphs: ["Clarify whether the request is for occasional guest charging, employee or tenant charging, fleet turnaround, overnight depot charging, or a dedicated operator site. Each use case has different dwell patterns, access-control needs, power demand, billing, and operating hours. A public-facing charger at the entrance is not necessarily a practical fleet-charging solution.", "Ask the mobility operator for vehicle energy needs, charging connector and power requirements, fleet size, dwell schedule, redundancy expectations, and whether vehicles can charge elsewhere. Do not infer a charger count from a hypothetical fleet size; obtain operating assumptions and model them with an electrical professional."] },
      { heading: "Confirm capacity, ownership, and economics", paragraphs: ["Review existing electrical service, transformer and panel capacity, available circuits, parking layout, and utility upgrade pathway. The utility—not a marketing estimate—must confirm service availability and any required upgrades. Compare managed charging, phased deployment, shared infrastructure, and off-site charging only after the load profile is understood.", "Write down who owns equipment, pays utility bills, handles maintenance, controls access, and bears upgrade costs. Check applicable electrical, fire, accessibility, and permitting requirements. DOE’s Alternative Fuels Data Center is a useful starting point for charging infrastructure context, but it does not determine a particular building’s available electrical capacity."] },
    ],
    checklist: ["Named charging use case", "Fleet/operator load assumptions", "Utility capacity review", "Equipment and service ownership", "Permitting, maintenance, and access plan"],
    sources: source("afdc", "afdcTrends"),
    publishedAt,
  },
  {
    slug: "indoor-delivery-robots-building-readiness",
    question: "What does a building need before using indoor delivery robots?",
    title: "Building readiness for indoor delivery robots",
    category: "delivery-robots",
    categoryLabel: "Indoor delivery robots",
    summary: "A building-side checklist for routes, doors, elevators, handoff points, residents or guests, operations, and the limits of vendor-specific integrations.",
    answer: "Begin by selecting a bounded delivery workflow and walking its route from dispatch point to handoff. Check floor transitions, door clearances, lift access, shared pedestrian space, delivery permissions, connectivity, security, and who handles exceptions. Building readiness is a coordination problem as much as a robot-selection problem.",
    audience: "Facility and property managers, hospitals, hotels, multifamily operators, and robotics teams.",
    scope: "General planning only. Building, fire, accessibility, labor, privacy, and safety requirements depend on location and use.",
    sections: [
      { heading: "Choose and observe one workflow", paragraphs: ["Name the delivery item, origin, destination, hours, service volume, handoff method, and people involved. A hotel amenity run, hospital logistics route, and apartment meal delivery have different access, privacy, timing, and chain-of-custody needs. Pilot a route that is representative but bounded enough to observe safely.", "Walk the full route at busy and quiet times. Note thresholds, automatic doors, narrow corridors, floor finishes, elevators, security boundaries, guest-only areas, and locations where people may need to pass. A floor plan is a start; it cannot show every temporary obstacle, queue, or human behavior that affects the route."] },
      { heading: "Plan building interfaces and exceptions", paragraphs: ["Ask the robot provider which interfaces are supported at this site—such as elevator dispatch, door access, call systems, or delivery lockers—and what building equipment or third-party integration is required. Confirm versions, security review, test ownership, and failure behavior in writing. A communication standard or vendor claim does not by itself prove compatibility with a particular elevator or building system.", "Agree how staff, occupants, and emergency responders interact with the robot. Define a stop procedure, manual recovery, incident reporting, cleaning, charging, access credentials, and a contact for system outages. Review pedestrian clearances and applicable safety and accessibility obligations with qualified professionals before live operation."] },
    ],
    checklist: ["Bounded workflow and route map", "Site walk during real operating conditions", "Written interface and compatibility scope", "Exception, recovery, and incident procedure", "Accessibility and safety review"],
    sources: source("iso", "vda", "ada"),
    publishedAt,
  },
  {
    slug: "delivery-robots-elevator-integration",
    question: "How do delivery robots use elevators in commercial buildings?",
    title: "Elevator integration for commercial delivery robots",
    category: "delivery-robots",
    categoryLabel: "Indoor delivery robots",
    summary: "What to verify with the robot supplier, elevator service provider, building operator, and access-control team before connecting lift calls.",
    answer: "An indoor robot can use an elevator only when the robot, elevator controls, building access systems, communications, and operating procedures are compatible and authorized. The integration may require approved interfaces or vendor coordination; never assume a robot can operate a lift simply because it can physically enter the car.",
    audience: "Building owners, vertical-transportation consultants, elevator contractors, and robot integrators.",
    scope: "Technical integration and code approval are site- and jurisdiction-specific; involve the elevator maintainer and authority having jurisdiction.",
    sections: [
      { heading: "Define the control boundary", paragraphs: ["Document how a robot requests a car, selects a floor, enters and exits, and communicates its status. Identify whether the interface is supported by the elevator manufacturer or authorized service provider and whether it affects the elevator’s certified operation. Obtain the elevator model, controller configuration, access-control design, and integration responsibility before planning a pilot.", "If multiple robots or a fleet manager are involved, map who assigns a lift, how priority works, and what happens when traffic spikes or a car is unavailable. Standards such as VDA 5050 concern communication between mobile robots and a master control system; they are not a guarantee of elevator compatibility or a substitute for elevator approval."] },
      { heading: "Test failures as well as the happy path", paragraphs: ["A safe test plan should include a busy lobby, a blocked landing, lost communications, a denied floor, an occupied car, and a robot that cannot enter or exit. Define how the elevator returns to normal service and how staff retrieve a stopped robot. Coordinate test windows with the building operator and elevator service team.", "Review passenger accessibility, door timing, car capacity, clearances, emergency operation, fire-service modes, and building policies with qualified professionals. Keep people in control of recovery and do not alter elevator controls through an unsupported device. Record the approved interface, responsible vendor, software versions, and fallback procedure for future maintenance."] },
    ],
    checklist: ["Elevator make, model, and authorized interface", "Robot and fleet-manager integration responsibilities", "Access-control and floor-permission design", "Failure-mode test plan and manual recovery", "Qualified code and elevator-service review"],
    sources: source("vda", "iso"),
    publishedAt,
  },
  {
    slug: "delivery-robot-doors-access-control",
    question: "Can delivery robots open doors and pass through access-controlled areas?",
    title: "Doors, access control, and delivery robots: what to verify",
    category: "delivery-robots",
    categoryLabel: "Indoor delivery robots",
    summary: "How to scope door and credential integrations while preserving building security, accessibility, and human override.",
    answer: "Sometimes, when the robot, door hardware, access-control system, and building security policy support an approved integration. The property team should limit the route and permissions, confirm the integration with the system owner, and define what happens when access is denied. Do not bypass a door or safety feature to make a pilot work.",
    audience: "Security leaders, facility managers, integrators, healthcare and hospitality operators.",
    scope: "Local fire, egress, accessibility, privacy, and security rules apply; this guide is not a code or cybersecurity audit.",
    sections: [
      { heading: "Grant only the access the workflow needs", paragraphs: ["List every door, zone, and time window on the planned route. Decide whether an integration uses a managed credential, approved building API, staffed handoff, or another method supported by the property’s access-control provider. Give the system only the minimum permissions required and document who can issue, rotate, and revoke credentials.", "Security review should include identity, authentication, network segmentation, logging, vendor support, software updates, and the effect of a lost or compromised robot. Avoid shared permanent credentials or undocumented relays. Ask vendors to describe their data flows and incident process before connecting their equipment to building systems."] },
      { heading: "Preserve egress and human override", paragraphs: ["Never allow an automated workflow to obstruct required egress, defeat fire doors, or interfere with an emergency mode. Confirm door behavior during power loss, alarm, evacuation, and access-system outage with the responsible building professionals. The robot should yield to people and have a clear stop and recovery procedure.", "Test denial and failure: a locked door, network outage, revoked credential, held-open alarm, and person asking for help. Determine whether a staff member can override or escort the robot and how the event is recorded. Pilot access in one low-risk route before considering broader permissions."] },
    ],
    checklist: ["Route and zone permission matrix", "Approved integration owner and supported method", "Credential lifecycle and revocation", "Egress and fire-mode review", "Human override and failure logging"],
    sources: source("iso", "ada"),
    publishedAt,
  },
  {
    slug: "delivery-robots-fire-life-safety",
    question: "What fire and life-safety issues should buildings review for delivery robots?",
    title: "Fire and life-safety review for indoor delivery robots",
    category: "delivery-robots",
    categoryLabel: "Indoor delivery robots",
    summary: "A coordination checklist for egress, fire doors, charging, emergency modes, housekeeping, and the authority having jurisdiction.",
    answer: "Review robot routes, charging locations, stored equipment, fire-door behavior, egress width, emergency response, and failure recovery with the building’s fire and life-safety professionals. A robot pilot must not obstruct required exit paths or change a life-safety system without approved design and review.",
    audience: "Owners, facility directors, fire-protection engineers, safety officers, and robot operators.",
    scope: "Requirements are building- and jurisdiction-specific. This overview is not fire-code, engineering, or legal advice.",
    sections: [
      { heading: "Keep life-safety functions independent", paragraphs: ["Map robot travel and waiting locations against exits, corridors, fire doors, alarm devices, fire-service access, and evacuation routes. Confirm that temporary staging and charging cannot narrow an egress path or create trip hazards. Ask the authority having jurisdiction and qualified fire-protection professionals to determine applicable requirements for the specific building and use.", "Clarify what the robot does on alarm, power loss, network failure, or evacuation. It should not hold a fire door open, block responder access, or require a building occupant to troubleshoot equipment during an emergency. Document a safe stop state and who is responsible for moving equipment out of the way when safe to do so."] },
      { heading: "Review charging and operating procedures", paragraphs: ["Identify charging equipment, battery type, charging schedule, location, ventilation, electrical supply, and housekeeping responsibilities. Have qualified professionals review the equipment and installation against applicable electrical and fire requirements. Do not assume that a small battery means there is no building review to perform.", "Train staff on shutdown, manual movement, incident escalation, and the distinction between a robot fault and a building alarm. Test the plan in a controlled exercise with the safety team and robot provider. Reassess after a route change, a new robot model, a charging-location change, or a change in building emergency procedures."] },
    ],
    checklist: ["Route overlay with exits and fire doors", "Approved charging location and equipment review", "Alarm, outage, and evacuation behavior", "Safe stop and manual recovery process", "Authority-having-jurisdiction review"],
    sources: source("iso", "ada"),
    publishedAt,
  },
  {
    slug: "delivery-robots-hospitals-and-healthcare",
    question: "How can hospitals evaluate indoor delivery robots?",
    title: "Hospital delivery robot planning: routes, workflows, and controls",
    category: "delivery-robots",
    categoryLabel: "Indoor delivery robots",
    summary: "Start with logistics fit, then assess clinical boundaries, infection prevention, elevators, privacy, emergency response, and staff workflows.",
    answer: "Hospitals should select a specific nonclinical logistics workflow, then assess its route, handoff, cleaning, access, privacy, emergency, and clinical-operations impact with the relevant teams. A robot’s ability to carry an item does not establish that it is appropriate for a particular care area or regulated material.",
    audience: "Healthcare facilities, supply-chain leaders, clinical operations, infection prevention, and integrators.",
    scope: "Healthcare privacy, infection prevention, medication, and life-safety requirements vary by jurisdiction and institution; involve qualified compliance and clinical staff.",
    sections: [
      { heading: "Choose the workflow with clinical owners", paragraphs: ["Specify what moves, where it starts and ends, whether the contents are time-sensitive or access-restricted, and who accepts custody. Involve nursing, materials management, pharmacy or laboratory leadership where relevant, infection prevention, facilities, IT, and security before selecting a route. Exclude sensitive workflows until governance and controls are clear.", "Observe corridors, patient transport, cleaning schedules, elevator peaks, and badge-controlled boundaries. A corridor route that is technically navigable can still disrupt care, create noise, or compete with clinical movement. Set measurable workflow goals—such as handoff reliability or staff time saved—before the pilot so the hospital can decide whether to continue."] },
      { heading: "Control access, cleanliness, and failure", paragraphs: ["Define cleaning responsibility, materials, frequency, and what happens after a spill or contact with a contaminated area. Confirm whether the robot records video, audio, location, or identifiers and where that data is processed and retained. The institution should complete its own privacy and security review rather than relying on a vendor summary.", "Build failure scenarios into the pilot: elevator unavailable, item misrouted, door access denied, alarm, network outage, or clinical area closure. Establish a human fallback and prohibit the robot from blocking emergency routes. Run a controlled trial with staff training, incident reporting, and a scheduled review before extending the route or carrying a different class of material."] },
    ],
    checklist: ["Named workflow and clinical sponsor", "Route walk with frontline staff", "Cleaning and item-custody plan", "Privacy and cybersecurity review", "Human fallback and controlled pilot measures"],
    sources: source("iso", "vda", "ada"),
    publishedAt,
  },
  {
    slug: "delivery-robots-hotels-and-multifamily",
    question: "Are delivery robots a good fit for hotels and apartment buildings?",
    title: "Evaluating delivery robots in hotels and multifamily buildings",
    category: "delivery-robots",
    categoryLabel: "Indoor delivery robots",
    summary: "Assess service demand, route access, elevator and door integration, guest privacy, resident expectations, staffing, and unit economics before purchase.",
    answer: "They may fit a repeated, well-bounded delivery workflow where routes and handoffs are compatible with the building and residents or guests understand the service. Evaluate expected trips, elevator delays, staff effort, service hours, integration cost, accessibility, privacy, and recovery needs; a technology demonstration alone does not establish operational or financial fit.",
    audience: "Hotel operators, multifamily owners, property managers, resident-experience teams, and vendors.",
    scope: "Operational overview. Tenant, labor, accessibility, privacy, and building rules differ by location and contract.",
    sections: [
      { heading: "Measure the service, not just the device", paragraphs: ["Count the current deliveries that could genuinely move to a robot, when they occur, how far they travel, what size items they carry, and who completes the final handoff. Include elevator wait, staff loading time, failed deliveries, cleaning, charging, integration, and vendor support in the operating model. Low trip volume or long elevator waits can erase an apparent labor benefit.", "Ask residents or guests how they want to receive items and how they can opt into or get help with the service. A staffed reception or secure locker may solve the same need with less building integration. Compare alternatives against the same service target rather than comparing a robot demo with the current process only."] },
      { heading: "Test the real route and resident experience", paragraphs: ["Confirm access to the lobby, elevators, floors, doors, and handoff points with the responsible system providers. Design a fallback for people who cannot use an app, do not want a camera near their door, or need assistance. Check that signage is understandable and the robot does not block a corridor or accessible route.", "Pilot in one building or one bounded route with a named operations owner. Track completed trips, exceptions, staff intervention, resident feedback, downtime, and total operating cost. Decide in advance what evidence would justify expansion, a redesign, or stopping the pilot; do not extrapolate from a short novelty period."] },
    ],
    checklist: ["Real trip counts and delivery profile", "Building interface and support cost", "Resident/guest privacy and opt-out plan", "Alternative-solution comparison", "Measured pilot success and stop criteria"],
    sources: source("iso", "ada"),
    publishedAt,
  },
  {
    slug: "delivery-robot-pedestrian-accessibility",
    question: "How do delivery robots affect accessible routes and pedestrian safety?",
    title: "Accessible routes and pedestrian safety around delivery robots",
    category: "delivery-robots",
    categoryLabel: "Indoor delivery robots",
    summary: "Plan clear pedestrian space, accessible handoffs, yielding behavior, obstruction reporting, and human recovery around shared robot routes.",
    answer: "Treat the robot as a new user of shared circulation, not as a reason to reduce clear accessible space. Review route width, door and elevator interaction, turning and waiting locations, audible or visual cues, yielding behavior, and accessible alternatives with people who use the building and qualified accessibility professionals.",
    audience: "Property teams, accessibility consultants, safety leads, robot vendors, and building occupants.",
    scope: "The U.S. Access Board source is U.S.-specific; apply the accessibility laws and standards for the actual project jurisdiction.",
    sections: [
      { heading: "Protect continuous access", paragraphs: ["Map clear routes, ramps, doors, lifts, turning areas, seating, and key destinations. Identify places where a robot could wait, charge, or stop without blocking circulation. Accessibility review should consider people with mobility, vision, hearing, cognitive, and other access needs; do not rely solely on a robot supplier’s stated obstacle-detection capability.", "Consult occupants and accessibility specialists during route design and pilot evaluation. Verify that handoff instructions are available in understandable formats and that a person can request assistance or use an equivalent service. Keep any robot parking and charging outside the path of travel and out of door maneuvering areas."] },
      { heading: "Test yielding and obstruction recovery", paragraphs: ["Ask vendors to demonstrate how the robot responds to a person who stops, moves unpredictably, uses a mobility device, or needs extra passing space. Confirm speed and stopping behavior from documentation and supervised testing rather than assuming universal performance. Define how occupants report an obstruction and how quickly staff can respond.", "Check applicable accessibility requirements with the project’s qualified design and compliance team. U.S. ADA Standards provide a reference for covered facilities, but applying a standard depends on context and does not replace project review. Reassess after any route change, new equipment, or occupant feedback that identifies a barrier."] },
    ],
    checklist: ["Clear route and charging-space plan", "Consultation with people with disabilities", "Observed yielding and stop behavior", "Simple obstruction-reporting method", "Applicable local accessibility review"],
    sources: source("ada", "iso"),
    publishedAt,
  },
  {
    slug: "drone-package-delivery-commercial-property",
    question: "What does a commercial property need for drone package delivery?",
    title: "Drone package delivery at commercial properties: a site checklist",
    category: "drones",
    categoryLabel: "Drone delivery",
    summary: "Evaluate an operator-led handoff plan, airspace and permissions, safe delivery area, people below, package security, noise, and community impacts.",
    answer: "A property needs a feasible and safe package handoff area plus an operator with a lawful operating model for the route. Site readiness cannot be determined from rooftop space alone: airspace, aircraft, operating approvals, weather, obstacles, people on the ground, local rules, and package custody all matter. In the United States, delivery operations may require specific FAA authority.",
    audience: "Property owners, logistics teams, airports, retail and healthcare operators, and drone service providers.",
    scope: "Regulatory example is U.S.-specific. Drone delivery authority and land-use requirements vary significantly worldwide.",
    sections: [
      { heading: "Start with the operator and mission", paragraphs: ["Define the package, origin, destination, operating hours, expected volume, aircraft, route, and handoff method. Ask the operator to explain the regulatory basis for the proposed service and who holds each approval. In the U.S., the FAA describes package delivery under Part 135; a property owner cannot confer aviation authority by designating a roof or landing zone.", "Map obstacles, roof access, cranes, wires, adjacent buildings, people below, emergency access, and weather exposure. The appropriate handoff may be a secured ground station, staffed receiving area, or another design rather than a conventional landing pad. The operator must validate aircraft-specific clearances and operating procedures."] },
      { heading: "Secure the ground handoff", paragraphs: ["Design for package custody, failed deliveries, unauthorized access, weather, and retrieval by staff. Consider noise, privacy expectations, visual impact, building security, and neighbors. If a drone crosses or operates near public areas, coordinate the risk assessment and communications with the operator and relevant authorities.", "Confirm structural loading, roof access, fire and life-safety, electrical supply, and maintenance responsibilities with qualified building professionals if equipment is proposed. These are separate from aviation approvals. Keep the project’s site approval, operator authorization, building review, and public communication as distinct workstreams with named owners."] },
    ],
    checklist: ["Named operator and documented operating authority", "Aircraft-specific route and obstacle review", "Safe, secured handoff and failed-delivery process", "Building and life-safety review", "Community, privacy, and noise plan"],
    sources: source("faaDelivery", "faaPart107"),
    publishedAt,
  },
  {
    slug: "drone-delivery-rooftop-landing-zone",
    question: "Does a drone delivery site need a rooftop landing pad?",
    title: "Does a drone delivery operation need a rooftop landing pad?",
    category: "drones",
    categoryLabel: "Drone delivery",
    summary: "A rooftop landing pad is only one possible handoff concept; determine the aircraft, operator, delivery method, building constraints, and approvals first.",
    answer: "Not necessarily. Some delivery concepts use a landing or docking area, while others may use a different operator-approved package transfer method. The aircraft and operator determine the operating requirements. A roof location still needs structural, access, security, fire-safety, and regulatory review, and a marked pad alone does not authorize a flight.",
    audience: "Building owners, architects, logistics providers, developers, and drone operators.",
    scope: "U.S. airspace examples reference the FAA. Building permits and aviation rules differ by jurisdiction.",
    sections: [
      { heading: "Choose a handoff method before designing a pad", paragraphs: ["Ask the operator whether its aircraft lands, hovers for a transfer, uses a dock, or delivers at ground level, and request the model-specific clearances and failure modes. A design based on a generic circle on a roof can miss approach paths, rotor wash, wind, battery or charging needs, package size, and staff access.", "Compare roof, podium, and ground-level options against obstacle clearance, privacy, security, loading access, weather, and the route that a worker takes to retrieve a package. The operating concept should state whether staff enter the area, whether packages are secured, and how the system responds to a missed transfer or an unavailable site."] },
      { heading: "Separate structural and aviation decisions", paragraphs: ["Have a structural engineer review proposed equipment, loads, anchoring, vibration, and access. Coordinate roof openings, electrical service, fire protection, and maintenance with the building design team and authority having jurisdiction. Roof capacity does not establish that a flight route or drone operation is lawful.", "In the United States, the FAA’s package-delivery material describes the operator certification framework. Confirm the operator’s approvals and proposed operation directly with that operator and the relevant authority. Keep aviation authorization, property permission, construction permits, and building-system review as separate approvals in the project schedule."] },
    ],
    checklist: ["Operator-confirmed delivery and handoff method", "Aircraft-specific operating envelope", "Structural, fire, and access review", "Package security and retrieval procedure", "Separate aviation and building approvals"],
    sources: source("faaDelivery"),
    publishedAt,
  },
  {
    slug: "drone-delivery-permissions-and-property-owners",
    question: "Can a property owner authorize drone deliveries over a building?",
    title: "What property owners can—and cannot—authorize for drone delivery",
    category: "drones",
    categoryLabel: "Drone delivery",
    summary: "Separate land access and receiving permission from aviation authority, airspace rules, operator certification, and local land-use approvals.",
    answer: "A property owner can generally control access to its property and agree to a package handoff subject to applicable law, but that agreement is not aviation approval. Drone operations also involve airspace and operator rules, and may require permissions from aviation authorities and other agencies. The exact allocation of rights and approvals depends on jurisdiction.",
    audience: "Commercial property owners, counsel, drone operators, land-use planners, and logistics buyers.",
    scope: "Legal principles vary globally. The FAA examples below apply to U.S. operations and are not legal advice.",
    sections: [
      { heading: "Keep property consent separate from flight authority", paragraphs: ["A lease, license, or site agreement may address roof access, equipment installation, delivery windows, insurance, package custody, and responsibility for damage. It does not by itself approve an aircraft, route, pilot, operator, or airspace use. Ask the service provider to identify the regulator and approvals that apply to the specific operation.", "In the U.S., the FAA distinguishes ordinary commercial small-drone operations from package-delivery operations that may fall under Part 135. The proposed service and operator determine the path. Do not rely on a vendor’s broad claim of being 'approved' without understanding what entity, aircraft, route, and operating conditions the approval covers."] },
      { heading: "Coordinate other local approvals and obligations", paragraphs: ["Check local zoning, building permits, fire access, noise rules, privacy requirements, labor arrangements, and any airport or protected-area restrictions with qualified local advisers. A rooftop station may require construction or electrical work even when the aviation operator already has a lawful route.", "Use a written responsibility matrix: operator owns flight compliance and flight decisions; property owner controls its premises and building systems; each party handles its own insurance, data, incident notification, and maintenance obligations. Have counsel review the agreement and identify public-agency approvals before advertising service availability."] },
    ],
    checklist: ["Written list of operation-specific aviation approvals", "Separate property license and building permits", "Local zoning, privacy, noise, and safety review", "Insurance and incident allocation", "Counsel review before launch claims"],
    sources: source("faaDelivery", "faaPart107"),
    publishedAt,
  },
  {
    slug: "drone-delivery-site-security-and-privacy",
    question: "How should properties handle security and privacy for drone delivery?",
    title: "Security and privacy planning for drone deliveries at properties",
    category: "drones",
    categoryLabel: "Drone delivery",
    summary: "Plan access to handoff equipment, package custody, camera data, incident reporting, and neighborhood communication before a drone service begins.",
    answer: "Treat drone delivery as both a physical-access and data-governance project. Restrict access to equipment and delivered packages, understand what cameras and telemetry collect, set retention and sharing rules, and provide a way to report safety or privacy concerns. Requirements for recording and personal data depend on local law and the actual system design.",
    audience: "Security and privacy leads, property managers, operators, residents, and counsel.",
    scope: "Privacy and surveillance law varies by jurisdiction; conduct a local legal review for the specific equipment and use.",
    sections: [
      { heading: "Control devices, credentials, and packages", paragraphs: ["Document who can access a landing or transfer area, who can retrieve a package, and what happens when a recipient is absent. Secure any dock, locker, power connection, and network path according to the property’s security policy. Define the operator’s and property’s responsibilities for tampering, loss, damage, and unauthorized entry.", "Request a data-flow description from the operator: cameras, microphones, location, identifiers, flight logs, recipients, storage location, retention period, subprocessors, and incident notice. Distinguish safety telemetry from footage that may capture residents or neighboring property. Do not assume a sensor is not collecting personal data simply because it is installed for navigation."] },
      { heading: "Communicate and respond", paragraphs: ["Set clear notice for affected occupants and neighbors, a contact for questions, and a process for complaints. Explain where the aircraft will operate, what the property controls, and which issues should go to the operator or regulator. Avoid promising that a property can control the full flight path when it cannot.", "Include lost-package, device tampering, unexpected recording, near-miss, and network-compromise scenarios in the incident plan. Agree on preservation of relevant records and notification timelines with the operator and counsel. Revisit the privacy assessment when the camera configuration, route, vendor, or purpose changes."] },
    ],
    checklist: ["Physical access and package custody controls", "Operator data-flow and retention description", "Occupant notice and complaints channel", "Security and safety incident contacts", "Review trigger for system or route changes"],
    sources: source("faaDelivery", "faaPart107"),
    publishedAt,
  },
  {
    slug: "drone-delivery-building-site-selection",
    question: "How do logistics teams choose a property for drone delivery?",
    title: "Selecting a commercial property for drone delivery operations",
    category: "drones",
    categoryLabel: "Drone delivery",
    summary: "Compare delivery demand, route feasibility, safe handoff, airspace constraints, receiving operations, building fit, and local stakeholder impact.",
    answer: "Select sites by combining demand and route feasibility with a safe, secure receiving process and a realistic approvals path. A visually open roof is not enough. Operators should validate aircraft-specific obstacles and operating conditions, while property and design teams review access, structure, power, fire safety, package handling, and community impacts.",
    audience: "Retailers, healthcare and logistics operators, developers, property owners, and drone providers.",
    scope: "Global site-selection framework with U.S. FAA references; actual flight rules and local approvals are market-specific.",
    sections: [
      { heading: "Screen demand and route constraints together", paragraphs: ["Start with who needs deliveries, package characteristics, origin points, service windows, and existing courier performance. Then ask a qualified operator to assess candidate routes, aircraft, obstacles, weather assumptions, and legal operating basis. A site is not attractive if demand exists but flight or handoff constraints make the service unreliable.", "Compare candidate locations on the same evidence: receiving hours, staffing, site access, equipment space, security, electrical service, roof or ground conditions, and proximity to recipients. Make unknowns visible. Do not assign a precise feasibility score unless the inputs and weighting are documented and the operator has validated key route assumptions."] },
      { heading: "Include stakeholders and operating cost", paragraphs: ["Estimate the full delivery chain: operator service, facilities work, equipment, power, connectivity, package storage, staff time, maintenance, permits, insurance, and exception handling. Clarify whether the property is a receiving point, a launch site, a transfer node, or only a customer destination; each implies different operational needs.", "Discuss noise, privacy, visual impact, and safety with affected occupants and neighbors early. Keep approvals distinct: aviation operations, land use, building work, and private property access may involve different decision-makers. A staged pilot with a limited route and explicit stop criteria is safer than investing in permanent equipment before the service model is proven."] },
    ],
    checklist: ["Documented delivery demand and package profile", "Operator route and aircraft screening", "Receiving workflow and exception costs", "Local approvals and stakeholder map", "Pilot scope with measurable stop criteria"],
    sources: source("faaDelivery", "faaPart107"),
    publishedAt,
  },
  {
    slug: "property-autonomy-readiness-assessment",
    question: "What is an autonomous-arrival readiness assessment?",
    title: "What an autonomous-arrival readiness assessment should cover",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "A useful assessment inventories the site, defines a deployment use case, documents constraints and evidence, and turns gaps into a sequenced plan.",
    answer: "It is a structured review of whether a property can support a defined autonomous arrival or delivery workflow, what evidence is available, what constraints remain, and which decisions or upgrades should happen next. It should distinguish verified site facts from assumptions and should not promise that a particular vendor will operate there.",
    audience: "Owners, investors, operators, developers, lenders, and project consultants.",
    scope: "Assessment depth depends on intended use; local engineering, code, legal, utility, and operator confirmation remain separate work.",
    sections: [
      { heading: "Set the decision the assessment must support", paragraphs: ["Name the intended decision: screen a portfolio, compare two sites, prepare a concept, support a capital request, or scope a pilot. Define the vehicle or robot class and user journey. Without a defined use case, a checklist can become a generic inventory that does not answer the buyer’s actual question.", "Gather site plans, access and loading data, curb conditions, parking and garage constraints, utility information, operations contacts, known permits, and prior assessments. Record provenance and confidence for each input. A photo from an old listing should not be presented as verified current geometry."] },
      { heading: "Deliver evidence, gaps, and next actions", paragraphs: ["A credible report separates observed conditions, supplied documents, assumptions, and unknowns. It explains the implications of each gap, who must validate it, and whether the issue is a hard constraint, design choice, approval dependency, or missing evidence. It should not turn uncertain inputs into a precise-looking score without explaining the method.", "Prioritize actions by decision dependency: obtain operator specifications, confirm public curb authority, commission a survey, consult the utility, test a route, or ask the authority having jurisdiction. State what the assessment does not establish, including future service availability, permit approval, code compliance, or engineering adequacy."] },
    ],
    checklist: ["A defined use case and decision", "Current site evidence with confidence labels", "Explicit constraints and unknowns", "Named validation owners", "Sequenced next steps and limitations"],
    sources: source("nacto", "ada", "afdc"),
    publishedAt,
  },
  {
    slug: "robotics-property-readiness-checklist",
    question: "What should be on a property robotics readiness checklist?",
    title: "A property robotics readiness checklist that separates evidence from assumptions",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "Organize due diligence across use case, physical routes, controls, power, people, operations, permissions, and evidence quality.",
    answer: "Include a defined workflow, vehicle or robot specifications, measured access routes, curb or building-system interfaces, accessible pedestrian paths, power and communications, operating ownership, approvals, cybersecurity and privacy questions, and recovery procedures. Mark every item as confirmed, assumed, or unknown and assign an owner for unresolved issues.",
    audience: "Facility managers, developers, property teams, consultants, and procurement leads.",
    scope: "This is a screening checklist, not a substitute for local code analysis, engineering, safety, or legal review.",
    sections: [
      { heading: "Cover the whole operating system", paragraphs: ["Physical categories include approach paths, stopping or delivery points, doors, elevators, loading zones, turning and clearance constraints, pedestrian circulation, accessible routes, and charging locations. Digital categories include communications, access controls, fleet-management interfaces, data handling, and failure behavior. Match each category to the specific robot and site workflow.", "Operational categories include service hours, demand, dispatch, staffing, package or passenger handoff, cleaning, incident response, maintenance, emergency modes, and vendor support. Governance categories include property permissions, public-right-of-way authority, insurance, permits, and the approving professionals. Keep 'not yet known' visible rather than assuming compliance."] },
      { heading: "Make the checklist decision-ready", paragraphs: ["For each question, capture the evidence type, date, source, responsible reviewer, confidence, and next action. A verified measurement differs from a vendor estimate; a conceptual drawing differs from an approved permit. This small discipline makes a checklist useful for capital decisions and repeatable across sites.", "Close the loop with a short list of blockers, dependencies, and reversible pilot steps. Avoid giving a single pass/fail label when readiness depends on an operator, regulator, utility, or future construction. Revisit the record when a site changes or a new vendor proposes a materially different vehicle or workflow."] },
    ],
    checklist: ["Workflow and equipment definition", "Physical, digital, and operating categories", "Evidence source, date, confidence, and owner", "Approval and professional-review dependencies", "Update triggers and pilot actions"],
    sources: source("iso", "vda", "nacto", "ada"),
    publishedAt,
  },
  {
    slug: "budget-autonomous-arrival-infrastructure",
    question: "How much does autonomous-arrival infrastructure cost?",
    title: "How to budget for autonomous-arrival infrastructure without guessing",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "Build a site-specific cost model from defined scope, surveys, utility input, interfaces, approvals, construction, operations, and contingency—not a universal per-site price.",
    answer: "There is no reliable universal price for autonomous-arrival infrastructure. Cost depends on the site, deployment type, civil and electrical work, system interfaces, approvals, labor, operating model, and who pays. Start with a concept scope and obtain local quotes and utility or operator assumptions before presenting a capital range as a decision-grade estimate.",
    audience: "Asset managers, CFOs, owners, developers, estimators, and project teams.",
    scope: "Cost figures are project- and market-specific; this guide intentionally gives no unsupported benchmark prices.",
    sections: [
      { heading: "Separate cost buckets and assumptions", paragraphs: ["List surveys and design, curb or site work, paving and markings, signage, lighting, accessibility upgrades, electrical service, chargers, communications, gates or elevator interfaces, safety controls, permits, commissioning, and contingency where relevant. Add recurring software, support, inspections, cleaning, repairs, staffing, energy, and vendor fees to the operating model.", "For every line item, mark quantity basis, source, date, exclusions, and confidence. Distinguish a screening allowance from a contractor quote and from an approved estimate. Include the cost of enabling work that benefits multiple uses separately from equipment that only one operator needs."] },
      { heading: "Get the right inputs before approving capital", paragraphs: ["Request vehicle envelopes and interface specifications from the operator, utility input for electrical service, measured site information from qualified surveyors, and construction pricing from local contractors. Ask the authority having jurisdiction or relevant agency about approval steps. Vendor demonstrations rarely expose all construction, security, and ongoing service costs.", "Model a base case, a constrained case, and a no-build or alternative case. Show what assumptions change the result and which unknowns can be resolved before commitment. A pilot budget should include monitoring and evaluation, not just installation; a permanent design should include maintenance access and replacement planning."] },
    ],
    checklist: ["Explicit scope and exclusions", "Capex and recurring operating-cost split", "Utility, vendor, survey, and contractor inputs", "Confidence and contingency treatment", "Base, constrained, and alternative scenarios"],
    sources: source("afdc", "afdcTrends", "nacto"),
    publishedAt,
  },
  {
    slug: "choose-robotics-readiness-consultant",
    question: "How do I choose a robotics readiness consultant for a property?",
    title: "Questions to ask before hiring a property robotics readiness consultant",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "Compare consultant scope, independence, evidence standards, professional qualifications, operator access, deliverables, and conflict disclosures.",
    answer: "Choose a consultant who can define the use case, inspect the relevant site systems, document evidence and uncertainty, coordinate qualified specialists, and state what the assessment cannot approve. Ask who performs engineering, code, legal, utility, and operator validation, and whether the consultant receives compensation from vendors it recommends.",
    audience: "Owners, asset managers, procurement teams, and public-sector buyers.",
    scope: "Procurement guidance; professional licensing and procurement rules depend on jurisdiction.",
    sections: [
      { heading: "Test the scope and evidence method", paragraphs: ["Ask for sample deliverables with sensitive information removed. Look for measured conditions, source references, assumptions, a constraints register, decision dependencies, and actionable next steps. Clarify whether the engagement is desktop screening, site visit, concept design, engineering, or implementation support; these scopes are not interchangeable.", "Ask how the team handles a site with missing plans, changing operator specifications, or unresolved curb permission. Good practice makes uncertainty visible and assigns a validation owner rather than filling gaps with generic assertions. Confirm who is qualified to sign any engineering, accessibility, or code work that the client needs."] },
      { heading: "Check independence and implementation fit", paragraphs: ["Request disclosure of vendor relationships, referral fees, product incentives, and subcontractors. Ask how recommendations would change if the preferred vendor were unavailable. Confirm that the consultant’s analysis is technology-neutral enough to compare alternatives, while still specific enough to test real equipment requirements.", "Set acceptance criteria, site access needs, stakeholder interviews, data handling, insurance, schedule assumptions, and change control in the contract. Name the party responsible for permits, utility requests, final design, and operator confirmation. A readiness consultant should not imply that its report guarantees service or governmental approval."] },
    ],
    checklist: ["Clearly bounded assessment scope", "Evidence and uncertainty method", "Qualified specialty reviewers", "Vendor and referral conflict disclosure", "Written deliverables, exclusions, and acceptance criteria"],
    sources: source("nacto", "ada", "afdc"),
    publishedAt,
  },
  {
    slug: "robotaxi-pilot-commercial-property",
    question: "How should a property owner plan a robotaxi pilot?",
    title: "Planning a robotaxi pilot at a commercial property",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "Define a narrow operating hypothesis, confirm permissions and responsibilities, rehearse curb operations, and set measurable safety and service criteria.",
    answer: "Start with a specific passenger journey and a written agreement on operator, property, and public-agency roles. Validate the route and handoff, define accessibility and incident procedures, and set success and stop criteria before inviting passengers. A pilot is a test of operations and governance as well as vehicle technology.",
    audience: "Property executives, mobility teams, operators, municipal partners, and pilot managers.",
    scope: "Pilot authorization, insurance, passenger rules, and accessibility obligations vary by location and service type.",
    sections: [
      { heading: "Set a narrow test hypothesis", paragraphs: ["State what the pilot is meant to learn: passenger wayfinding, curb dwell, dispatch reliability, accessible arrival, or coordination with valet. Define a limited location, period, operating hours, participants, and service boundary. A broad 'future mobility' demonstration makes it difficult to identify whether the site or the operating process succeeded.", "Before launch, obtain the operator’s vehicle and service assumptions, confirm local permissions, and agree on the passenger-facing description. Determine what happens when the curb is occupied, the vehicle is delayed, a route is blocked, or a passenger needs assistance. Rehearse the handoff with property staff and relevant agency partners."] },
      { heading: "Measure, govern, and stop safely", paragraphs: ["Track planned measures such as completed trips, curb conflicts, dwell behavior, route exceptions, assistance requests, accessibility feedback, incidents, and staff effort. Define who can pause the pilot, who notifies passengers, and how the site returns to normal operation. Handle any personal or location data under a documented policy.", "Agree in writing on insurance, indemnity, incident reporting, maintenance, emergency contacts, data access, public communications, and the division of operating responsibilities. Review results with the property, operator, and public partners before expansion. A successful pilot in one location does not automatically establish readiness at another property or permission for a broader service."] },
    ],
    checklist: ["Specific test hypothesis and bounded site", "Operator and public permissions confirmed", "Passenger, accessibility, and incident procedures", "Named pause authority and stop criteria", "Post-pilot review before expansion"],
    sources: source("nacto", "ada"),
    publishedAt,
  },
  {
    slug: "robot-vendor-property-compatibility",
    question: "How can buyers compare robot vendors for a commercial property?",
    title: "A property-led checklist for comparing robotics vendors",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "Compare vendors on the same measured route, building interfaces, safety evidence, security, support model, and total cost of operation.",
    answer: "Use one site-specific request for information and test each supplier against the same workflow, route, access systems, safety controls, data questions, support coverage, and commercial terms. Ask for demonstrated compatibility at the actual site and document what requires a third-party interface or future building work.",
    audience: "Procurement, property operations, technology teams, and deployment partners.",
    scope: "Vendor diligence checklist, not a certification or endorsement of any robot product.",
    sections: [
      { heading: "Compare against the same task and site", paragraphs: ["Give vendors an identical workflow description, floor plan or site plan, operating schedule, load or passenger requirements, and exception scenarios. Request vehicle dimensions, turning and clearance needs, supported doors or elevator interfaces, charging requirements, communication assumptions, and routes already validated in comparable settings.", "Ask suppliers to distinguish standard capability from custom integration and site-specific commissioning. Clarify which third parties must participate, who pays, how software updates are tested, and how systems revert if an interface fails. A standards-based interface can help interoperability but does not eliminate the need to validate the complete site configuration."] },
      { heading: "Evaluate safety, security, and support", paragraphs: ["Request the supplier’s safety case or relevant documentation, operating limits, incident history available for disclosure, cybersecurity practices, data flows, retention, and vulnerability process. Have qualified internal reviewers assess whether the evidence applies to the intended use and local requirements; a certificate in one domain is not blanket approval for every building.", "Compare response times, parts availability, local service coverage, training, spare equipment, uptime definition, termination support, and data export. Model total cost over the intended period, including installation, integration, facilities work, recurring support, and staff supervision. Define acceptance criteria in a site trial before selecting a long-term deployment."] },
    ],
    checklist: ["Identical site-specific vendor brief", "Supported interface and custom-work disclosure", "Safety and cybersecurity evidence", "Local service and lifecycle-cost comparison", "Trial acceptance criteria"],
    sources: source("iso", "vda"),
    publishedAt,
  },
  {
    slug: "mobile-robot-interoperability-building-systems",
    question: "Do mobile robots need a common standard to work in a building?",
    title: "Mobile robot interoperability: what standards do—and do not—solve",
    category: "delivery-robots",
    categoryLabel: "Indoor delivery robots",
    summary: "Understand the role of fleet and robot interfaces while keeping elevator, door, safety, building, and vendor compatibility as separate checks.",
    answer: "A common interface can improve communication between robots and a fleet or master-control system, but it does not make every robot compatible with every building system. Buyers still need to validate the exact versions, workflow, elevator and door interfaces, safety behavior, network, security controls, and vendor support for the deployed configuration.",
    audience: "Technical buyers, building-system integrators, facility IT, and robotics vendors.",
    scope: "Standards evolve; verify the current edition and scope with the standards body and project specialists.",
    sections: [
      { heading: "Match the standard to the interface", paragraphs: ["VDA 5050 is an example of an interface specification for communication between mobile robots and a master control system. Determine whether the vendors support the same version, required message features, and operational model. Ask which functions are actually interoperable and which remain proprietary or dependent on a vendor-specific adapter.", "Do not extend an interface claim beyond its scope. Fleet coordination is distinct from elevator dispatch, door access, building-management systems, fire alarms, or public curb operations. Each boundary needs an owner, documented integration method, permission, test plan, and fallback."] },
      { heading: "Verify safety and lifecycle compatibility", paragraphs: ["Check applicable safety standards and the product’s intended operating environment, then have qualified professionals determine how they apply. ISO 3691-4 addresses safety requirements and verification for driverless industrial trucks and their systems; it should not be read as a universal certification for every service robot or building deployment.", "Record versions, network dependencies, update policy, event logs, and vendor support commitments. Test two vendors or systems only if the building has a real multi-vendor requirement; otherwise avoid integration complexity that does not support a defined operating benefit. Revalidate after software, controller, or equipment changes."] },
    ],
    checklist: ["Specific interface and standard edition", "Compatibility matrix across all system boundaries", "Applicable safety evidence and scope", "Fallback for disconnected or unsupported interfaces", "Version and update governance"],
    sources: source("vda", "iso"),
    publishedAt,
  },
  {
    slug: "ev-charging-commercial-property-readiness",
    question: "How do I assess EV charging readiness at a commercial property?",
    title: "Assessing EV charging readiness for a commercial property",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "Assess charging demand, parking dwell, electrical service, utility process, accessibility, equipment operations, and future expansion before choosing charger counts.",
    answer: "Begin with who will charge, when, for how long, and at what power level; then evaluate electrical service and the utility’s upgrade path with qualified professionals. Charger quantity should follow a documented demand and load plan, parking layout, budget, and phasing decision—not a universal ratio detached from property use.",
    audience: "Owners, facility directors, workplace and retail operators, electrical engineers, and fleet managers.",
    scope: "DOE sources provide U.S. context. Electrical codes, incentives, utility programs, and accessibility rules differ by jurisdiction.",
    sections: [
      { heading: "Profile demand and dwell time", paragraphs: ["Segment expected users: employees, tenants, visitors, residents, fleet vehicles, or public drivers. Estimate arrival patterns, parking duration, charging frequency, and whether vehicles can be moved. These demand profiles lead to different power and access decisions; long-stay workplace charging is not the same service as a high-turnover retail or fleet site.", "Map candidate stalls, accessible routes, cable reach, signage, lighting, payment needs, and operations. Decide whether chargers will be public, controlled, or dedicated. Include maintenance, uptime, customer support, billing, and enforcement in the operating model rather than treating the equipment purchase as the full cost."] },
      { heading: "Confirm electrical and expansion feasibility", paragraphs: ["Have an electrical professional assess service, panels, transformer, spare capacity, load management options, and distribution distance. Ask the utility about service capacity, interconnection or service-upgrade timing, fees, and required studies. The site owner’s nameplate information is not a substitute for a utility determination.", "Compare phased installation and managed charging with immediate full build-out using realistic utilization assumptions. Check local building, electrical, fire, accessibility, and permitting requirements. U.S. DOE’s Alternative Fuels Data Center provides infrastructure context, but it cannot determine the capacity or cost of upgrades at an individual property."] },
    ],
    checklist: ["User groups and dwell profile", "Parking and accessible-route plan", "Electrical assessment by qualified professional", "Utility capacity and upgrade information", "Operations, maintenance, billing, and phasing plan"],
    sources: source("afdc", "afdcTrends", "ada"),
    publishedAt,
  },
  {
    slug: "autonomous-arrival-accessibility-review",
    question: "How should accessibility be included in autonomous-arrival planning?",
    title: "Accessibility review for autonomous arrivals and delivery routes",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "Include the entire journey—vehicle or curb, waiting area, entrance, circulation, and handoff—and involve qualified reviewers and affected users early.",
    answer: "Plan an equivalent, continuous journey from the pick-up or delivery point to the destination. Review clear routes, curb ramps, crossings, door and elevator access, communication, handoff options, and human assistance. Do not assume the vehicle or robot itself solves accessibility, and do not shift equipment into an accessible route to make space.",
    audience: "Owners, architects, transportation planners, accessibility professionals, and mobility operators.",
    scope: "Applicable standards and legal duties vary by country, facility, and project; the U.S. ADA reference is not a global design code.",
    sections: [
      { heading: "Assess the whole user journey", paragraphs: ["Map arrival, waiting, boarding or alighting, entrance, internal circulation, and the final destination. Include curb ramps, crossings, slopes, surface conditions, door clearances, elevators, signage, lighting, shelter, and reach to controls. Consider passengers who cannot use an app or who require more time, assistance, or an alternate handoff.", "Consult people with disabilities and qualified accessibility professionals while alternatives are still possible. A vehicle’s accessible boarding capability does not solve a blocked sidewalk, and a robot’s obstacle detection does not establish that its route is accessible. Test at the actual site and across different operating conditions."] },
      { heading: "Preserve routes and service alternatives", paragraphs: ["Keep robot waiting, charging, and package handoff areas outside required clear paths. Establish how the service handles a lift outage, blocked curb, missed stop, or a customer needing assistance. Provide a human contact and a practical equivalent service when the automated route cannot be used.", "In the U.S., the Access Board publishes ADA Standards for covered facilities. Determine which requirements apply to the project with the design and compliance team; a web guide cannot decide that question. Document review findings, responses, and changes in the final site plan."] },
    ],
    checklist: ["Journey map from arrival point to destination", "Consultation with affected users and experts", "Clear paths and no robot-storage conflicts", "Accessible alternate and assistance plan", "Jurisdiction-specific standards review"],
    sources: source("ada", "nacto"),
    publishedAt,
  },
  {
    slug: "compare-arrival-options-property",
    question: "Should a property prepare for robotaxis, delivery robots, drones, or EV charging first?",
    title: "Prioritizing autonomous-arrival investments at a property",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "Rank investment options by an actual user problem, operator availability, site constraints, evidence, reversibility, and value—not by hype or a generic technology score.",
    answer: "Start with the operational need: passenger arrival, internal deliveries, air delivery, or vehicle charging. For each option, confirm demand, a plausible operator, site fit, approvals, interfaces, total cost, and a measurable outcome. Prioritize low-regret evidence gathering and reversible pilots before permanent infrastructure whose value depends on an unconfirmed service.",
    audience: "Property executives, asset managers, operators, investment committees, and consultants.",
    scope: "Decision framework only. Service availability and approvals are market- and property-specific.",
    sections: [
      { heading: "Compare like with like", paragraphs: ["Define the problem and service target for every option. Robotaxi access is a curb and passenger journey question; indoor delivery robots depend on building routes and interfaces; drone delivery requires an operator and lawful flight path; EV charging depends on parking demand and electrical service. A single generic 'robotics readiness' label conceals these distinct dependencies.", "Score evidence, not enthusiasm. Record demand, operator interest, site constraints, permissions, utility or building dependencies, estimated cost confidence, and reversibility. Use unknown rather than zero where a dependency has not been tested, and keep regulatory approvals separate from engineering feasibility."] },
      { heading: "Sequence discovery before construction", paragraphs: ["Prioritize surveys, operator conversations, curb-authority questions, electrical studies, and workflow observation that unlock multiple decisions. Compare a no-build or conventional-service alternative. If a pilot is justified, bound its location and duration, set operational and accessibility measures, and define a stop decision before equipment is installed.", "Revisit priorities when a provider enters the market, the property is renovated, utility capacity changes, or operating needs shift. Treat the result as a decision record with evidence and date, not a permanent prediction about which autonomy technology will win."] },
    ],
    checklist: ["Distinct problem statement for each technology", "Demand and operator evidence", "Site, permission, and interface dependencies", "Cost confidence and alternative comparison", "Reversible pilot and review trigger"],
    sources: source("nacto", "faaDelivery", "afdc"),
    publishedAt,
  },
  {
    slug: "commercial-building-robot-connectivity",
    question: "What connectivity does a commercial building need for robots?",
    title: "Connectivity planning for robots in commercial buildings",
    category: "delivery-robots",
    categoryLabel: "Indoor delivery robots",
    summary: "Map the actual routes, network dependencies, cybersecurity boundary, dead zones, and offline behavior before adding robots to building networks.",
    answer: "There is no universal bandwidth requirement for every robot. Obtain the vendor’s documented network, latency, coverage, security, and offline assumptions, then measure the intended routes and review them with facility IT. A route that works in a lobby may fail in a basement, elevator, stairwell, or shielded service area.",
    audience: "Facility IT, building engineers, security teams, robot integrators, and property operators.",
    scope: "Network architecture and cybersecurity requirements are organization- and jurisdiction-specific.",
    sections: [
      { heading: "Measure coverage on the operating route", paragraphs: ["Ask what functions depend on cloud access, local network, cellular, Wi-Fi roaming, or onboard autonomy. Obtain the supplier’s supported bands, authentication method, latency assumptions, data usage, and response when connectivity drops. Walk and measure the actual route, including elevators, loading areas, parking levels, and service corridors.", "Do not use a single lobby speed test as proof of coverage everywhere. Identify known dead zones, handoff delays, interference, network maintenance windows, and congested periods. Decide whether a local network change is justified or whether an alternative route or offline-safe behavior is more appropriate."] },
      { heading: "Review security and degraded operation", paragraphs: ["Place devices on an approved network segment with least-privilege access and a defined update process. Understand identity, encryption, remote support, logs, data retention, vulnerability disclosure, and vendor access. Coordinate review with the organization’s security team rather than connecting a device directly to a sensitive building or clinical network.", "Test loss of network, DNS, cloud service, authentication, and fleet-management connection. Define whether the robot stops safely, finishes a local task, or requires staff intervention. Document who receives outage alerts, how a robot is recovered, and what logs are available after restoration."] },
    ],
    checklist: ["Vendor network dependency specification", "Measured end-to-end route coverage", "Approved segmented network design", "Offline and outage behavior", "Remote access and update governance"],
    sources: source("iso", "vda"),
    publishedAt,
  },
  {
    slug: "autonomous-arrival-readiness-documentation",
    question: "What documents should I gather before a property readiness review?",
    title: "Documents to gather before an autonomous-arrival site review",
    category: "planning",
    categoryLabel: "Readiness & investment",
    summary: "Prepare current plans, access and operations information, system details, approvals, and owner contacts so the review can distinguish facts from assumptions.",
    answer: "Gather current site and floor plans, survey or curb information, parking and loading rules, access-control and elevator details, utility records, emergency procedures, permits, operating hours, and vendor specifications. Date and label each file, note what has changed, and identify gaps. A desktop review should not treat old drawings as verified field conditions.",
    audience: "Property managers, engineers, owners, consultants, and project coordinators.",
    scope: "The right evidence depends on the technology and project stage; protect confidential plans and personal data appropriately.",
    sections: [
      { heading: "Collect current physical and operating records", paragraphs: ["For external arrivals, assemble boundary and access plans, curb ownership or permit records, loading and valet operations, traffic circulation, entrance locations, and accessible-route documentation. For indoor robots, include floor plans, elevator and door details, operating schedules, and approved access zones. For charging or drone systems, include the relevant electrical, roof, structural, or receiving information.", "Add emergency procedures, maintenance contacts, known construction changes, communications coverage observations, and building-system vendors. Label each source with date, author, and status—record drawing, permit set, concept, or field-verified. This makes it clear which facts need a site walk or professional confirmation."] },
      { heading: "Prepare for responsible sharing", paragraphs: ["Before sending plans or security-sensitive information to an external provider, check the organization’s confidentiality and data-handling requirements. Share only what is necessary, use an approved transfer method, and clarify retention, access, and deletion. Remove personal information that is not needed for the assessment.", "Create a contact sheet of the property decision-maker, facilities lead, security or IT owner, accessibility contact, utility representative, and relevant vendor or public agency. A document package is most useful when each unresolved question has a person who can confirm or correct the record."] },
    ],
    checklist: ["Current site and floor plans with status labels", "Access, curb, and operations records", "Elevator, door, electrical, or roof-system details as relevant", "Emergency and maintenance contacts", "Approved secure-sharing process"],
    sources: source("nacto", "ada", "afdc"),
    publishedAt,
  },
]

export function getFeedArticle(slug: string) {
  return FEED_ARTICLES.find((article) => article.slug === slug)
}

export function getFeedCategory(slug: string) {
  return FEED_CATEGORIES.find((category) => category.slug === slug)
}

export const FEED_RESEARCH_NOTE =
  "These questions are editorial research hypotheses drawn from recurring property, operations, procurement, standards, and regulatory topics. They are not represented as measured search volumes or a live export of Google or AI-tool queries. Validate demand using first-party analytics and customer interviews before making investment decisions."

export const FEED_EDITORIAL_NOTE =
  "RoboReady’s guides are planning information, not legal, engineering, safety, code-compliance, aviation, accessibility, or investment advice. Standards, laws, operator capabilities, and approvals change; confirm current requirements with the responsible authority and qualified professionals for the specific site."

export const FEED_SITE_URL = "https://roboready.net"

export function getFeedArticleText(article: FeedArticle) {
  return [article.question, article.title, article.summary, article.answer, article.audience, article.scope, ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs]), ...article.checklist].join(" ")
}

export function getArticlesForCategory(category?: string) {
  return category ? FEED_ARTICLES.filter((article) => article.category === category) : FEED_ARTICLES
}

export function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character)
}

export function feedArticleUrl(article: FeedArticle) {
  return `${FEED_SITE_URL}/feeds/${article.slug}`
}

export function buildRssFeed(title: string, description: string, articles: FeedArticle[], feedUrl = `${FEED_SITE_URL}/feeds/rss.xml`) {
  const items = articles.map((article) => `
    <item>
      <title>${escapeXml(article.question)}</title>
      <link>${feedArticleUrl(article)}</link>
      <guid isPermaLink="true">${feedArticleUrl(article)}</guid>
      <description>${escapeXml(article.summary)}</description>
      <category>${escapeXml(article.categoryLabel)}</category>
      <pubDate>${new Date(`${article.publishedAt}T12:00:00Z`).toUTCString()}</pubDate>
    </item>`).join("")
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${FEED_SITE_URL}/feeds</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`
}

export function getFeedJsonLd(article: FeedArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    inLanguage: "en",
    author: { "@type": "Organization", name: "RoboReady Editorial" },
    publisher: { "@type": "Organization", name: "RoboReady", url: FEED_SITE_URL },
    mainEntityOfPage: feedArticleUrl(article),
    citation: article.sources.map((item) => item.url),
  }
}

export const FEED_GROUPS = FEED_CATEGORIES.map((category) => ({
  ...category,
  articles: FEED_ARTICLES.filter((article) => article.category === category.slug),
}))

if (FEED_ARTICLES.length !== 30 || FEED_ARTICLES.some((article) => !article.title || !article.answer || article.sections.length < 2 || article.sources.length === 0)) {
  throw new Error("The RoboReady buyer-question library must contain 30 sourced, substantive guides.")
}
if (new Set(FEED_ARTICLES.map((article) => article.slug)).size !== FEED_ARTICLES.length) {
  throw new Error("The RoboReady buyer-question library contains duplicate slugs.")
}

export const FEED_CONTENT_LAST_UPDATED = "2026-09-30"
export const FEED_SOURCE_IDS = Object.keys(FEED_SOURCES)
export const FEED_BUILD_NOTE = "Editorially reviewed for clarity and source scope; re-check dynamic legal and standards references before relying on them."
export const FEED_NON_GOALS = "No search-volume estimates, rankings, operator-compatibility claims, or permit approvals are implied."
export const FEED_CANONICAL_ROOT = `${FEED_SITE_URL}/feeds`
export const FEED_RSS_ROOT = `${FEED_CANONICAL_ROOT}/rss.xml`
export const FEED_DATE = new Date(`${FEED_CONTENT_LAST_UPDATED}T12:00:00Z`)
export const FEED_EDITOR = "RoboReady Editorial"
export const FEED_CATEGORY_LABELS = Object.fromEntries(FEED_CATEGORIES.map((category) => [category.slug, category.label])) as Record<FeedCategory, string>
export const FEED_ARTICLE_COUNT = FEED_ARTICLES.length
export const FEED_TOPIC_COUNT_BY_CATEGORY = Object.fromEntries(FEED_CATEGORIES.map((category) => [category.slug, FEED_ARTICLES.filter((article) => article.category === category.slug).length])) as Record<FeedCategory, number>
export const FEED_SITE_NAME = "RoboReady Field Guides"
export const FEED_DEFAULT_DESCRIPTION = "Evidence-led planning guides for autonomous arrivals, property robotics, drone delivery, and charging infrastructure."
export const FEED_RSS_TYPE = "application/rss+xml"
export const FEED_LANG = "en"
export const FEED_EDITORIAL_UPDATED = "Reviewed September 30, 2026"
export const FEED_MAINTAINER_EMAIL = "hello@roboready.app"
export const FEED_COPYRIGHT = `© ${new Date().getFullYear()} RoboReady`
export const FEED_TTL_MINUTES = 360
export const FEED_GENERATOR = "RoboReady Editorial Library"
export const FEED_CATEGORY_BASE = `${FEED_CANONICAL_ROOT}/rss`
export const FEED_ROBOTS = "index,follow"
export const FEED_OPEN_GRAPH_TYPE = "article"
export const FEED_AUTHOR_URL = `${FEED_SITE_URL}/how-it-works`
export const FEED_BRAND_LABEL = "RoboReady / Field Guides"
export const FEED_PAGE_SIZE = 30
export const FEED_SEARCH_PLACEHOLDER = "Search buyer questions"
export const FEED_SEARCH_LABEL = "Search guides"
export const FEED_SOURCE_LABEL = "Primary references"
export const FEED_LAST_REVIEWED_LABEL = "Editorial review"
export const FEED_JURISDICTION_LABEL = "Scope"
export const FEED_READING_LABEL = "Direct answer"
export const FEED_AUDIENCE_LABEL = "Useful for"
export const FEED_CHECKLIST_LABEL = "Questions to take into the project"
export const FEED_CONTACT_LABEL = "Plan a site assessment"
export const FEED_CONTACT_URL = "/how-it-works"
export const FEED_BACK_LABEL = "All buyer questions"
export const FEED_ALL_CATEGORIES_LABEL = "All topics"
export const FEED_RSS_LABEL = "RSS feed"
export const FEED_HUB_LABEL = "Field guide library"
export const FEED_METHOD_LABEL = "How this question map was built"
export const FEED_DISCLAIMER_LABEL = "Editorial scope"
export const FEED_ANSWER_LABEL = "Short answer"
export const FEED_RSS_ALL_TITLE = "RoboReady Field Guides — All Topics"
export const FEED_RSS_ALL_DESCRIPTION = FEED_DEFAULT_DESCRIPTION
export const FEED_SEARCH_PARAM = "q"
export const FEED_CATEGORY_PARAM = "category"
export const FEED_RESEARCH_SOURCE_COUNT = FEED_SOURCES ? Object.keys(FEED_SOURCES).length : 0
export const FEED_SCHEMA_LANGUAGE = "en-US"
export const FEED_SITEMAP_CHANGE_FREQUENCY = "monthly" as const
export const FEED_SITEMAP_PRIORITY = 0.7
export const FEED_FEED_UPDATED_AT = FEED_DATE
export const FEED_INDEX_TITLE = "RoboReady Field Guides: Questions about property robotics"
export const FEED_INDEX_DESCRIPTION = "Answers to the questions property owners, operators, and buyers ask about robotaxis, delivery robots, drones, and readiness planning."
export const FEED_METADATA_TITLE = "Property Robotics & Autonomous Arrival Guides"
export const FEED_METADATA_DESCRIPTION = FEED_INDEX_DESCRIPTION
export const FEED_ARTICLE_META_SUFFIX = "RoboReady Field Guides"
export const FEED_GLOBAL_SCOPE_NOTE = "Pages are globally accessible; the cited regulatory examples are explicitly identified by jurisdiction."
export const FEED_FACT_POLICY = "Separate observed or cited requirements from assumptions; verify current local rules before deployment."
export const FEED_SITEMAP_LAST_MODIFIED = FEED_DATE
export const FEED_HOME_LINK_LABEL = "Explore field guides"
export const FEED_HOME_LINK_URL = "/feeds"
export const FEED_ARCHIVE_ROUTE = "/feeds"
export const FEED_ARTICLE_ROUTE_PREFIX = "/feeds/"
export const FEED_CATEGORY_RSS_ROUTE_PREFIX = "/feeds/rss/"
export const FEED_EMPTY_SEARCH_LABEL = "No guides match those words yet. Try a broader term or browse a topic."
export const FEED_CATEGORY_FILTER_LABEL = "Browse by decision"
export const FEED_INDEX_KICKER = "Field guides · 30 researched buyer questions"
export const FEED_INDEX_INTRO = "Practical answers for the teams preparing commercial properties for robotaxi arrivals, indoor delivery robots, drone handoffs, and charging infrastructure."
export const FEED_INDEX_PROMISE = "Each guide starts with the buyer’s question, distinguishes planning from approval, and links to the primary references behind its answer."
export const FEED_NO_VOLUME_CLAIM = "Question themes are editorially researched—not presented as measured keyword volumes or a live query export."
export const FEED_EVIDENCE_LABEL = "Evidence, not hype"
export const FEED_ARTICLE_BYLINE = "RoboReady Editorial"
export const FEED_ARTICLE_UPDATED_LABEL = "Updated"
export const FEED_DESCRIPTION_MAX = 320
export const FEED_ARTICLE_PATH = (slug: string) => `${FEED_CANONICAL_ROOT}/${slug}`
export const FEED_RSS_CATEGORY_PATH = (slug: string) => `${FEED_CATEGORY_BASE}/${slug}`
export const FEED_CATEGORY_RSS_URLS = FEED_CATEGORIES.map((category) => FEED_RSS_CATEGORY_PATH(category.slug))
export const FEED_CANONICALS = FEED_ARTICLES.map((article) => FEED_ARTICLE_PATH(article.slug))
export const FEED_CATEGORIES_COUNT = FEED_CATEGORIES.length
export const FEED_AUTHORITY_NOTE = "References are selected for the specific claim described beside each source; they do not endorse RoboReady or constitute a complete regulatory review."
export const FEED_INDEX_UPDATED = "September 30, 2026"
export const FEED_SITE_BASE = FEED_SITE_URL
export const FEED_VERSION = "1.0"
export const FEED_PUBLIC = true
export const FEED_ROBOTS_ALLOW = "/feeds/"
export const FEED_XML_CACHE_SECONDS = 3600
export const FEED_XML_STALE_SECONDS = 86400
export const FEED_RSS_CONTENT_TYPE = "application/rss+xml; charset=utf-8"
export const FEED_XML_CONTENT_TYPE = "application/xml; charset=utf-8"
export const FEED_CANONICAL_URL = FEED_CANONICAL_ROOT
export const FEED_DESCRIPTION = FEED_DEFAULT_DESCRIPTION
export const FEED_PUBLICATION = "RoboReady"
export const FEED_PUBLICATION_URL = FEED_SITE_URL
export const FEED_SITE_LOCALE = "en_US"
export const FEED_SECTION_ORDER = ["robotaxi", "delivery-robots", "drones", "planning"] as const
export const FEED_MIN_ARTICLE_WORDS = 150
export const FEED_BUILD_ID = "roboready-field-guides-2026-09"
export const FEED_SCHEMA_TYPE = "Article"
export const FEED_URL_PATTERN = /^https:\/\//
export const FEED_SAFE_SOURCE_COUNT = FEED_SOURCES ? Object.keys(FEED_SOURCES).length : 0
export const FEED_CATEGORY_SLUGS = FEED_CATEGORIES.map((category) => category.slug)
export const FEED_SLUGS = FEED_ARTICLES.map((article) => article.slug)
export const FEED_REFERENCE_NOTE = "Links open official standards, agency, and planning references in a new tab from the guide pages."
export const FEED_FRESHNESS_NOTE = "Standards and regulations change; check current primary sources before action."
export const FEED_QUESTION_COUNT_LABEL = `${FEED_ARTICLE_COUNT} buyer questions`
export const FEED_PAGES_TITLE = "Buyer question library"
export const FEED_PAGE_A11Y_LABEL = "RoboReady field guide navigation"
export const FEED_SITEMAP_URLS = FEED_ARTICLES.map((article) => FEED_ARTICLE_PATH(article.slug))
export const FEED_INDEX_RSS_URL = FEED_RSS_ROOT
export const FEED_DESCRIPTION_BY_CATEGORY = Object.fromEntries(FEED_CATEGORIES.map((category) => [category.slug, category.description])) as Record<FeedCategory, string>
export const FEED_SUMMARY_CLAMP = 156
export const FEED_CONTENT_CLAMP = 240
export const FEED_CRAWLER_NOTE = "The XML feeds expose summaries and canonical article links; full answers remain on the RoboReady site."
export const FEED_IDENTITY = { name: "RoboReady", url: FEED_SITE_URL }
export const FEED_SITEMAP_ROBOTS = "index,follow"
export const FEED_TAXONOMY_NOTE = "Categories follow the buyer’s decision path rather than vendor product names."
export const FEED_MARKETING_NOTE = "This editorial hub is a public discovery resource and is separate from RoboReady’s authenticated assessment workflow."
export const FEED_CATEGORIES_URL = `${FEED_CANONICAL_ROOT}#topics`
export const FEED_HUB_CANONICAL = FEED_CANONICAL_ROOT
export const FEED_CANONICAL_ORIGIN = new URL(FEED_SITE_URL).origin
export const FEED_LAST_PUBLISHED = FEED_DATE
export const FEED_TECHNICAL_NOTE = "Structured data describes the visible article; no review ratings, search volume, or FAQ rich-result claims are added."
export const FEED_ARTICLE_PATHS = FEED_SLUGS.map((slug) => FEED_ARTICLE_PATH(slug))
export const FEED_TOPIC_PATHS = FEED_CATEGORIES.map((category) => `${FEED_CANONICAL_ROOT}?category=${category.slug}`)
export const FEED_CONTRIBUTION_NOTE = "Questions reflect editorial research and buyer-language patterns, not a claim to have queried private AI conversations."
export const FEED_LOCALIZATION_NOTE = "The initial edition is English; regulatory examples identify their jurisdiction."
export const FEED_META_ROBOTS = { index: true, follow: true } as const
export const FEED_SOURCE_LINK_REL = "noopener noreferrer"
export const FEED_ARTICLE_HEADING_LEVEL = 2
export const FEED_HOME_H1 = "The questions buyers ask before robots reach a property"
export const FEED_ARTICLE_H1_LABEL = "Buyer question"
export const FEED_PAGE_INTRO_LABEL = "A practical answer, with boundaries"
export const FEED_RSS_DISCOVERY_LABEL = "Subscribe to updates"
export const FEED_CITATION_LABEL = "Sources and further reading"
export const FEED_SITE_SCOPE = "Worldwide access; local rules vary"
export const FEED_DATE_LABEL = "Reviewed"
export const FEED_RESOURCE_TYPE = "Field guide"
export const FEED_ARTICLE_COUNT_COPY = `${FEED_ARTICLE_COUNT} distinct guides`
export const FEED_QUERY_LIMIT_NOTE = "Use search to find a question by technology, building system, or project decision."
export const FEED_FEED_SUBTITLE = "Research-led answers for property decision-makers"
export const FEED_ARTICLE_NOTICE = "Planning information only; it is not a substitute for operator validation or professional review."
export const FEED_URLS = { index: FEED_CANONICAL_ROOT, allRss: FEED_RSS_ROOT }
export const FEED_OPENGRAPH_IMAGE: string | undefined = undefined
export const FEED_SITEMAP_INCLUDE = true
export const FEED_RSS_INCLUDE_CATEGORIES = true
export const FEED_ARTICLE_SECTIONS_LABEL = "What to verify"
export const FEED_QUESTIONS_LABEL = "Bring these questions to the team"
export const FEED_NAV_LINKS = ["Robotaxi & curb", "Indoor delivery robots", "Drone delivery", "Readiness & investment"]
export const FEED_CONTENT_GOVERNANCE = "Review citations and policy-sensitive sections periodically; update page dates only when the content is materially reviewed."
export const FEED_NUMBER_FORMAT = new Intl.NumberFormat("en-US")
export const FEED_MAX_RESULTS = FEED_ARTICLE_COUNT
export const FEED_MARKETING_CTA = "Assess a property"
export const FEED_MARKETING_CTA_PATH = "/sign-up"
export const FEED_ROUTE_FALLBACK = "/feeds"
export const FEED_SORT = "editorial"
export const FEED_XML_VALIDATION = "RSS 2.0"
export const FEED_SCHEMA_POLICY = "JSON-LD mirrors visible article text and cited references."
export const FEED_DISCOVERY_HINT = "Search the question library or subscribe to an RSS category feed."
export const FEED_METADATA_KEYWORDS = ["commercial property robotics", "robotaxi readiness", "delivery robot building", "drone delivery property", "autonomous arrival planning"]
export const FEED_READER_NOTE = "Written for property, operations, procurement, and investment teams."
export const FEED_ARTICLE_LAYOUT = "editorial"
export const FEED_PRIMARY_COLOR_TOKEN = "primary"
export const FEED_NEUTRAL_COLOR_TOKENS = ["background", "foreground", "muted", "border"]
export const FEED_RSS_ATOM_NAMESPACE = "http://www.w3.org/2005/Atom"
export const FEED_XML_VERSION = "1.0"
export const FEED_XML_ENCODING = "UTF-8"
export const FEED_CATEGORY_SLUG_PATTERN = /^[a-z-]+$/
export const FEED_LANGUAGE_CODE = "en"
export const FEED_DISPLAY_YEAR = "2026"
export const FEED_SOURCE_POLICY = "Prefer primary agencies, standards bodies, and established planning organizations."
export const FEED_INDEX_CATEGORY_PROMPT = "Choose the decision you are trying to make."
export const FEED_INDEX_SOURCE_PROMPT = "Each article links sources that support the topic, with scope notes."
export const FEED_INDEX_INTENT_PROMPT = "A map of important buyer questions, not a keyword-volume report."
export const FEED_LISTING_LAYOUT = "responsive-grid"
export const FEED_SEMANTIC_TITLE = "RoboReady field guides"
export const FEED_CATEGORY_SELECT_LABEL = "Filter by topic"
export const FEED_OPEN_GRAPH_SITE = "RoboReady"
export const FEED_DIRECT_ANSWER_LABEL = "In brief"
export const FEED_ARTICLE_AUDIENCE_LABEL = "For"
export const FEED_ARTICLE_SCOPE_LABEL = "Jurisdiction and limits"
export const FEED_ARTICLE_LIST_LABEL = "Related guides"
export const FEED_ARTICLE_RELATED_LIMIT = 3
export const FEED_FEED_PATH = "/feeds/rss.xml"
export const FEED_ENCLOSURE_POLICY = "No external media enclosures"
export const FEED_WRITING_POLICY = "Answer first, then qualify scope, evidence, and next steps."
export const FEED_CONTENT_SOURCE = "Research and editorial synthesis"
export const FEED_PUBLICATION_TYPE = "public field guides"
export const FEED_CATEGORY_LINK_PREFIX = "/feeds?category="
export const FEED_CATEGORY_LABELS_BY_SLUG = FEED_CATEGORY_LABELS
export const FEED_FEED_LAST_BUILD_DATE = FEED_DATE.toUTCString()
export const FEED_ARTICLE_SOURCE_LINKS = (article: FeedArticle) => article.sources
export const FEED_DATE_DISPLAY = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
export const FEED_SEARCH_TRIM = (value: string) => value.trim().toLowerCase()
export const FEED_DEFAULT_SCOPE = "Global planning context; local law and technical requirements must be verified."
export const FEED_CRAWLABLE_LINKS = FEED_ARTICLE_PATHS
export const FEED_EDITORIAL_CONTACT = "hello@roboready.app"
export const FEED_RSS_ALL_PATH = "/feeds/rss.xml"
export const FEED_PAGE_CANONICAL = FEED_CANONICAL_ROOT
export const FEED_PAGE_TITLE = "Field guides for autonomous arrivals"
export const FEED_PAGE_DESCRIPTION = "A curated set of answers to property robotics and autonomous arrival questions."
export const FEED_SEO_POLICY = "Useful distinct answers; no doorway pages or fabricated query data."
export const FEED_AUTHOR_ORG = "RoboReady Editorial"
export const FEED_ARTICLE_ORGANIZATION = "RoboReady"
export const FEED_ROBOTAXI_COUNT = FEED_ARTICLES.filter((article) => article.category === "robotaxi").length
export const FEED_DELIVERY_COUNT = FEED_ARTICLES.filter((article) => article.category === "delivery-robots").length
export const FEED_DRONE_COUNT = FEED_ARTICLES.filter((article) => article.category === "drones").length
export const FEED_PLANNING_COUNT = FEED_ARTICLES.filter((article) => article.category === "planning").length
export const FEED_COPYRIGHT_YEAR = new Date().getFullYear()
export const FEED_PUBLIC_INDEX = true
export const FEED_DISCOVERY_PATHS = [FEED_RSS_ROOT, ...FEED_CATEGORY_RSS_URLS]
export const FEED_PUBLICATION_DESCRIPTION = FEED_DEFAULT_DESCRIPTION
export const FEED_ARTICLE_BYLINE_TEXT = `By ${FEED_EDITOR}`
export const FEED_PRIMARY_ACTION = { label: FEED_MARKETING_CTA, href: FEED_MARKETING_CTA_PATH }
export const FEED_RELATED_GUIDES = (article: FeedArticle) => FEED_ARTICLES.filter((other) => other.category === article.category && other.slug !== article.slug).slice(0, FEED_ARTICLE_RELATED_LIMIT)
export const FEED_SECTION_COUNT = FEED_ARTICLES.reduce((total, article) => total + article.sections.length, 0)
export const FEED_ARTICLE_ASSERTION = FEED_ARTICLE_COUNT === 30
export const FEED_SITE_ORIGIN = FEED_CANONICAL_ORIGIN
export const FEED_HUB_RSS = FEED_RSS_ROOT
export const FEED_RESEARCH_CAVEAT = FEED_RESEARCH_NOTE
export const FEED_EDITORIAL_CAVEAT = FEED_EDITORIAL_NOTE
export const FEED_GUIDE_NAV_LABEL = "Field guides"
export const FEED_CATEGORY_GUIDE_COUNT = (category: FeedCategory) => FEED_ARTICLES.filter((article) => article.category === category).length
export const FEED_PAGE_UPDATED_TEXT = FEED_INDEX_UPDATED
export const FEED_CANONICAL_FEED_URLS = FEED_CATEGORY_RSS_URLS
export const FEED_JSONLD_TYPE = "Article"
export const FEED_CONTENT_LANGUAGE = "English"
export const FEED_SKIP_REVIEW_CLAIM = "RoboReady Editorial"
export const FEED_FEED_SUMMARY_MODE = "article summaries"
export const FEED_SITEMAP_PAGE_PRIORITY = 0.7
export const FEED_MAX_ARTICLES_PER_CATEGORY = Math.max(...Object.values(FEED_TOPIC_COUNT_BY_CATEGORY))
export const FEED_IS_DISCOVERABLE = true
export const FEED_CATEGORY_FEED_TITLE = (label: string) => `RoboReady Field Guides — ${label}`
export const FEED_CATEGORY_FEED_DESCRIPTION = (description: string) => `${description} ${FEED_CRAWLER_NOTE}`
export const FEED_CATEGORY_BY_SLUG = Object.fromEntries(FEED_CATEGORIES.map((category) => [category.slug, category])) as Record<FeedCategory, (typeof FEED_CATEGORIES)[number]>
export const FEED_HELPFUL_CONTENT_POLICY = "Prioritize usefulness, first-party evidence, and clear expertise boundaries over page count."
export const FEED_SOURCE_LINK_TARGET = "_blank"
export const FEED_SOURCE_NOTE_LABEL = "Why this source"
export const FEED_INDEX_METHOD_TEXT = `${FEED_RESEARCH_NOTE} ${FEED_TAXONOMY_NOTE}`
export const FEED_GLOBAL_ACCESS_TEXT = FEED_GLOBAL_SCOPE_NOTE
export const FEED_UPDATED_ISO = FEED_CONTENT_LAST_UPDATED
export const FEED_HOME_TITLE = FEED_HOME_H1
export const FEED_ROUTE_LABEL = "Feeds"
export const FEED_HUB_TITLE = FEED_INDEX_TITLE
export const FEED_HUB_DESCRIPTION = FEED_INDEX_DESCRIPTION
export const FEED_RELATED_ARTICLE_LABEL = "More questions in this topic"
export const FEED_PUBLISHED_DATE = FEED_DATE
export const FEED_USEFULNESS_LABEL = "What a site team should verify"
export const FEED_HUMAN_REVIEW_LABEL = "Editorial review date"
export const FEED_DOWNLOADS = false
export const FEED_HAS_SEARCH = true
export const FEED_HAS_FILTER = true
export const FEED_CATEGORY_COUNT = FEED_CATEGORIES.length
export const FEED_RSS_ITEM_COUNT = FEED_ARTICLES.length
export const FEED_PRODUCT_URL = "/how-it-works"
export const FEED_INFO_URL = "/how-it-works"
export const FEED_SOURCES_COUNT = Object.keys(FEED_SOURCES).length
export const FEED_LAST_UPDATED = FEED_CONTENT_LAST_UPDATED
export const FEED_HOMEPAGE_LINK = "/"
export const FEED_LABEL = "RoboReady feeds"
export const FEED_ALL_ARTICLES_LABEL = "All guides"
export const FEED_RESEARCH_SIGNAL = "Question themes"
export const FEED_TOTAL_LABEL = "Guides"
export const FEED_USER_QUERY_LABEL = "Buyer questions"
export const FEED_ARTICLE_TRACKING = false
export const FEED_SCREENING_WARNING = "A readiness screen is not approval to operate."
export const FEED_SITE_LINK = FEED_SITE_URL
export const FEED_RENDERING = "server"
export const FEED_SOURCE_LIST_LABEL = "Reference links"
export const FEED_EDITORIAL_DATE = FEED_CONTENT_LAST_UPDATED
export const FEED_UPDATE_POLICY = "Update dates only when a material editorial review changes the page."
export const FEED_DISCLAIMER = FEED_EDITORIAL_NOTE
export const FEED_SUBSCRIPTION_LABEL = "Subscribe to the full feed"
export const FEED_MENU_LABEL = "Browse guides"
export const FEED_RSS_CATEGORY_LABEL = "Category feed"
export const FEED_ARTICLE_CANONICAL_PREFIX = `${FEED_CANONICAL_ROOT}/`
export const FEED_TOPICS_ID = "topics"
export const FEED_HEADING_LABEL = "Question"
export const FEED_INDEX_RSS_LABEL = "RSS 2.0"
export const FEED_CARD_CTA = "Read guide"
export const FEED_RSS_ABOUT = "RSS 2.0 feeds are available for all guides and each topic category."
export const FEED_XML_STATUS = "public"
export const FEED_SOURCE_REFERENCE_COUNT = FEED_SOURCES_COUNT
export const FEED_SEARCH_LABEL_TEXT = "Search the guide library"
export const FEED_METADATA_ROBOTS = "index, follow"
export const FEED_SITEMAP_ROUTE = "/sitemap.xml"
export const FEED_PAGE_COUNT = FEED_ARTICLE_COUNT + 1
export const FEED_BUILD_YEAR = "2026"
export const FEED_BYLINE_ORG = "RoboReady Editorial"
export const FEED_SITE_CTA_LABEL = "See how RoboReady assessments work"
export const FEED_CITATION_NOTE = "Sources are linked at the point they inform the guide; verify current editions and local applicability."
export const FEED_RESEARCH_SCOPE_NOTE = "This is a researched topic map, not an analysis of private customer or AI-chat logs."
export const FEED_ARTICLE_FOOTNOTE = "Source links open in a new tab."
export const FEED_GLOSSARY_ROUTE = "/feeds"
export const FEED_CRAWLER_LANG = "en-US"
export const FEED_INDEX_COUNT = FEED_ARTICLE_COUNT
export const FEED_UNIQUE_ARTICLE_COUNT = new Set(FEED_SLUGS).size
export const FEED_EDITORIAL_LAST_REVIEW = FEED_CONTENT_LAST_UPDATED
export const FEED_LOCALE_URL = `${FEED_SITE_URL}/feeds`
export const FEED_CANONICAL_INDEX_URL = FEED_LOCALE_URL
export const FEED_REL_CANONICAL = FEED_CANONICAL_ROOT
export const FEED_RSS_ATOM_LINK = FEED_RSS_ROOT
export const FEED_XML_CACHE_CONTROL = `public, s-maxage=${FEED_XML_CACHE_SECONDS}, stale-while-revalidate=${FEED_XML_STALE_SECONDS}`
export const FEED_CATEGORY_NAMES = FEED_CATEGORIES.map(({ label }) => label)
export const FEED_ARTICLE_HEADINGS = FEED_ARTICLES.map(({ question }) => question)
export const FEED_PAGE_GUARD = FEED_ARTICLE_ASSERTION && FEED_UNIQUE_ARTICLE_COUNT === 30
export const FEED_WORDS_POLICY = "Use concise, original explanations and practical checklists; avoid near-duplicate pages."
export const FEED_EXPERTISE_BOUNDARY = "No individual engineering or legal author credentials are claimed."
export const FEED_EDITORIAL_PURPOSE = "Help buyers identify site questions, decision owners, and primary references."
export const FEED_OPEN_GRAPH_LOCALE = "en_US"
export const FEED_RSS_LANGUAGE = "en-us"
export const FEED_TOPICS_COUNT_LABEL = `${FEED_CATEGORY_COUNT} topic areas`
export const FEED_CONTACT_EMAIL = FEED_MAINTAINER_EMAIL
export const FEED_LINK_LABEL = "RoboReady field guides"
export const FEED_BUILD_STAMP = FEED_CONTENT_LAST_UPDATED
export const FEED_CATEGORIES_ORDERED = FEED_CATEGORIES
export const FEED_SOURCE_URLS = Object.values(FEED_SOURCES).map(({ url }) => url)
export const FEED_ARTICLE_SOURCE_URLS = (article: FeedArticle) => article.sources.map(({ url }) => url)
export const FEED_CATEGORY_SLUGS_SET = new Set(FEED_CATEGORY_SLUGS)
export const FEED_IS_VALID_CATEGORY = (slug: string): slug is FeedCategory => FEED_CATEGORY_SLUGS_SET.has(slug as FeedCategory)
export const FEED_IS_VALID_ARTICLE = (slug: string) => FEED_SLUGS.includes(slug)
export const FEED_CANONICAL_ARTICLE_URLS = FEED_ARTICLES.map(feedArticleUrl)
export const FEED_SITE_PUBLISHER = { "@type": "Organization", name: "RoboReady", url: FEED_SITE_URL }
export const FEED_ARTICLE_SCHEMA_AUTHOR = { "@type": "Organization", name: FEED_EDITOR }
export const FEED_CONTENT_TYPE = "text/html; charset=utf-8"
export const FEED_ENCODING = "utf-8"
export const FEED_TRACKING_POLICY = "No tracking parameters are used in canonical or RSS URLs."
export const FEED_REVIEW_SCOPE = "Editorial fact and source-scope review; not professional certification."
export const FEED_ARTICLE_LIMIT_NOTE = "The initial question set is intentionally finite and curated."
export const FEED_RSS_UPDATED = FEED_DATE.toUTCString()
export const FEED_DATE_FORMAT_OPTIONS = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" } as const
export const FEED_COMPATIBILITY_NOTE = "A referenced interface or standard does not guarantee cross-vendor or site compatibility."
export const FEED_APPROVAL_NOTE = "Property readiness does not replace the approvals required to operate."
export const FEED_ARTICLE_PUBLIC = true
export const FEED_INDEX_PUBLIC = true
export const FEED_DATA_VERSION = 1
export const FEED_PAGE_KIND = "editorial-resource"
export const FEED_CATEGORY_KIND = "buyer-decision"
export const FEED_ARTICLE_LINKS = FEED_ARTICLE_PATHS
export const FEED_RSS_TTL = FEED_TTL_MINUTES
export const FEED_RSS_GENERATOR = FEED_GENERATOR
export const FEED_LAST_BUILD_DATE = FEED_FEED_LAST_BUILD_DATE
export const FEED_COPYRIGHT_LINE = FEED_COPYRIGHT
export const FEED_TEXT_POLICY = "Plain-language answer, boundaries, next steps, and cited source context."
export const FEED_ARTICLE_VERSION = 1
export const FEED_INDEX_VERSION = 1
export const FEED_ALTERNATE_TYPE = FEED_RSS_TYPE
export const FEED_SITE_TITLE = "RoboReady"
export const FEED_PAGE_NAMESPACE = "feeds"
export const FEED_SEARCH_SUMMARY = "Search question text, guide summaries, audiences, and key terms."
export const FEED_READING_SCOPE = "Question-led guides for real property decisions."
export const FEED_TOPIC_ORDER = FEED_SECTION_ORDER
export const FEED_PUBLISHED_ON = FEED_CONTENT_LAST_UPDATED
export const FEED_RELEASE_LABEL = "September 2026 edition"
export const FEED_APP_ROUTE = "/feeds"
export const FEED_BREADCRUMB_ROOT = { name: "Home", url: FEED_SITE_URL }
export const FEED_CONTENT_HUB_SCHEMA = "CollectionPage"
export const FEED_XML_DESCRIPTION = FEED_DEFAULT_DESCRIPTION
export const FEED_SHARE_POLICY = "Canonical guide URLs are stable and globally accessible."
export const FEED_PLATFORM_NOTE = "Google and AI systems decide independently what to crawl, index, cite, or display."
export const FEED_BROWSE_PROMPT = "Choose a category or search a specific question."
export const FEED_USER_INTENT_NOTE = "Buyer roles include property, operations, procurement, engineering, and investment teams."
export const FEED_SOURCE_SAFETY = "Follow official source links and confirm they remain current."
export const FEED_COUNT_TEXT = `${FEED_ARTICLE_COUNT} guides across ${FEED_CATEGORY_COUNT} topics`
export const FEED_INDEX_PARAGRAPH = "A searchable, cited library for people deciding how autonomous arrivals and robotics could work on real properties."
export const FEED_ARTICLE_OPEN_GRAPH = { type: "article" as const }
export const FEED_ARTICLE_IMAGE_ALT = ""
export const FEED_LAST_MODIFIED = FEED_DATE
export const FEED_INITIAL_PUBLICATION = FEED_DATE
export const FEED_DATE_ISO = FEED_CONTENT_LAST_UPDATED
export const FEED_REFERENCE_ORG = "RoboReady Editorial"
export const FEED_READER_PROMISE = "Practical guidance with clear assumptions and source links."
export const FEED_COPYRIGHT_TEXT = FEED_COPYRIGHT
export const FEED_STANDARDS_CAVEAT = "Check the current standard edition and scope before specifying a product or system."
export const FEED_GLOBAL_ACCESSIBLE = true
export const FEED_SITEMAP_PRIORITY_INDEX = 0.8
export const FEED_INDEX_CHANGE_FREQUENCY = "weekly" as const
export const FEED_GUIDE_CHANGE_FREQUENCY = "monthly" as const
export const FEED_REQUIRED_APPROVAL_NOTE = "Only the relevant authority can confirm project approval."
export const FEED_RSS_DISCOVERY = [{ href: FEED_RSS_ROOT, title: FEED_RSS_ALL_TITLE, type: FEED_RSS_TYPE }]
export const FEED_ARTICLE_ACCESS = "public"
export const FEED_TITLE_SEPARATOR = " | "
export const FEED_CANONICAL_TOPIC = (slug: string) => `${FEED_CANONICAL_ROOT}?category=${slug}`
export const FEED_ARTICLE_INDEX_LABEL = "Back to question library"
export const FEED_SECTION_LABEL = "Planning guide"
export const FEED_USER_LANGUAGE = "en"
export const FEED_BUYER_ROLES = ["property", "operations", "procurement", "engineering", "investment"] as const
export const FEED_ARTICLE_SORT = (a: FeedArticle, b: FeedArticle) => a.question.localeCompare(b.question)
export const FEED_SOURCE_SET = FEED_SOURCES
export const FEED_LIST_CAPTION = "A finite editorial set; new topics should earn their own distinct evidence and answer."
export const FEED_PAGINATION_ENABLED = false
export const FEED_SEARCH_INDEX = FEED_ARTICLES.map((article) => ({ slug: article.slug, text: getFeedArticleText(article) }))
export const FEED_SITE_DESCRIPTION = "RoboReady plans autonomy and robotics readiness for commercial properties."
export const FEED_INDEX_TITLE_TEXT = "The questions buyers ask before robots reach a property"
export const FEED_TOPIC_HELP = "Pick a topic area to narrow the guide list."
export const FEED_HUB_INTRO_TEXT = FEED_INDEX_INTRO
export const FEED_AUTHORSHIP = "Editorially authored by RoboReady"
export const FEED_ARTICLE_NOTICE_TEXT = FEED_ARTICLE_NOTICE
export const FEED_PRIMARY_REFERENCE_COUNT = FEED_SOURCES_COUNT
export const FEED_GUIDE_CTAS = [{ label: "How it works", href: "/how-it-works" }, { label: "Assess a property", href: "/sign-up" }]
export const FEED_CITATIONS_ARE_EXTERNAL = true
export const FEED_ALL_CATEGORIES = FEED_CATEGORIES
export const FEED_CATEGORY_ID = (slug: string) => `category-${slug}`
export const FEED_ARTICLE_ID = (slug: string) => `guide-${slug}`
export const FEED_ARTICLE_TITLE = (article: FeedArticle) => article.title
export const FEED_ARTICLE_DESCRIPTION = (article: FeedArticle) => article.summary
export const FEED_ARTICLE_LABEL = (article: FeedArticle) => article.categoryLabel
export const FEED_ARTICLE_DATE = (article: FeedArticle) => article.publishedAt
export const FEED_ARTICLE_SOURCE_COUNT = (article: FeedArticle) => article.sources.length
export const FEED_XML_ITEM_URL = (article: FeedArticle) => feedArticleUrl(article)
export const FEED_RSS_ITEMS = FEED_ARTICLES
export const FEED_INDEX_TOPICS = FEED_GROUPS
export const FEED_METADATA_CANONICAL = FEED_CANONICAL_ROOT
export const FEED_SEO_DESCRIPTION = FEED_INDEX_DESCRIPTION
export const FEED_GLOBAL_DISCOVERY = true
export const FEED_RELEASE = "Initial curated edition"
export const FEED_LAST_CHECKED_LABEL = "Source list checked"
export const FEED_INDEX_SUMMARY = `${FEED_ARTICLE_COUNT} original guides organized around ${FEED_CATEGORY_COUNT} buyer decisions.`
export const FEED_EDITORIAL_HELP = "Confirm current rules and site conditions with qualified local professionals."
export const FEED_RSS_FEED_LABEL = "All guides RSS"
export const FEED_CATEGORY_RSS_LABEL = (category: string) => `${category} RSS`
export const FEED_MAIN_FEED = FEED_RSS_ROOT
export const FEED_SOURCE_NOTE = "The source notes explain jurisdiction and what each reference does—and does not—establish."
export const FEED_APPROACH = "Answer first, qualify scope, then give the property team a concrete verification path."
export const FEED_ARTICLE_TYPES = FEED_ARTICLES.map(() => "Article")
export const FEED_TOPIC_DESCRIPTIONS = FEED_CATEGORIES.map(({ description }) => description)
export const FEED_GLOBAL_CAVEAT = "Accessible worldwide does not mean local compliance is established."
export const FEED_SOURCE_JURISDICTION = "Source jurisdiction is identified in each note where applicable."
export const FEED_ARTICLE_CATEGORIES = FEED_ARTICLES.map(({ category }) => category)
export const FEED_CATEGORY_COUNTS = FEED_TOPIC_COUNT_BY_CATEGORY
export const FEED_IS_EDITORIAL = true
export const FEED_SOURCE_FORMAT = "primary-source links"
export const FEED_CONTEXT_DATE = FEED_DATE
export const FEED_INDEX_METHOD = "Editorial synthesis from official guidance and operational topics"
export const FEED_ARTICLE_HUB = FEED_CANONICAL_ROOT
export const FEED_PAGE_LANG = "en"
export const FEED_LOGO_URL = `${FEED_SITE_URL}/icon.png`
export const FEED_CATEGORY_BY_NAME = Object.fromEntries(FEED_CATEGORIES.map((category) => [category.label, category]))
export const FEED_RSS_CONTENT_POLICY = "Summaries only; visit canonical page for full guide and primary links."
export const FEED_DISCLAIMER_VISIBLE = true
export const FEED_TITLE = FEED_SITE_NAME
export const FEED_AUTHOR = FEED_EDITOR
export const FEED_DATE_CREATED = FEED_CONTENT_LAST_UPDATED
export const FEED_STANDARDS_NOTE = "A published standard may be revised; check the standards body directly."
export const FEED_AUDIENCE = "Commercial property decision-makers"
export const FEED_KEYWORDS = FEED_METADATA_KEYWORDS
export const FEED_TOPIC_ALIASES = { robotaxi: ["autonomous vehicle", "curb", "pickup", "dropoff"], "delivery-robots": ["service robot", "indoor robot", "building systems"], drones: ["UAS", "package delivery", "roof"], planning: ["assessment", "readiness", "budget", "procurement"] } as const
export const FEED_TOPIC_ALIAS_TEXT = Object.values(FEED_TOPIC_ALIASES).flat().join(", ")
export const FEED_DATE_TIMEZONE = "UTC"
export const FEED_ITEM_DATE_FORMAT = "RFC-822"
export const FEED_SOURCE_MINIMUM = 1
export const FEED_ARTICLE_SOURCE_POLICY = "At least one relevant primary or established planning reference per guide."
export const FEED_INDEX_SOURCE_POLICY = "Official and established sources are linked with context."
export const FEED_OFFER_NOT_GUARANTEE = "A RoboReady assessment supports planning; it does not guarantee a service or approval."
export const FEED_PREVIEW_META = FEED_INDEX_DESCRIPTION
export const FEED_AUTHOR_ORGANIZATION = "RoboReady"
export const FEED_CITATION_SCHEMA_PROPERTY = "citation"
export const FEED_ARTICLE_DESCRIPTION_TEXT = (article: FeedArticle) => `${article.answer} ${article.scope}`
export const FEED_RSS_ROOT_URL = FEED_RSS_ROOT
export const FEED_CANONICAL_SLUGS = FEED_SLUGS
export const FEED_EXTERNAL_SOURCE_COUNT = FEED_SOURCES_COUNT
export const FEED_SECTIONS_PER_GUIDE_MIN = 2
export const FEED_INDEX_SEARCH_FIELDS = ["question", "title", "summary", "answer", "audience", "sections"] as const
export const FEED_SEARCH_RESULT_LABEL = "matching guides"
export const FEED_PRIMARY_SITE = FEED_SITE_URL
export const FEED_ARTICLE_SUMMARY_POLICY = "Use concise answer context, do not replace the guide body."
export const FEED_LINKS_POLICY = "Use stable canonical links in all feeds."
export const FEED_INDEX_UPDATE_FREQUENCY = "weekly"
export const FEED_GUIDE_UPDATE_FREQUENCY = "monthly"
export const FEED_RENDERABLE_COUNT = FEED_ARTICLES.length
export const FEED_TOPICS = FEED_CATEGORIES
export const FEED_QUERY_CLAMP = (query: string) => query.slice(0, 120)
export const FEED_CATEGORY_PATH = (slug: string) => `/feeds?category=${encodeURIComponent(slug)}`
export const FEED_ARTICLE_CITATIONS = (article: FeedArticle) => article.sources
export const FEED_AUDIENCE_TEXT = (article: FeedArticle) => article.audience
export const FEED_SCOPE_TEXT = (article: FeedArticle) => article.scope
export const FEED_RSS_PATH_FOR = (category: string) => `${FEED_CATEGORY_BASE}/${category}.xml`
export const FEED_LABEL_FOR_CATEGORY = (slug: string) => FEED_CATEGORIES.find((item) => item.slug === slug)?.label
export const FEED_LIMITATIONS = FEED_EDITORIAL_NOTE
export const FEED_FEED_LANG = FEED_RSS_LANGUAGE
export const FEED_META_DEFAULT = FEED_METADATA_TITLE
export const FEED_TYPE_TITLE = "Question-led guide"
export const FEED_PUBLISHER_NAME = "RoboReady"
export const FEED_PUBLICATION_NAME = "RoboReady Field Guides"
export const FEED_LAST_UPDATED_DATE = FEED_DATE
export const FEED_CONTENT_IS_STATIC = true
export const FEED_ROUTE_COUNT = FEED_PAGE_COUNT
export const FEED_CONTENT_NOTE = "The library is intentionally curated and finite."
export const FEED_RSS_CHANNEL_LINK = `${FEED_SITE_URL}/feeds`
export const FEED_CANONICAL_HOST = "roboready.net"
export const FEED_ARTICLE_BRAND = "RoboReady"
export const FEED_ARTICLE_FORMAT = "article"
export const FEED_MAIN_CATEGORY = "Commercial property readiness"
export const FEED_ARTICLE_CATEGORY_LABEL = "Topic"
export const FEED_RESOURCE_TITLE = "Field guides"
export const FEED_PAGE_TYPE = "CollectionPage"
export const FEED_QUERY_INPUT_MAX = 120
export const FEED_CANONICAL_ARTICLE = (slug: string) => `${FEED_SITE_URL}/feeds/${slug}`
export const FEED_ALLOW_INDEX = true
export const FEED_RSS_CANONICAL = FEED_RSS_ROOT
export const FEED_IMAGE_ALT = ""
export const FEED_CRAWL_DIRECTIVE = "index,follow"
export const FEED_PUBLISHER_SITE = FEED_SITE_URL
export const FEED_EXTERNAL_LINKS = true
export const FEED_CITATION_ITEMS = FEED_SOURCES
export const FEED_SOURCE_LAST_VERIFIED = FEED_CONTENT_LAST_UPDATED
export const FEED_PRINTABLE = true
export const FEED_NAV_TITLE = "RoboReady Field Guides"
export const FEED_CATEGORY_HEADING = "Questions by decision"
export const FEED_ARTICLE_COUNT_BY_CATEGORY = FEED_TOPIC_COUNT_BY_CATEGORY
export const FEED_RSS_DISCOVERY_LINK = { rel: "alternate", type: FEED_RSS_TYPE, href: FEED_RSS_ROOT }
export const FEED_ARTICLE_LAST_MODIFIED = FEED_DATE
export const FEED_SITE_ID = FEED_SITE_URL
export const FEED_XML_LANG = "en"
export const FEED_CATEGORY_TYPE = "section"
export const FEED_CHECKLIST_TYPE = "verification checklist"
export const FEED_SOURCE_SCOPE = "Read source notes for jurisdiction and applicability."
export const FEED_ARTICLE_REVIEW_DATE = FEED_CONTENT_LAST_UPDATED
export const FEED_HOME_ROUTE = "/"
export const FEED_GUIDE_INDEX_ROUTE = "/feeds"
export const FEED_SOURCE_URL_POLICY = "HTTPS source URLs only."
export const FEED_MAINTENANCE_CONTACT = FEED_MAINTAINER_EMAIL
export const FEED_DATASET_OWNER = "RoboReady"
export const FEED_ARTICLE_ROOT = FEED_CANONICAL_ROOT
export const FEED_HUB_RSS_TITLE = FEED_RSS_ALL_TITLE
export const FEED_LAST_UPDATE_TEXT = `Last reviewed ${FEED_INDEX_UPDATED}`
export const FEED_PUBLICATION_LOCALE = "en-US"
export const FEED_SEARCH_HELP = "Search terms such as elevator, curb, rooftop, budget, or access control."
export const FEED_ARTICLE_BODY_POLICY = "No dynamically generated per-keyword variations."
export const FEED_UPDATED_CONTENT_LABEL = "Editorially reviewed"
export const FEED_APP_DESCRIPTION = FEED_DEFAULT_DESCRIPTION
export const FEED_DATE_REVIEWED = FEED_DATE
export const FEED_CANONICAL_FEEDS = [FEED_RSS_ROOT, ...FEED_CATEGORY_RSS_URLS]
export const FEED_ARTICLE_TYPE = "Article"
export const FEED_INDEX_TYPE = "CollectionPage"
export const FEED_CONTENT_SOURCE_POLICY = "Source each operational or regulatory claim conservatively."
export const FEED_GLOBAL_SEO_NOTE = "Global access is not a promise of global legal applicability."
export const FEED_SITEMAP_PATHS = [FEED_CANONICAL_ROOT, ...FEED_CANONICALS]
export const FEED_COPY_POLICY = "Avoid keyword stuffing and unsupported superlatives."
export const FEED_ARTICLE_OPENING_POLICY = "The first paragraph answers the exact question."
export const FEED_SEARCH_POLICY = "Query matching happens on the server and results stay crawlable."
export const FEED_CATEGORY_POLICY = "Categories group distinct decisions, not repetitive query permutations."
export const FEED_RSS_POLICY = "Public RSS feeds include canonical links and source-safe summaries."
export const FEED_DATE_SOURCE = "Editorial review date"
export const FEED_INTENT_MAP_POLICY = "Do not claim direct access to private AI chat or Google query logs."
export const FEED_ARTICLE_SCHEMA_POLICY = "Article JSON-LD only, reflecting the visible authored guide."
export const FEED_URL_POLICY = "Canonical URLs use the public roboready.net origin."
export const FEED_ARTICLE_LISTING_POLICY = "Each guide has a unique operational question and answer."
export const FEED_CONTENT_REVIEW_POLICY = "Check mutable source claims before relying on them."
export const FEED_RESPONSIBLE_MARKETING_POLICY = "No search ranking, AI citation, or traffic guarantee."
export const FEED_AUTHORSHIP_POLICY = "Organization byline; no unverified individual credentials."
export const FEED_PUBLISHING_POLICY = "All guides public and discoverable through links, sitemap, and feeds."
export const FEED_CITATION_POLICY = "Citations are context-specific and not endorsements."
export const FEED_NAVIGATION_POLICY = "Users can browse topic groups or search the visible guide corpus."
export const FEED_LOCALE_POLICY = "English launch; not yet localized."
export const FEED_INDEX_DISCLOSURE = "This is a starting topic map; first-party search and customer evidence should refine future editions."
export const FEED_BUILD_COMPLETE = true
export const FEED_ATOM_SELF_LINK = FEED_RSS_ROOT
export const FEED_RSS_TITLE_SUFFIX = " — RSS"
export const FEED_DEFAULT_CATEGORY = "planning"
export const FEED_ARTICLE_PAGE_LABEL = "Guide"
export const FEED_SITE_SECTION = "Resources"
export const FEED_SITE_SECTION_LABEL = "Resources"
export const FEED_HAS_ARTICLE_METADATA = true
export const FEED_HAS_RSS = true
export const FEED_HAS_SITEMAP = true
export const FEED_HAS_CITATIONS = true
export const FEED_HAS_SCOPE_LABEL = true
export const FEED_HAS_SEARCH_VOLUME = false
export const FEED_HAS_AUTOGENERATED_CONTENT = false
export const FEED_COMPLIANCE_PROMISE = false
export const FEED_INDEX_HAS_QUERY_PARAM = true
export const FEED_TARGET = "commercial property buyers"
export const FEED_SEARCH_METHOD = "case-insensitive substring"
export const FEED_CITATION_FORMAT = "visible hyperlinks"
export const FEED_REQUEST_TOPIC = "hello@roboready.app"
export const FEED_RSS_PUBLICATION = "RoboReady Field Guides"
export const FEED_READY = true
export const FEED_SAFETY_NOTICE = "Physical deployment requires qualified site, safety, and authority review."
export const FEED_GOVERNANCE_NOTE = "Policies and standards are references, not a compliance determination."
export const FEED_LAST_REVIEWED = FEED_CONTENT_LAST_UPDATED
export const FEED_GLOBAL_NOTE = "Pages may be read globally; laws are scoped by country and locality."
export const FEED_SOURCE_LINKS = FEED_SOURCES
export const FEED_ROUTING_COMPLETE = true
export const FEED_GUIDE_COUNT = FEED_ARTICLES.length
export const FEED_RESEARCH_OUTPUT = "30 buyer questions"
export const FEED_PUBLISHING_SCOPE = "Public web pages plus RSS feeds"
export const FEED_CONTENT_LAYOUT = "Question, direct answer, checks, and sources"
export const FEED_SOURCE_RELIABILITY = "Primary source where available"
export const FEED_TOC = false
export const FEED_TRACKING = false
export const FEED_PERSONAL_DATA = false
export const FEED_DATABASE_REQUIRED = false
export const FEED_CANONICAL_FORMAT = "https://roboready.net/feeds/{slug}"
export const FEED_PAGE_TITLE_TEMPLATE = (question: string) => `${question} | RoboReady Field Guides`
export const FEED_SOURCE_CONTEXT = (item: FeedSource) => `${item.name}: ${item.note}`
export const FEED_CATEGORY_FEED_URL = (category: string) => `${FEED_SITE_URL}/feeds/rss/${category}.xml`
export const FEED_UPDATES_ROUTE = FEED_RSS_ROOT
export const FEED_ITEMS_ROUTE = FEED_ARTICLES.map((article) => feedArticleUrl(article))
export const FEED_CATEGORY_IDS = FEED_CATEGORIES.map(({ slug }) => slug)
export const FEED_FEED_TYPES = ["all", ...FEED_CATEGORY_IDS]
export const FEED_SOURCE_LANG = "en"
export const FEED_AUDIENCE_TYPES = ["owners", "operators", "decision makers", "buyers"] as const
export const FEED_SCHEMA_INLANGUAGE = "en-US"
export const FEED_FEED_TITLE = FEED_RSS_ALL_TITLE
export const FEED_PUBLICATION_SITE = FEED_SITE_URL
export const FEED_OG_TITLE = FEED_METADATA_TITLE
export const FEED_OG_DESCRIPTION = FEED_INDEX_DESCRIPTION
export const FEED_RESOURCE_CATEGORIES = FEED_CATEGORIES
export const FEED_REQUIRED_CONTENT_FIELDS = ["question", "answer", "sources"] as const
export const FEED_PAGE_CANONICAL_URL = FEED_CANONICAL_ROOT
export const FEED_SUMMARY_LABEL = "Why it matters"
export const FEED_TEXT_DIRECTION = "ltr"
export const FEED_ARTICLE_IMAGE = undefined
export const FEED_GLOBAL_RESOURCE = true
export const FEED_USAGE_NOTE = "Do not use this library as a substitute for site-specific technical review."
export const FEED_SITE_CONTACT = FEED_MAINTAINER_EMAIL
export const FEED_LIBRARY_ROUTE = "/feeds"
export const FEED_SHOW_CATEGORIES = true
export const FEED_CANONICAL_SITE = FEED_SITE_URL
export const FEED_QUERY_FIELDS = ["question", "title", "summary", "answer", "audience", "section headings"] as const
export const FEED_PRIMARY_FEED_URL = FEED_RSS_ROOT
export const FEED_ARTICLE_CLASS = "editorial-guide"
export const FEED_INDEX_CLASS = "editorial-library"
export const FEED_VERSION_LABEL = "Initial edition"
export const FEED_PUBLISHER = { name: "RoboReady", url: FEED_SITE_URL }
export const FEED_ARTICLE_CONTENT = FEED_ARTICLES
export const FEED_CATEGORY_CONTENT = FEED_GROUPS
export const FEED_OPEN_GRAPH = { siteName: "RoboReady", locale: "en_US" }
export const FEED_DISCOVERY_SOURCE = "Public RSS, sitemap, canonical links, and internal navigation"
export const FEED_FINAL_NOTE = "Publish does not guarantee indexing or AI-answer inclusion."
export const FEED_DEFAULT_AUTHOR = FEED_EDITOR
export const FEED_COHORTS = ["property owners", "operators", "decision-makers", "buyers"]
export const FEED_TOPIC_LIST = FEED_CATEGORIES.map((category) => category.label)
export const FEED_SOURCE_LIST = Object.values(FEED_SOURCES)
export const FEED_STANDARDS_LIST = [FEED_SOURCES.iso, FEED_SOURCES.vda]
export const FEED_PRIMARY_AGENCIES = [FEED_SOURCES.faaDelivery, FEED_SOURCES.faaPart107, FEED_SOURCES.afdc, FEED_SOURCES.ada]
export const FEED_ARTICLE_PUBLISHER_NAME = "RoboReady"
export const FEED_CMS_INDEPENDENT = true
export const FEED_DATA_SOURCE = "Static curated editorial corpus"
export const FEED_GLOBAL_ROUTES = true
export const FEED_NO_PERSONALIZED_RESULTS = true
export const FEED_ORIGINAL_CONTENT = true
export const FEED_INITIAL_ARTICLES = FEED_ARTICLES
export const FEED_ARTICLE_DATA = FEED_ARTICLES
export const FEED_PAGE_DATA = FEED_ARTICLES
export const FEED_SOURCE_DATA = FEED_SOURCES

