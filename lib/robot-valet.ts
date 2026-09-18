// ---------------------------------------------------------------------------
// Robot Valet Parking program: shared config + copy for the property-owner
// signup. Client-safe (no server-only imports) so both the intake form and any
// future partner-referral surface read the same source of truth.
//
// The program is not yet live. Today the "signup" is the intake interest flag
// (persisted in intake answers); this module powers the explainer + CTA and,
// like cyber-fleet.ts, intentionally does NOT model partner economics here.
// ---------------------------------------------------------------------------

export const ROBOT_VALET = {
  name: "Robot Valet Parking",
  // Autonomous valet: you pull into a booked, numbered drop-off bay at a lot or
  // airport, leave the car, and a robot lifts and parks it — then returns it to
  // the bay when you come back from your flight.
  tagline: "Book a bay, drop your car, a robot parks it — waiting when you return",
  blurb:
    "Drivers pull into a booked, numbered drop-off bay at the lot or airport and simply walk away. A robot lifts the vehicle and parks it automatically — packing up to 30% more cars into the same footprint — then brings it back to the bay for pickup when the owner returns from their flight.",
  // The launch partner. Stanley Robotics pioneered outdoor robotic valet
  // parking (the "Stan" robot) and was acquired by HL Robotics in 2024.
  partner: {
    name: "Stanley Robotics",
    parentName: "HL Robotics",
    acquiredYear: 2024,
    note: "Stanley Robotics, the outdoor robotic-valet pioneer behind the 'Stan' parking robot, was acquired by HL Robotics in 2024.",
  },
  // How it works, in the driver's order of experience.
  steps: [
    "Reserve a numbered drop-off bay online before arriving",
    "Pull into your booked bay at the lot or airport and leave the car",
    "A robot lifts and parks the vehicle in a dense automated area",
    "On your return, the car is waiting back in a bay — no hunting, no walking",
  ],
  // Why an owner signs up — the monetization framing for property owners.
  ownerBenefits: [
    "Fit up to ~30% more vehicles into the same lot or structure",
    "Premium, bookable valet pricing on existing parking inventory",
    "A differentiated amenity for airport, hotel, and mixed-use parking",
    "Listed in the RoboArrival network as a robot-valet-ready site",
  ],
} as const

export type RobotValetProgram = typeof ROBOT_VALET
