export const SITE_URL = "https://roboready.net"
export const GUIDES_REVIEWED_AT = "2026-09-30"

export type FeedCategoryId = "property-readiness" | "robotaxi-arrivals" | "indoor-delivery-robots" | "drone-delivery"

export type FeedSource = { label: string; url: string; scope?: string }
export type GuideSection = { heading: string; paragraphs: string[]; bullets?: string[] }
export type FeedGuide = {
  slug: string
  title: string
  description: string
  category: FeedCategoryId
  answer: string
  sections: GuideSection[]
  checklist: string[]
  sources: FeedSource[]
  publishedAt: string
  reviewedAt: string
}

export const FEED_CATEGORIES: { id: FeedCategoryId; title: string; summary: string; stage: string }[] = [
  {
    id: "property-readiness",
    title: "Property readiness",
    summary: "Assessment scope, site information, upgrade priorities, and procurement decisions across autonomous arrival use cases.",
    stage: "Assess and plan",
  },
  {
    id: "robotaxi-arrivals",
    title: "Robotaxi arrivals",
    summary: "Passenger pickup, curb operations, accessibility, charging assumptions, and demand management for commercial sites.",
    stage: "Design the arrival",
  },
  {
    id: "indoor-delivery-robots",
    title: "Indoor delivery robots",
    summary: "Building access, lifts, route conditions, connectivity, and shared operating rules for mobile robots indoors.",
    stage: "Prepare the building",
  },
  {
    id: "drone-delivery",
    title: "Drone delivery",
    summary: "Ground-side hub suitability, rooftop assumptions, approvals, community impact, and operator procurement.",
    stage: "Evaluate the hub",
  },
]

const curb = { label: "NACTO, Curb Appeal: curbside management strategies", url: "https://nacto.org/publication/curb-appeal/", scope: "General curb-management principles; not an AV design standard." }
const access = { label: "U.S. Access Board, ADA Accessibility Standards", url: "https://www.access-board.gov/ada/", scope: "United States reference; verify local accessibility rules elsewhere." }
const ev = { label: "U.S. DOE Alternative Fuels Data Center, EV charging infrastructure", url: "https://afdc.energy.gov/fuels/electricity_infrastructure.html", scope: "U.S. charging overview; equipment and code requirements vary by jurisdiction." }
const interface = { label: "VDA 5050, mobile robot communication interface", url: "https://www.vda.de/en/topics/automotive-industry/vda-5050", scope: "An interface specification, not a building or functional-safety approval." }
const faa = { label: "FAA, Package Delivery by Drone (Part 135)", url: "https://www.faa.gov/uas/advanced_operations/package_delivery_drone", scope: "United States aviation and site-selection context only." }

const today = GUIDES_REVIEWED_AT

