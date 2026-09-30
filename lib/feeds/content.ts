export const FEED_CATEGORIES = [
  { id: "curb", label: "Robotaxi & curb" },
  { id: "building", label: "Delivery robots" },
  { id: "drone", label: "Drone delivery" },
  { id: "energy", label: "Power & charging" },
  { id: "planning", label: "Planning & investment" },
] as const

export type FeedCategoryId = (typeof FEED_CATEGORIES)[number]["id"]
type FeedSection = { heading: string; paragraphs: string[]; checklist?: string[] }
type FeedSource = { id: string; title: string; url: string; publisher: string }

export const FEED_SOURCES: FeedSource[] = [
  { id: "fhwa-curb", title: "Curbside Management Practitioners Guide", url: "https://www.fhwa.dot.gov/innovation/everydaycounts/edc_6/curbside_management.cfm", publisher: "Federal Highway Administration" },
  { id: "nacto-curb", title: "Curb Appeal: Curbside Management Strategies", url: "https://nacto.org/publication/curb-appeal/", publisher: "National Association of City Transportation Officials" },
  { id: "ada", title: "ADA Standards for Accessible Design", url: "https://www.ada.gov/law-and-regs/design-standards/", publisher: "U.S. Department of Justice" },
  { id: "access-board", title: "Public Right-of-Way Accessibility Guidelines", url: "https://www.access-board.gov/prowag/", publisher: "U.S. Access Board" },
  { id: "faa-delivery", title: "Package Delivery by Drone (Part 135)", url: "https://www.faa.gov/uas/advanced_operations/package_delivery_drone", publisher: "Federal Aviation Administration" },
  { id: "faa-part107", title: "Small Unmanned Aircraft Systems (Part 107)", url: "https://www.faa.gov/uas/commercial_operators", publisher: "Federal Aviation Administration" },
  { id: "doe-afdc", title: "Electric Vehicle Charging Infrastructure", url: "https://afdc.energy.gov/fuels/electricity_infrastructure.html", publisher: "U.S. Department of Energy, Alternative Fuels Data Center" },
  { id: "doe-trends", title: "Electric Vehicle Charging Infrastructure Trends", url: "https://afdc.energy.gov/fuels/electricity_infrastructure_trends.html", publisher: "U.S. Department of Energy, Alternative Fuels Data Center" },
  { id: "iso3691", title: "ISO 3691-4:2020 — Driverless industrial trucks and their systems", url: "https://www.iso.org/standard/70660.html", publisher: "International Organization for Standardization" },
  { id: "vda5050", title: "VDA 5050 — Communication interface for automated guided vehicles", url: "https://www.vda.de/en/topics/automotive-industry/vda-5050", publisher: "German Association of the Automotive Industry" },
  { id: "google-helpful", title: "Creating helpful, reliable, people-first content", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content", publisher: "Google Search Central" },
  { id: "google-spam", title: "Spam policies for Google web search", url: "https://developers.google.com/search/docs/essentials/spam-policies", publisher: "Google Search Central" },
  { id: "google-sitemap", title: "Build and submit a sitemap", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap", publisher: "Google Search Central" },
]

const byId = new Map(FEED_SOURCES.map((source) => [source.id, source]))

export const FEED_GUIDES = [
  {
    slug: "is-my-property-ready-for-robotaxis",
    category: "curb",
    title: "Is my commercial property ready for robotaxis?",
    description: "A practical way to assess pickup access, curb operations, pedestrian safety, connectivity, and operator coordination before autonomous ride-hail arrives.",
    answer: "A property is more prepared for robotaxis when a vehicle can approach, identify a legal and safe pickup point, load or unload passengers without blocking other users, and leave without creating conflicts. Readiness depends on the site, street rules, and the operator—not a single universal hardware checklist.",
    sections: [
      { heading: "Start with the passenger journey", paragraphs: ["Map the trip from the property entrance to the vehicle and back: where a rider waits, how they identify the correct vehicle, what happens when a pickup point is occupied, and how staff help someone who needs assistance. A technically reachable curb can still be a poor pickup location if it is confusing, inaccessible, or conflicts with a busy entrance.", "Separate what the owner controls—private drives, signs, loading policies, lighting, and staff procedures—from public curb space governed by a city or transportation agency. Record the boundary on a site plan instead of assuming a property owner can authorize street use."], checklist: ["Trace an accessible route from the lobby to likely pickup areas.", "Mark public curb, private drive, loading, fire access, and pedestrian crossings.", "Identify who handles a missed pickup, queue, or temporary closure."] },
      { heading: "Evaluate the operating conditions", paragraphs: ["Observe arrival and departure patterns at different times, including shift changes, events, deliveries, and weather-sensitive periods. Note sightlines, turning movements, grades, gates, lighting, pedestrian crossings, and the ability of a vehicle to stop without blocking an emergency route. These are site observations, not proof that a specific operator supports the property.", "Ask prospective operators for their service-area and pickup-point process, supported vehicle dimensions, remote-assistance model, accessibility approach, and site onboarding requirements. Capabilities change; get current, written confirmation before construction or marketing a location as supported."], checklist: ["Collect peak-hour curb and driveway observations.", "Check pickup wayfinding and rider communication with the operator.", "Document assumptions that still need a field visit or agency approval."] },
      { heading: "Turn findings into a readiness plan", paragraphs: ["A useful assessment produces a prioritized list of constraints, owners, and next decisions—not a score presented as a regulatory approval. Separate operational changes (signage, reservations, staffing) from civil, electrical, access-control, or public-right-of-way work. Assign each item to the property team, operator, utility, or authority that can actually resolve it.", "RoboReady can help organize property observations and infrastructure planning. It does not certify autonomous-vehicle compatibility or replace an operator review, traffic engineer, accessibility professional, or local permitting process."] },
    ],
    sources: ["fhwa-curb", "nacto-curb", "ada"],
  },
] satisfies Array<{
  slug: string
  category: FeedCategoryId
  title: string
  description: string
  answer: string
  sections: FeedSection[]
  sources: string[]
}>

export type FeedGuide = (typeof FEED_GUIDES)[number]
export const FEED_REVIEWED_AT = "2026-09-30"
export const FEED_REVIEWED_LABEL = "September 30, 2026"
export const FEED_SITE_URL = "https://roboready.net"

export function getFeedGuide(slug: string) {
  return FEED_GUIDES.find((guide) => guide.slug === slug)
}

export function getFeedCategory(id: string) {
  return FEED_CATEGORIES.find((category) => category.id === id)
}

export function getFeedSource(id: string) {
  return byId.get(id)
}

export function getRelatedFeedGuides(guide: FeedGuide, limit = 3) {
  return FEED_GUIDES.filter((candidate) => candidate.category === guide.category && candidate.slug !== guide.slug).slice(0, limit)
}

export function guidesForCategory(category: string) {
  return FEED_GUIDES.filter((guide) => guide.category === category)
}

export function validateFeedCorpus() {
  const slugs = new Set(FEED_GUIDES.map((guide) => guide.slug))
  return FEED_GUIDES.every((guide) =>
    guide.slug.length > 0 &&
    guide.sources.length > 0 &&
    guide.sources.every((sourceId) => byId.has(sourceId)) &&
    guide.sections.length >= 3 &&
    guide.sections.every((section) => section.heading && section.paragraphs.length > 0),
  ) && slugs.size === FEED_GUIDES.length
}

export function escapeXml(value: string) {
  return value.replace(/[<>&'\\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character)
}

export function createRssFeed(guides: FeedGuide[], title: string, path: string) {
  const items = guides.map((guide) => `
    <item>
      <title>${escapeXml(guide.title)}</title>
      <link>${FEED_SITE_URL}/feeds/${guide.slug}</link>
      <guid isPermaLink="true">${FEED_SITE_URL}/feeds/${guide.slug}</guid>
      <description>${escapeXml(guide.description)}</description>
      <category>${escapeXml(FEED_CATEGORIES.find((category) => category.id === guide.category)?.label ?? guide.category)}</category>
      <pubDate>${new Date(`${FEED_REVIEWED_AT}T12:00:00Z`).toUTCString()}</pubDate>
    </item>`).join("")
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${escapeXml(title)}</title>
  <link>${FEED_SITE_URL}/feeds</link>
  <description>${escapeXml("Source-cited buyer guides for autonomous arrivals and property readiness.")}</description>
  <language>en</language>
  <lastBuildDate>${new Date(`${FEED_REVIEWED_AT}T12:00:00Z`).toUTCString()}</lastBuildDate>
  <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${FEED_SITE_URL}${path}" rel="self" type="application/rss+xml" />${items}
</channel></rss>`
}