export const FEED_GUIDES: FeedGuide[] = [
  {
    slug: "assess-autonomous-arrival-property-readiness",
    title: "How do you assess a commercial property for autonomous arrivals?",
    description: "A practical way to assess a site across the curb, building access, operations, power, and local approvals—before choosing hardware.",
    category: "property-readiness",
    answer: "Start with the trip, not the robot: map how a passenger, package, or vehicle reaches the property, transfers at the site boundary, and continues to its destination. Then document physical constraints, operating rules, utilities, accessibility, and approvals for each intended use case. A readiness assessment is a decision aid, not a substitute for design professionals or authority approvals.",
    sections: [
      { heading: "Map the complete arrival journey", paragraphs: ["Choose the use cases first: passenger pickup, indoor delivery, curbside loading, drone handoff, or fleet charging. Trace each from public access to the point of service and identify where people, vehicles, and robots meet. A technically capable vehicle can still fail operationally if the transfer point is unsafe, inaccessible, or unavailable at peak demand."], bullets: ["Mark entrances, accessible routes, curb faces, loading areas, lifts, doors, and service rooms.", "Record operating hours, peak arrival periods, tenant rules, and who controls each interface.", "Separate existing conditions from proposed changes and unverified assumptions."] },
      { heading: "Score evidence, constraints, and next decisions", paragraphs: ["Use a consistent rubric across the site: physical fit, safe circulation, access and interoperability, power and connectivity, operations, and approvals. For every finding, record its evidence, confidence, owner, and next action. Keep unknowns visible rather than treating missing data as a pass."], bullets: ["Photographs, dimensioned plans, and field measurements support stronger findings than narrative alone.", "Rank work by safety, operational dependency, cost-to-investigate, and ability to unlock multiple use cases.", "Confirm code, accessibility, fire/life-safety, and vehicle requirements with qualified local professionals."] },
    ],
    checklist: ["Define a bounded use case and operating window", "Walk the route with facilities and operations staff", "Record constraints and evidence separately", "Assign each approval and upgrade to an accountable owner"],
    sources: [curb, access, ev],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "site-information-for-readiness-assessment",
    title: "What information should you gather before a site-readiness assessment?",
    description: "A property-data checklist for useful field reviews: plans, route dimensions, access rules, traffic patterns, utility records, and known constraints.",
    category: "property-readiness",
    answer: "Gather current plans and operating records before the walkthrough, but treat drawings as hypotheses until important dimensions and routes are verified in the field. The most useful assessment packet connects each intended arrival use case to the spaces, systems, decision-makers, and approvals it depends on.",
    sections: [
      { heading: "Prepare the property packet", paragraphs: ["Start with site and floor plans, entrance and loading maps, parking and curb rules, hours of operation, and a list of tenant or security restrictions. Add equipment schedules and available records for electrical service, charging, elevators, doors, network coverage, and fire/life-safety systems where relevant."], bullets: ["Include plan dates and note renovations or operating changes since they were created.", "Identify building ownership, facilities, security, parking, IT, accessibility, and tenant contacts.", "Bring incident records or observations that show recurring congestion, blocked routes, or failed access handoffs."] },
      { heading: "Use the walkthrough to close evidence gaps", paragraphs: ["A walkthrough should verify route continuity and transitions—not merely photograph the lobby. Measure pinch points, door clearances, waiting areas, vehicle dwell locations, and transfer surfaces against the selected vehicle and operating scenario. Mark inaccessible or restricted spaces as explicit constraints."], bullets: ["Record where measurements came from and which need a licensed survey or engineering check.", "Capture existing accessibility features without assuming they can be repurposed for robot staging.", "Request utility and network confirmation rather than estimating available capacity from visible equipment."] },
    ],
    checklist: ["Current site and floor plans", "Use-case and operating-hour assumptions", "Access-control, lift, IT, and utility contacts", "Field-verified constraints and unresolved questions"],
    sources: [access, ev, interface],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "what-property-readiness-score-measures",
    title: "What should a property-readiness score actually measure?",
    description: "A score is useful when it reveals evidence, blockers, and next actions—not when it turns uncertain building conditions into false precision.",
    category: "property-readiness",
    answer: "A defensible readiness score should summarize documented conditions against a clearly stated use case, while showing evidence quality, critical blockers, and uncertainty separately. It should not imply that a site is legally approved, safe for every vehicle, or ready for deployment just because a single number is high.",
    sections: [
      { heading: "Separate capability from evidence", paragraphs: ["A useful rubric can organize findings into site access, circulation, transfer points, building interfaces, power and connectivity, operations, and approvals. Define what each level means and require evidence for each rating. A missing elevator interface, for example, is not the same finding as an interface that has been tested and accepted."], bullets: ["Keep critical safety and accessibility constraints visible even if an average score looks strong.", "Show the evidence source, confidence, and validation owner for each finding.", "Version the rubric so property comparisons remain interpretable over time."] },
      { heading: "Use the number to prioritize the next decision", paragraphs: ["The score should guide a conversation: what can be used now, what needs verification, what requires an upgrade, and what is outside the selected scope? Pair it with a concise action plan and a list of dependencies. Avoid implying cross-property comparability unless the same use case and assessment method were used."], bullets: ["Report use case, date, geography, assumptions, and exclusions alongside the score.", "Do not treat a score as code certification, engineering sign-off, or an operator commitment.", "Reassess after material construction, policy, or operating changes—not merely to refresh a date."] },
    ],
    checklist: ["Publish the rubric and its scope", "Distinguish verified facts from estimates", "Report critical blockers apart from averages", "Attach actions and owners to each finding"],
    sources: [access, curb],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "prioritize-autonomous-arrival-upgrades",
    title: "How should owners prioritize autonomous-arrival upgrades?",
    description: "Sequence property work by safety, dependencies, evidence, and shared value instead of buying equipment before the site is understood.",
    category: "property-readiness",
    answer: "Prioritize by resolving safety and compliance constraints first, then unblock the most valuable use case with the smallest verified set of changes. Separate low-cost information work from capital upgrades, and do not commit to equipment until the operator, interface, utility, and building responsibilities are clear.",
    sections: [
      { heading: "Build a dependency-aware action list", paragraphs: ["Translate findings into actions with an owner, dependency, rough effort band, evidence, and decision date. An accessible route or fire/life-safety constraint may gate a deployment; a missing drawing may only gate a confident estimate. Keep those classes distinct so teams do not mistake paperwork for construction."], bullets: ["Resolve legal, safety, and accessibility questions with qualified local professionals.", "Confirm operator requirements for vehicle envelope, fleet software, charging, and interfaces.", "Coordinate utility, IT, landlord, tenant, and public-realm work before setting a delivery sequence."] },
      { heading: "Prefer reversible learning before irreversible spend", paragraphs: ["A measured site walk, traffic observation, or operator workshop can remove uncertainty before procurement. Where feasible, test the operating concept with a bounded pilot and clear success criteria. Avoid installing a fixed lane, charger, or access device before demand, ownership, and interoperability are understood."], bullets: ["Identify upgrades that support several use cases without reducing accessible circulation.", "Compare lifecycle and maintenance responsibilities, not just initial purchase cost.", "Set a review trigger for changes in vehicle, tenant, traffic, or local requirements."] },
    ],
    checklist: ["Address critical constraints before convenience improvements", "Map dependencies and decision owners", "Validate demand and equipment assumptions", "Define pilot exit criteria before funding construction"],
    sources: [curb, access, ev],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "compare-autonomous-readiness-across-portfolio",
    title: "How can a real-estate team compare readiness across properties?",
    description: "A fair portfolio comparison needs shared definitions, consistent evidence rules, and use-case-specific scores—not one universal ranking.",
    category: "property-readiness",
    answer: "Compare properties using the same assessment protocol, time window, and defined operating scenario, while keeping local code, street context, and building type visible. A portfolio view should rank opportunities and uncertainty—not suggest every site is interchangeable or approved for deployment.",
    sections: [
      { heading: "Standardize the questions, not the site conditions", paragraphs: ["Use a common data dictionary for entrances, curb access, route widths, vertical transport, utility capacity, network coverage, operating hours, and approval status. Require assessors to label values as field-verified, document-derived, operator-provided, or unknown. Preserve local context rather than normalizing it away."], bullets: ["Use one rubric version and state the applicable use case for every property.", "Separate the building-controlled area from public right-of-way and third-party infrastructure.", "Keep comparable evidence and scoring dates with each record."] },
      { heading: "Rank by fit and next action", paragraphs: ["Create separate views for physical readiness, operational feasibility, and approval status. A site with an unresolved public curb issue may be promising but not deployment-ready. Portfolio reporting is strongest when it shows which low-effort validation step could change the decision."], bullets: ["Segment by property type and region before comparing totals.", "Display blockers and evidence gaps alongside any roll-up score.", "Refresh only fields that changed or were newly verified."] },
    ],
    checklist: ["Define common field names and evidence standards", "Keep local context and property type visible", "Separate site fit from approval status", "Use comparisons to allocate diligence, not declare deployment"],
    sources: [curb, access],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "autonomous-mobility-property-rfp-checklist",
    title: "What belongs in an autonomous-mobility RFP for a property?",
    description: "A procurement outline for specifying use cases, safety boundaries, building interfaces, data, responsibilities, and acceptance tests.",
    category: "property-readiness",
    answer: "An RFP should describe the site and the service outcome, then require vendors to state their vehicle and interface assumptions, safety case, data needs, responsibilities, and test plan. Ask for evidence tied to the proposed deployment rather than broad claims that a product is 'robot-ready.'",
    sections: [
      { heading: "Specify the service and physical envelope", paragraphs: ["Describe destinations, transfer points, service hours, expected operating windows, passenger or payload needs, accessibility considerations, and known site constraints. Require a site-specific route and staging plan. Ask suppliers to list door, lift, curb, power, network, and access-control dependencies."], bullets: ["Define who controls dispatch, remote assistance, incident response, and building access.", "Require a responsibility matrix for the property, operator, integrator, and equipment supplier.", "Ask which standards or codes the vendor claims to meet and what independent evidence supports that claim."] },
      { heading: "Make acceptance and exit measurable", paragraphs: ["Include commissioning scenarios for routine operations, congestion, loss of connectivity, access denial, emergency procedures, and service downtime. Define required logs, retention, cybersecurity ownership, maintenance, and change control. Specify who approves deviations and how a pilot can be paused or ended."], bullets: ["Use site-specific acceptance criteria with accessible routes and emergency operations included.", "Require interface documentation and an integration test with the actual building systems.", "Document data ownership, incident reporting, insurance, and end-of-contract removal obligations."] },
    ],
    checklist: ["Service outcomes and scope", "Vendor assumptions and interface matrix", "Safety, accessibility, and emergency test cases", "Named owners, acceptance criteria, and off-ramp"],
    sources: [interface, access, faa],
    publishedAt: today,
    reviewedAt: today,
  },

  {
    slug: "prepare-property-for-robotaxi-pickup",
    title: "How can a commercial property prepare for robotaxi pickup and drop-off?",
    description: "Plan a legible, accessible passenger transfer that works with the street, building entrance, vehicle approach, and operator workflow.",
    category: "robotaxi-arrivals",
    answer: "Begin by observing how people and vehicles currently approach, stop, wait, and depart. Then define a pickup and drop-off area with a safe vehicle path, enough dwell and queue space for the expected operation, an accessible pedestrian connection, clear wayfinding, and an agreed operator process. The right layout is site- and jurisdiction-specific.",
    sections: [
      { heading: "Design the transfer, not just the parking space", paragraphs: ["Map passenger desire lines between the curb and the destination entrance. Consider vehicle approach and exit movements, sight lines, crossing points, weather protection, luggage, mobility devices, and the effect of queues on through traffic. A curbside zone may be public space subject to rules the property owner does not control."], bullets: ["Separate pickup dwell from staging or long waits where feasible.", "Give the operator a precise, field-tested location and a fallback if it is occupied.", "Coordinate signs, pavement markings, geofencing, and property wayfinding as one instruction set."] },
      { heading: "Test real operating conditions", paragraphs: ["Walk the proposed route with facilities, parking, security, accessibility, and operations staff. Test a busy arrival period and a disruption scenario before making the arrangement permanent. NACTO's curbside work is useful background on competing curb uses; it is not a robotaxi engineering specification."], bullets: ["Observe queues, illegal stops, deliveries, transit, and emergency access.", "Confirm accessible paths and loading requirements with local professionals.", "Agree on who monitors the zone and responds when a vehicle blocks access."] },
    ],
    checklist: ["Map the complete passenger path", "Separate stopping, waiting, and staging needs", "Confirm jurisdiction and property-control boundaries", "Run a peak-period operational test"],
    sources: [curb, access],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "hotel-robotaxi-pickup-location",
    title: "Where should a hotel place robotaxi pickup and drop-off?",
    description: "A hotel pickup point should balance a clear guest handoff, accessible entry, vehicle circulation, curb control, and simultaneous arrival peaks.",
    category: "robotaxi-arrivals",
    answer: "Choose the location by tracing a guest's path from the vehicle to reception and checking how that transfer interacts with valet, taxis, shuttles, deliveries, and emergency access. The closest curb is not automatically best: a managed side approach or defined overflow plan may produce a safer and more reliable arrival.",
    sections: [
      { heading: "Coordinate with the hotel's existing arrival system", paragraphs: ["Hotels often have competing curb users and changing demand by time of day. Document which party controls each lane and how a guest identifies the vehicle. Consider luggage handling, weather exposure, night lighting, concierge visibility, and the route to an accessible entrance."], bullets: ["Set a primary pickup point plus a clearly messaged fallback.", "Avoid routes that cross active loading, valet backing, or pedestrian queues without controls.", "Agree with the operator how arrivals are identified without exposing unnecessary guest data."] },
      { heading: "Measure the guest experience under load", paragraphs: ["Observe check-in peaks, event turnover, and simultaneous shuttle or tour-bus arrivals. Test a short pilot with staff feedback and a clear way to report blocked access or confusing wayfinding. Keep any curb rules and accessibility obligations tied to the property's jurisdiction."], bullets: ["Include accessible pedestrian connections and usable boarding space in the walkthrough.", "Assign ownership for curb monitoring and guest assistance.", "Review the layout when traffic patterns, construction, or operator behavior changes."] },
    ],
    checklist: ["Coordinate robotaxi use with valet and shuttle operations", "Document guest identification and fallback instructions", "Check accessibility and luggage movement", "Observe check-in and event peaks before finalizing"],
    sources: [curb, access],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "airport-autonomous-pickup-planning",
    title: "How should an airport plan autonomous-vehicle pickup zones?",
    description: "An airport AV pickup plan must fit terminal operations, curbside policy, remote staging, passenger wayfinding, and accessibility.",
    category: "robotaxi-arrivals",
    answer: "Treat an airport pickup zone as part of the terminal's managed ground-transport system. Define where vehicles wait, how passengers reach them, how surges are released from staging, and how the operation yields to accessible loading, transit, emergency access, and existing permit rules. Airport authority and local requirements control the final design.",
    sections: [
      { heading: "Keep staging separate from terminal dwell", paragraphs: ["Terminal curbs are constrained operational spaces. A remote holding area can help meter arrivals, but it requires reliable dispatch, clear passenger instructions, and a tested process for flight delays or missed connections. Do not move a queue out of sight without assigning responsibility for it."], bullets: ["Define geofenced staging, release conditions, and a communications fallback.", "Coordinate with airport ground transportation, security, accessibility, traffic, and airline teams.", "Plan for construction diversions, special events, and emergency closures."] },
      { heading: "Design the passenger handoff and governance", paragraphs: ["Specify a walkable connection between the terminal and pickup point, readable signs, accessible loading, and support for travelers with luggage or mobility needs. Establish permit, data-sharing, incident, and curb-enforcement arrangements before a pilot begins."], bullets: ["Model demand by terminal, time period, and arrival type rather than using a single average.", "Publish an accessible fallback when the designated zone is unavailable.", "Set pilot measures for dwell, queue spillback, missed pickups, and complaints."] },
    ],
    checklist: ["Coordinate with the airport ground-transport authority", "Separate holding, dispatch, and curb dwell", "Design accessible passenger instructions", "Agree on incident and diversion governance"],
    sources: [curb, access],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "accessible-robotaxi-curb-design",
    title: "How do you design robotaxi curb access without compromising accessibility?",
    description: "Plan a passenger loading point that preserves accessible routes, boarding clearances, pedestrian visibility, and local curb requirements.",
    category: "robotaxi-arrivals",
    answer: "Accessibility must be part of the operating concept and site layout, not an add-on after a curb is assigned to vehicles. Protect a continuous accessible route, consider boarding and alighting needs, and review the full path from arrival point to entrance against the rules that apply in that jurisdiction.",
    sections: [
      { heading: "Keep pedestrian routes clear and continuous", paragraphs: ["A vehicle waiting zone should not block sidewalks, curb ramps, entrances, detectable warnings, or access to transit. Evaluate turning and maneuvering space, cross slopes, passenger loading, visual cues, and conflicts with street furniture. The U.S. Access Board standards are a useful starting reference in the United States, but they are not a universal substitute for local requirements."], bullets: ["Walk the route from the public sidewalk and accessible parking to the entrance.", "Include wheelchair users and people with vision, hearing, and mobility disabilities in usability reviews.", "Do not count a marked zone as accessible without checking the complete route and boarding conditions."] },
      { heading: "Make the accessible option operationally usable", paragraphs: ["Dispatch instructions should let passengers request or reach an accessible vehicle and identify where it can safely board. Staff and operators need a fallback if construction, illegal stopping, or an occupied curb blocks the planned route. Review signs and in-app directions together."], bullets: ["Specify who keeps the path clear and how obstructions are reported.", "Confirm local passenger-loading and accessible-space provisions with qualified reviewers.", "Test the service with realistic curb and vehicle conditions before launch."] },
    ],
    checklist: ["Preserve a continuous accessible route", "Include users with disabilities in testing", "Keep accessible pickup operationally discoverable", "Verify the rules for the property's jurisdiction"],
    sources: [access, curb],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "robotaxi-property-ev-charging",
    title: "Does a property need EV charging for robotaxis?",
    description: "Charging is an operator and fleet-design decision; a property should verify demand, dwell, power, ownership, and access before installing equipment.",
    category: "robotaxi-arrivals",
    answer: "Not automatically. Whether a property needs charging depends on the operator's vehicle, route, dwell pattern, fleet strategy, and who owns the charging obligation. Ask the operator for a site-specific load and access plan, then have the utility and qualified electrical professionals verify service capacity and equipment requirements.",
    sections: [
      { heading: "Get the operating assumptions before sizing", paragraphs: ["Request expected vehicle count, arrival pattern, charging duration, power level, connector, access hours, and ownership model. A public passenger pickup zone is different from a private fleet depot. Charging vehicles at the curb may conflict with turnover, parking rules, accessible loading, or the needs of other tenants."], bullets: ["Clarify whether charging is a property amenity, operator asset, or third-party service.", "Identify simultaneous demand and how charging is controlled during building peaks.", "Check parking, fire, electrical, utility, and accessibility requirements locally."] },
      { heading: "Plan for service, maintenance, and expansion", paragraphs: ["If charging is warranted, compare equipment and network needs with the property's electrical service and maintenance capability. The U.S. DOE Alternative Fuels Data Center describes charging equipment and infrastructure considerations; its technical and regulatory context is U.S.-specific. A licensed professional should establish the design for the actual site."], bullets: ["Ask the utility about available capacity, upgrades, and lead times.", "Plan cable management, protective placement, accessible use, and fault response.", "Avoid reserving scarce pickup capacity for charging unless the operator's model requires it."] },
    ],
    checklist: ["Obtain a written operator charging profile", "Confirm power and utility capacity", "Assign equipment and maintenance ownership", "Separate charging dwell from passenger turnover where needed"],
    sources: [ev, curb],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "robotaxi-queue-and-surge-management",
    title: "How can a building manage robotaxi queues and arrival surges?",
    description: "Use observed demand, separate staging from boarding, and agree on queue controls and fallback procedures with the operator.",
    category: "robotaxi-arrivals",
    answer: "Measure arrivals by time and event type, then reserve curb dwell for actual passenger transfers and manage waiting vehicles elsewhere when permitted. An operating plan should specify the queue trigger, release logic, staff responsibilities, accessible fallback, and what happens when the designated space is blocked.",
    sections: [
      { heading: "Size the operation from observations", paragraphs: ["Short observations during check-in, shift changes, events, or flight arrivals often reveal peak patterns that daily averages hide. Record dwell time, queue spillback, competing curb users, and the time a passenger needs to find a vehicle. Do not turn a small sample into a guaranteed demand forecast."], bullets: ["Separate arrival demand from vehicles circulating or waiting for a match.", "Identify nearby staging only after confirming control, legal use, and safe access.", "Define a queue threshold that triggers rerouting or temporary suspension."] },
      { heading: "Assign control and recovery", paragraphs: ["The site team and operator should agree who monitors conditions and can pause service. Test construction, emergency access, poor connectivity, and missed passenger scenarios. Signs, digital instructions, and dispatch rules must point to the same fallback location."], bullets: ["Name a decision-maker for queue escalation.", "Track dwell, spillback, blocked accessible routes, and complaints during the pilot.", "Review rules with property management and the local authority when curb space is public."] },
    ],
    checklist: ["Observe representative demand peaks", "Separate vehicle holding from passenger loading", "Set a queue trigger and named authority", "Test fallback and pause procedures"],
    sources: [curb, access],
    publishedAt: today,
    reviewedAt: today,
  },

  {
    slug: "building-requirements-for-delivery-robots",
    title: "What building features do indoor delivery robots need?",
    description: "A building route depends on continuous access, workable doors and lifts, safe circulation, reliable connectivity, and a human fallback.",
    category: "indoor-delivery-robots",
    answer: "Indoor delivery robots need a route the specific robot can safely navigate and a service workflow that grants access at each boundary. Survey floor transitions, door and lift interfaces, corridor traffic, delivery handoff, connectivity, charging, and emergency procedures before assuming a general-purpose robot can operate throughout a building.",
    sections: [
      { heading: "Survey the whole route", paragraphs: ["Follow the package from the receiving point to each destination, including secure doors, elevators, fire doors, ramps, thresholds, and areas with high pedestrian traffic. Ask the supplier for vehicle dimensions, turning envelope, operating limits, sensor constraints, and environmental conditions. A map alone cannot verify the lived route."], bullets: ["Identify doors or floors that require credentials, staff, or intercom assistance.", "Check waiting and passing areas without narrowing accessible circulation.", "Document route closures, after-hours rules, and handoff locations."] },
      { heading: "Design operations around people and exceptions", paragraphs: ["Set expectations for delivery recipients, misplaced packages, blocked corridors, and a robot that needs help. Confirm who can stop service and who responds to alerts. Building interfaces must preserve the operation of doors, lifts, alarms, and emergency procedures; vendor compatibility claims should be tested on the actual systems."], bullets: ["Agree on charging location, cleaning, maintenance, and battery-fault response.", "Test the route with accessibility and facilities staff.", "Define a manual delivery fallback before a pilot starts."] },
    ],
    checklist: ["Verify every route segment and interface", "Get the robot's documented operating envelope", "Protect pedestrian and accessible circulation", "Assign an exception and maintenance workflow"],
    sources: [interface, access],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "can-delivery-robots-use-existing-elevators",
    title: "Can delivery robots use a building's existing elevators?",
    description: "Sometimes, but only after confirming lift control, communication, safety behavior, queueing, access policy, and authority approval.",
    category: "indoor-delivery-robots",
    answer: "Possibly; the answer depends on the elevator, robot, control integration, building rules, and applicable local code. Do not assume a mobile app or robot API is sufficient to authorize lift use. Have the elevator provider, robot integrator, facilities team, and relevant authority agree on the interface and safe behavior before testing.",
    sections: [
      { heading: "Treat the elevator as a controlled building system", paragraphs: ["Document how the robot requests a car, confirms arrival, enters and exits, selects a floor, handles a failed call, and communicates when a door is obstructed. Check lobby space for queuing without blocking passengers, accessible routes, or emergency equipment. Integration must not defeat the elevator's own safety functions."], bullets: ["Confirm model, controller, software version, warranty, and who may authorize changes.", "Ask for a documented interface and test plan from the elevator and robot suppliers.", "Define what happens during fire alarm, power loss, emergency recall, or network outage."] },
      { heading: "Test interoperability and operations", paragraphs: ["A fleet interface specification can help describe messages between systems, but it does not itself certify a lift or prove the end-to-end installation is safe. Run a supervised test with building stakeholders and record faults, accessibility impacts, and manual recovery steps."], bullets: ["Use a controlled pilot away from peak passenger periods.", "Set acceptance criteria for call reliability, wait time, door behavior, and recovery.", "Obtain any required local approvals and written system-provider acceptance."] },
    ],
    checklist: ["Confirm written compatibility from both system suppliers", "Map normal and abnormal elevator states", "Keep lift lobbies and accessible paths clear", "Test with a supervised, site-specific acceptance plan"],
    sources: [interface, access],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "delivery-robot-door-access-control",
    title: "How should a building handle doors and access control for delivery robots?",
    description: "Grant only the access the service needs, preserve life-safety controls, and keep a human-managed exception path.",
    category: "indoor-delivery-robots",
    answer: "Treat each door as both a security boundary and a life-safety system. Agree which doors the robot may use, how it proves authorization, what logs are retained, and how doors behave when access is denied or the network fails. Do not bypass fire, egress, or emergency behavior to make a route work.",
    sections: [
      { heading: "Define least-privilege access", paragraphs: ["Map destinations and restrict access to only the floors, time windows, and doors needed for the contracted service. The security team should understand credential issuance, revocation, monitoring, data retention, and responsibility when a device is lost or compromised."], bullets: ["Prefer a controlled integration to shared staff credentials.", "Set expiration, revocation, and audit procedures for robot identities.", "Protect resident, guest, tenant, and delivery data from unnecessary collection."] },
      { heading: "Preserve safety and human support", paragraphs: ["Door operators, fire doors, interlocks, and accessible controls may be subject to local rules and manufacturer constraints. Have qualified building-system professionals review the proposed interface. Make a person available to resolve denied access without encouraging tailgating or unsafe door holding."], bullets: ["Test lockout, alarm, power loss, and emergency release scenarios.", "Keep accessible controls and required egress functions unobstructed.", "Provide a staffed or secure fallback for blocked routes and failed credentials."] },
    ],
    checklist: ["Approve a least-privilege route and schedule", "Never share general staff access credentials", "Preserve door and egress safety behavior", "Define credential revocation and human recovery"],
    sources: [access, interface],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "floor-conditions-for-indoor-robots",
    title: "How do floor conditions affect indoor delivery-robot routes?",
    description: "Transitions, surface changes, debris, moisture, slopes, and crowding should be checked against the chosen robot's documented limits.",
    category: "indoor-delivery-robots",
    answer: "Floor suitability is vehicle-specific: a threshold or floor finish that seems minor to a person may exceed a robot's documented operating envelope or affect traction and sensing. Inspect routes in service conditions, record transitions and temporary obstructions, and ask the supplier to validate the exact vehicle and load rather than relying on a generic claim.",
    sections: [
      { heading: "Inspect transitions and changing conditions", paragraphs: ["Walk the proposed route at the times it will operate. Note joints, mats, slopes, ramps, wet entries, reflective or dark surfaces, cable covers, temporary displays, and door saddles. Track where cleaning, deliveries, or weather can change the surface after the initial survey."], bullets: ["Record the height and shape of thresholds for supplier review.", "Test traction and stopping under realistic, approved conditions.", "Keep human accessibility and pedestrian safety as independent design requirements."] },
      { heading: "Turn limitations into route rules", paragraphs: ["The robot provider should identify limits for slope, transition, load, wet areas, and localization. Facilities operations should define how to keep the route clear and what the robot does when it detects a condition outside those limits. Do not assume the machine can detect every hazard."], bullets: ["Use an alternate route or supervised service when conditions are not validated.", "Document inspection and cleaning responsibilities.", "Recheck the route after resurfacing, fit-outs, or recurring incidents."] },
    ],
    checklist: ["Observe the route during expected operating hours", "Measure transitions and slopes for vendor assessment", "Document wet, reflective, cluttered, or changing areas", "Set route-closure and human-fallback rules"],
    sources: [interface, access],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "connectivity-for-indoor-delivery-robots",
    title: "What connectivity do indoor delivery robots need?",
    description: "Ask the operator what must remain online, where coverage is required, what fails safely, and how building networks are segmented.",
    category: "indoor-delivery-robots",
    answer: "There is no universal Wi-Fi specification for every robot. Obtain the supplier's requirements for coverage, latency, roaming, remote assistance, telemetry, and offline behavior, then survey the actual route and coordinate with building IT. The service should have a safe response when connectivity degrades rather than assuming continuous signal.",
    sections: [
      { heading: "Measure the route and failure modes", paragraphs: ["Survey the entire operating area, including lift lobbies, loading areas, corridors, parking levels, and handoff points. Ask which robot functions are local and which depend on cloud or fleet services. Define what it does if the network drops during movement, at a door, or with a package onboard."], bullets: ["Review roaming between access points and any dead zones in motion paths.", "Confirm bandwidth and service dependencies with the vendor and IT team.", "Agree on monitoring, incident notification, and offline-mode limits."] },
      { heading: "Keep fleet connectivity separate from trust", paragraphs: ["Network access should be limited to approved services and devices, with clear ownership of software updates and security incidents. Ask about data encryption, identity, vulnerability disclosure, logging, and remote support. A wireless signal survey does not replace a cybersecurity review."], bullets: ["Use network segmentation and least-privilege access where appropriate.", "Decide who patches, monitors, and revokes robot credentials.", "Test loss of connectivity and recovery as an operational scenario."] },
    ],
    checklist: ["Obtain written network requirements from the robot operator", "Survey coverage along the live route", "Review security, data, updates, and remote support", "Test degraded and disconnected modes"],
    sources: [interface],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "multiple-robot-fleets-in-one-building",
    title: "How can multiple robot fleets coexist in one building?",
    description: "Shared operations need fleet coordination, access rules, route governance, incident ownership, and a clear building authority.",
    category: "indoor-delivery-robots",
    answer: "Treat a multi-fleet building as a shared mobility environment, not a collection of isolated vendor pilots. Establish who coordinates routes, elevators, doors, charging, right-of-way, and incidents. Prefer documented interfaces and site rules, but verify interoperability and safety with the specific systems involved.",
    sections: [
      { heading: "Create a building-level operating protocol", paragraphs: ["A building should maintain a registry of approved fleets, operating areas, schedules, contacts, and access rights. Define common conventions for delivery handoff, lift use, congestion, emergency suspension, and charging. Avoid allowing two vendors to make incompatible assumptions about shared doors or corridors."], bullets: ["Assign a building mobility owner with authority to pause operations.", "Set geofenced routes and shared-space etiquette with tenant input.", "Coordinate lift calls, charging slots, storage, and maintenance windows."] },
      { heading: "Test interoperability without assuming it", paragraphs: ["Open interface standards can support communications between a fleet manager and mobile robots; they do not guarantee that separate fleets will coordinate safely in a particular building. Test message compatibility, traffic behavior, and exception handling. Keep a human process for conflicts the systems cannot resolve."], bullets: ["Require each vendor to document protocol versions and unsupported features.", "Test simultaneous traffic, shared lift demand, and loss of one fleet service.", "Track incidents and revise access or route rules with affected stakeholders."] },
    ],
    checklist: ["Name one building-level owner", "Publish shared route and access rules", "Require interoperability evidence and version details", "Test multi-fleet and fault scenarios before expansion"],
    sources: [interface, access],
    publishedAt: today,
    reviewedAt: today,
  },

  {
    slug: "commercial-property-drone-hub-suitability",
    title: "What makes a commercial property suitable for a drone-delivery hub?",
    description: "Hub suitability combines the operator's aircraft and flight plan with a lawful site, workable ground logistics, community considerations, and approvals.",
    category: "drone-delivery",
    answer: "A suitable site is one an operator can use safely and legally for a defined service, with compatible ground logistics and manageable impacts—not simply a large roof or open lot. Evaluate the aircraft and concept of operations, airspace and local approvals, launch and recovery area, package handoff, security, noise, and public communication together.",
    sections: [
      { heading: "Start with the operator's actual concept of operations", paragraphs: ["Ask for aircraft dimensions, launch and recovery method, package handling, service hours, flight-area assumptions, emergency procedures, and the operator's approval pathway. Requirements vary by aircraft, operation, and jurisdiction. A site that works for one concept may not work for another."], bullets: ["Check structural, access, fall-protection, fire, and weather exposure with qualified professionals.", "Plan secure storage, staff circulation, package staging, and vehicle access.", "Map nearby sensitive uses, neighbors, wildlife, and public areas for impact review."] },
      { heading: "Separate aviation approval from site permission", paragraphs: ["In the United States, the FAA describes operator certification and airspace responsibilities for Part 135 package delivery, while also noting operator responsibilities for local requirements, hub infrastructure, and community engagement. Other countries have different aviation and planning authorities. Confirm both the flight authorization and the land-use pathway."], bullets: ["Identify the aviation authority, local planning authority, property owner, and operator roles.", "Confirm site control and permissions for the full operating period.", "Document community outreach, noise controls, and incident contacts."] },
    ],
    checklist: ["Get a written concept of operations from the provider", "Verify both aviation and local site approvals", "Assess ground handling, security, weather, and noise", "Document site control and community engagement"],
    sources: [faa],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "drone-delivery-rooftop-landing-pad",
    title: "Does a drone-delivery site need a rooftop landing pad?",
    description: "Not necessarily; launch and recovery requirements depend on the aircraft, operation, operator procedures, and approved site design.",
    category: "drone-delivery",
    answer: "There is no universal answer. Some delivery operations may use a defined launch or recovery area; others may rely on an operator's different approved procedure. Do not designate a roof as a landing pad until the aircraft operator, structural engineer, building team, and relevant authorities have confirmed the operational and site requirements.",
    sections: [
      { heading: "Ask what the aircraft and operation require", paragraphs: ["Obtain the operator's aircraft envelope, launch/recovery procedure, clear-zone needs, surface requirements, approach constraints, weather limits, and emergency plan. Confirm whether people may be present, how packages move to and from the aircraft, and what separation is needed from roof equipment and edges."], bullets: ["Verify roof loading, waterproofing, access, fall protection, and maintenance constraints.", "Consider wind, obstacles, neighboring structures, and emergency access.", "Avoid assuming a painted mark or generic pad meets the operator's requirements."] },
      { heading: "Coordinate the whole building", paragraphs: ["A rooftop operation affects more than the roof: it may change access control, elevator use, fire procedures, package storage, noise, and tenant communications. In the United States, FAA operator and airspace responsibilities are separate from local site permission. Confirm the applicable process in the property's jurisdiction."], bullets: ["Obtain written approval from the operator and responsible building professionals.", "Review normal, abnormal, and emergency operations before site work.", "Make the final design specific to the selected aircraft and authorized service."] },
    ],
    checklist: ["Do not assume a standard pad fits every operation", "Obtain an aircraft-specific launch/recovery design", "Verify roof structure and building-system impacts", "Confirm local site and aviation approvals"],
    sources: [faa],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "drone-delivery-zoning-and-approvals",
    title: "What approvals are needed for a commercial drone-delivery site?",
    description: "Approvals are jurisdiction- and operation-specific; aviation authorization does not replace property permission or local land-use review.",
    category: "drone-delivery",
    answer: "There is no single global permit checklist. Identify the aviation authority and the local planning, building, fire, environmental, and property approvals that apply to the exact site and operation. In the United States, the FAA states that operators must comply with state and local requirements and obtain applicable FAA approvals; local rules and processes still need to be checked directly.",
    sections: [
      { heading: "Map authorities before selecting a launch date", paragraphs: ["Confirm who authorizes the aircraft and airspace operation, who controls the land use, and who approves construction or building-system changes. Include landlord consent, lease terms, roof access, insurance, emergency planning, and any public notification requirement. The operator should own its aviation application; the property team should verify its own site responsibilities."], bullets: ["Ask the operator for a written permit and approval matrix.", "Contact the relevant local authority early about land use, noise, and construction.", "Check whether environmental review or community engagement is required."] },
      { heading: "Keep the record specific and current", paragraphs: ["Record approval conditions, operating hours, aircraft, approved area, mitigation measures, and renewal dates. A change in aircraft, flight area, service frequency, or physical site can change the review. Never rely on a vendor's approval at another address as permission to operate at this property."], bullets: ["Keep permit documents with the site's operating procedures.", "Confirm current rules with the authority and qualified counsel.", "Reopen review when material operating assumptions change."] },
    ],
    checklist: ["Identify aviation, land-use, building, and fire authorities", "Request a site-specific approval matrix", "Record conditions and renewal/change triggers", "Verify rules in the property's actual jurisdiction"],
    sources: [faa],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "drone-delivery-noise-and-community-impact",
    title: "How should property teams evaluate drone-delivery noise and community impact?",
    description: "Assess the full operating pattern and sensitive surroundings, then require measurable mitigation and a responsive community contact.",
    category: "drone-delivery",
    answer: "Evaluate noise and community impacts using the proposed aircraft, route, operating hours, frequency, and nearby uses—not a generic promise that drones are quiet. Include residents, schools, health facilities, places of worship, parks, wildlife, and historic resources where relevant. Establish mitigation and a real complaint-response process before a site is committed.",
    sections: [
      { heading: "Assess the operating pattern at the property boundary", paragraphs: ["Ask for expected movements by time of day, flight paths, aircraft sound information, and alternatives for bad weather or failed deliveries. Consider how sound travels across roofs, courtyards, neighboring buildings, and quiet hours. A published environmental assessment may inform the review but cannot settle every site's effects."], bullets: ["Map sensitive uses and community access around the proposed hub.", "Review takeoff, approach, turnaround, and ground-handling noise separately.", "Ask the operator to identify realistic operating limits and mitigation options."] },
      { heading: "Make engagement and response part of the operating plan", paragraphs: ["Agree who communicates with neighbors, receives concerns, documents them, and escalates incidents. The FAA's U.S. package-delivery material describes community engagement and mitigation in its environmental review context. Check local environmental and public-engagement expectations for the specific proposal."], bullets: ["Provide a named contact and response process before launch.", "Track complaint type, time, location, and operational context.", "Review the service if actual effects differ from the assumptions used in approval."] },
    ],
    checklist: ["Review aircraft and site-specific movement assumptions", "Map sensitive nearby uses", "Agree measurable controls and a point of contact", "Track and respond to concerns after launch"],
    sources: [faa],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "secure-drone-delivery-property-handoff",
    title: "How should a property plan secure drone-delivery handoff?",
    description: "A ground-side handoff needs a controlled recipient journey, package custody, access rules, weather protection, and a manual exception path.",
    category: "drone-delivery",
    answer: "Design the handoff as a chain of custody from aircraft or transfer point to the intended recipient. Decide where packages are received, who can access them, how the recipient is verified, and what happens when a delivery cannot be completed. The operator's approved aircraft procedure and the property's security policy must agree.",
    sections: [
      { heading: "Define custody and recipient access", paragraphs: ["Choose a transfer location that is secure, observable, accessible to the intended recipient, and separated from unrelated roof or loading activity. Set the package's temporary storage limit, identity-check process, and rules for undeliverable or sensitive items. Do not expose guest or tenant details beyond the minimum needed to complete the handoff."], bullets: ["Name the receiving party and document when custody transfers.", "Plan for delivery alerts, wrong-recipient risk, tampering, and uncollected packages.", "Include accessible routes and staff assistance where the service requires them."] },
      { heading: "Test the exception path", paragraphs: ["A secure plan covers missed arrivals, weather delays, equipment faults, access-control outages, and emergency closure. Decide whether a staff member stores, redirects, or returns a package and how that decision is logged. Confirm the process with security, facilities, the operator, and affected tenants."], bullets: ["Use a locked and monitored holding location if temporary storage is allowed.", "Set retention and incident-reporting rules for package and recipient records.", "Make a human fallback available when automated verification fails."] },
    ],
    checklist: ["Map transfer point to recipient", "Set custody, identity, and storage rules", "Protect accessible access and personal data", "Rehearse weather, access, and failed-delivery cases"],
    sources: [faa, access],
    publishedAt: today,
    reviewedAt: today,
  },
  {
    slug: "drone-delivery-property-rfp",
    title: "What should a drone-delivery property RFP ask operators?",
    description: "Ask for aircraft-specific operations, approval evidence, site assumptions, noise plans, security, insurance, responsibilities, and acceptance criteria.",
    category: "drone-delivery",
    answer: "A property RFP should require a site-specific concept of operations and an approval matrix, not just a service description. Ask the operator to explain the aircraft, launch and recovery, flight and ground areas, package custody, noise mitigation, community engagement, safety procedures, insurance, and how performance will be tested.",
    sections: [
      { heading: "Request operational evidence", paragraphs: ["Require the operator to state aircraft configuration, flight area, planned operating hours, delivery type, ground handling, communications, and abnormal-event procedures. Ask for approvals and conditions relevant to this location and service. In the U.S., FAA materials describe the Part 135 pathway and operator responsibilities; other jurisdictions require their own authority review."], bullets: ["Request an authority and property approval matrix with accountable parties.", "Ask for sound, weather, security, package, and emergency assumptions.", "Require a site visit and marked plan identifying all operating areas."] },
      { heading: "Contract for ownership and change control", paragraphs: ["Define who maintains equipment, controls roof access, handles complaints, reports incidents, and restores the site at contract end. Set acceptance tests for routine and abnormal operations, data retention, and service suspension. Require notification when the aircraft, operating area, schedule, or subcontractor changes."], bullets: ["Define insurance, indemnity, incident notification, and records access with counsel.", "Agree on pilot success measures and conditions to pause or expand.", "Document community communication and a named escalation contact."] },
    ],
    checklist: ["Site-specific concept of operations", "Approval evidence and local responsibility matrix", "Noise, safety, handoff, and community plans", "Acceptance tests, change control, and exit terms"],
    sources: [faa, access],
    publishedAt: today,
    reviewedAt: today,
  },
]

export function getFeedGuide(slug: string) {
  return FEED_GUIDES.find((guide) => guide.slug === slug)
}

export function getFeedCategory(id: string) {
  return FEED_CATEGORIES.find((category) => category.id === id)
}

export function getGuidesForCategory(id: FeedCategoryId) {
  return FEED_GUIDES.filter((guide) => guide.category === id)
}

export function guideUrl(slug: string) {
  return `${SITE_URL}/feeds/${slug}`
}

export function categoryFeedUrl(id: FeedCategoryId) {
  return `${SITE_URL}/feeds/rss/${id}`
}

export function rssUrl() {
  return `${SITE_URL}/feeds/rss.xml`
}

export function readingTime(guide: FeedGuide) {
  const words = [guide.title, guide.description, guide.answer, ...guide.sections.flatMap((section) => [...section.paragraphs, ...(section.bullets ?? [])]), ...guide.checklist].join(" ").split(/\s+/).length
  return Math.max(3, Math.ceil(words / 220))
}

export function sectionId(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
}

export function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;")
}

export function guideText(guide: FeedGuide) {
  return [guide.answer, ...guide.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets ?? [])]), ...guide.checklist].join(" ")
}

export function rssDocument(guides: FeedGuide[], feedTitle: string, feedDescription: string, feedPath: string) {
  const latest = guides.reduce((newest, guide) => guide.reviewedAt > newest ? guide.reviewedAt : newest, "1970-01-01")
  const items = guides.map((guide) => `\n    <item>\n      <title>${escapeXml(guide.title)}</title>\n      <link>${escapeXml(guideUrl(guide.slug))}</link>\n      <guid isPermaLink=\"true\">${escapeXml(guideUrl(guide.slug))}</guid>\n      <description>${escapeXml(guide.description)}</description>\n      <pubDate>${new Date(`${guide.publishedAt}T12:00:00Z`).toUTCString()}</pubDate>\n      <category>${escapeXml(FEED_CATEGORIES.find((category) => category.id === guide.category)?.title ?? "RoboReady guides")}</category>\n    </item>`).join("")
  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\">\n  <channel>\n    <title>${escapeXml(feedTitle)}</title>\n    <link>${escapeXml(`${SITE_URL}${feedPath}`)}</link>\n    <description>${escapeXml(feedDescription)}</description>\n    <language>en</language>\n    <lastBuildDate>${new Date(`${latest}T12:00:00Z`).toUTCString()}</lastBuildDate>\n    <atom:link href=\"${escapeXml(`${SITE_URL}${feedPath}`)}\" rel=\"self\" type=\"application/rss+xml\" xmlns:atom=\"http://www.w3.org/2005/Atom\" />${items}\n  </channel>\n</rss>`
}

export const GUIDES_EDITORIAL_NOTE = "These question-led guides are an editorial planning library, not a keyword-volume report. They summarize public references and general planning considerations; every guide links its sources and identifies jurisdiction-specific limits. They are not site-specific engineering, legal, accessibility, or regulatory advice."

export const SEARCH_POLICY_SOURCE = {
  label: "Google Search Central, Creating Helpful, Reliable, People-First Content",
  url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
}
export const SCALED_CONTENT_SOURCE = {
  label: "Google Search Central, Spam Policies for Google Web Search",
  url: "https://developers.google.com/search/docs/essentials/spam-policies",
}
export const SITEMAP_SOURCE = {
  label: "Google Search Central, Build and Submit a Sitemap",
  url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap",
}
export const STRUCTURED_DATA_SOURCE = {
  label: "Google Search Central, Intro to Structured Data",
  url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
}

export const GUIDE_COUNTS_BY_CATEGORY = Object.fromEntries(FEED_CATEGORIES.map((category) => [category.id, getGuidesForCategory(category.id).length])) as Record<FeedCategoryId, number>

if (FEED_GUIDES.length !== 24 || FEED_CATEGORIES.some((category) => GUIDE_COUNTS_BY_CATEGORY[category.id] !== 6)) {
  throw new Error("Feed library must contain six reviewed guides in each of four categories")
}

if (new Set(FEED_GUIDES.map((guide) => guide.slug)).size !== FEED_GUIDES.length) {
  throw new Error("Feed guide slugs must be unique")
}

if (FEED_GUIDES.some((guide) => guide.sources.length === 0)) {
  throw new Error("Every public feed guide must cite at least one source")
}

if (FEED_GUIDES.some((guide) => guide.sections.length < 2 || guide.checklist.length < 3)) {
  throw new Error("Every public guide must include practical sections and an action checklist")
}
