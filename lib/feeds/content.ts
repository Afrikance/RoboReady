export type FeedCategoryId =
  | "robotaxi-curb"
  | "building-robots"
  | "drones"
  | "power-investment"
  | "decision-makers"

export type FeedSource = {
  id: string
  title: string
  publisher: string
  url: string
  note: string
}

export type FeedSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type FeedGuide = {
  slug: string
  question: string
  title: string
  description: string
  category: FeedCategoryId
  answer: string
  reviewedAt: string
  sourceIds: string[]
  related: string[]
  sections: FeedSection[]
}

export const FEED_CATEGORIES: { id: FeedCategoryId; label: string; description: string }[] = [
  { id: "robotaxi-curb", label: "Robotaxis & curb access", description: "Pickup, drop-off, private-road circulation, and curb planning." },
  { id: "building-robots", label: "Building delivery robots", description: "Indoor routes, elevators, doors, loading areas, and operations." },
  { id: "drones", label: "Drones & air mobility", description: "Property roles, delivery-site questions, airspace, and approvals." },
  { id: "power-investment", label: "Power & investment", description: "Charging, electrical capacity, staging, and retrofit decisions." },
  { id: "decision-makers", label: "Decision-maker playbooks", description: "Site surveys, property types, new construction, and teams." },
]

export const FEED_SOURCES: FeedSource[] = [
  { id: "google-helpful", title: "Creating helpful, reliable, people-first content", publisher: "Google Search Central", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content", note: "Guidance for creating original, useful pages for people rather than search engines." },
  { id: "google-spam", title: "Spam policies for Google web search", publisher: "Google Search Central", url: "https://developers.google.com/search/docs/essentials/spam-policies", note: "Includes the policy on scaled content abuse." },
  { id: "faa-part-135", title: "Package delivery by drone (Part 135)", publisher: "Federal Aviation Administration", url: "https://www.faa.gov/uas/advanced_operations/package_delivery_drone", note: "U.S. framework and operator information for package-delivery operations; requirements vary by operation." },
  { id: "afdc-charging", title: "Electric vehicle charging stations", publisher: "U.S. Department of Energy, Alternative Fuels Data Center", url: "https://afdc.energy.gov/fuels/electricity_infrastructure.html", note: "Overview of charging equipment and infrastructure in the United States." },
  { id: "afdc-trends", title: "Electric vehicle charging infrastructure trends", publisher: "U.S. Department of Energy, Alternative Fuels Data Center", url: "https://afdc.energy.gov/fuels/electricity_infrastructure_trends.html", note: "U.S. charging infrastructure context and trends." },
  { id: "nacto-curb", title: "Curb Appeal: Curbside Management Strategies for Improving Transit Reliability", publisher: "National Association of City Transportation Officials", url: "https://nacto.org/publication/curb-appeal/", note: "Planning approaches to competing curb uses; published in 2017 and not an autonomous-vehicle design standard." },
  { id: "access-board", title: "ADA Accessibility Standards", publisher: "U.S. Access Board", url: "https://www.access-board.gov/ada/", note: "U.S. accessibility standards; consult the applicable local requirements and authority." },
  { id: "iso-3691-4", title: "ISO 3691-4:2020 — Driverless industrial trucks and their systems", publisher: "International Organization for Standardization", url: "https://www.iso.org/standard/70660.html", note: "A safety standard for the specified industrial-truck scope; it is not a universal building-robot or property-compliance checklist." },
  { id: "vda-5050", title: "VDA 5050", publisher: "German Association of the Automotive Industry", url: "https://www.vda.de/en/topics/automotive-industry/vda-5050", note: "An interface specification for coordinating mobile robots and a central control system; applicability depends on the deployment." },
]

const REVIEWED_AT = "2026-09-30"

export const FEED_GUIDES: FeedGuide[] = []

export function getFeedGuide(slug: string) {
  return FEED_GUIDES.find((guide) => guide.slug === slug)
}

export function getFeedCategory(id: string) {
  return FEED_CATEGORIES.find((category) => category.id === id)
}

export function getFeedSource(id: string) {
  return FEED_SOURCES.find((source) => source.id === id)
}

export function guidesForCategory(category: FeedCategoryId) {
  return FEED_GUIDES.filter((guide) => guide.category === category)
}

export const FEED_LAST_BUILD = new Date(`${REVIEWED_AT}T12:00:00.000Z`)

export function feedGuideUrl(slug: string) {
  return `https://roboready.net/feeds/${slug}`
}

export function feedCategoryUrl(category: FeedCategoryId) {
  return `https://roboready.net/feeds/rss/${category}.xml`
}

export function feedHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

export function getRelatedGuides(guide: FeedGuide) {
  return guide.related.map(getFeedGuide).filter((related): related is FeedGuide => Boolean(related))
}

export function validateFeedCatalog() {
  const slugs = new Set(FEED_GUIDES.map((guide) => guide.slug))
  return FEED_GUIDES.every((guide) =>
    guide.slug.length > 0 &&
    guide.description.length > 40 &&
    guide.sections.length >= 2 &&
    guide.sections.every((section) => section.paragraphs.length > 0) &&
    guide.sourceIds.length > 0 &&
    guide.sourceIds.every((id) => Boolean(getFeedSource(id))) &&
    guide.related.every((slug) => slug !== guide.slug && slugs.has(slug))
  )
}

if (!validateFeedCatalog()) {
  throw new Error("Invalid RoboReady feeds catalog: missing, duplicate, or broken guide references.")
}

if (new Set(FEED_GUIDES.map((guide) => guide.slug)).size !== FEED_GUIDES.length) {
  throw new Error("Invalid RoboReady feeds catalog: guide slugs must be unique.")
}

if (new Set(FEED_SOURCES.map((source) => source.id)).size !== FEED_SOURCES.length) {
  throw new Error("Invalid RoboReady feeds catalog: source IDs must be unique.")
}

export const FEED_AUTHORS = ["RoboReady Editorial Team"] as const
export const FEED_PUBLISHER = "RoboReady"
export const FEED_BASE_URL = "https://roboready.net"
export const FEED_INTENT_NOTE = "This is an editorial map of practical buyer questions, not measured search volume or a guarantee of search rankings or AI citations. Validate priorities against customer conversations and first-party search data."
export const FEED_SCOPE_NOTE = "Guidance is informational, not engineering, safety, accessibility, legal, aviation, or code-compliance advice. Requirements vary by location and deployment. Confirm site-specific decisions with qualified professionals, relevant authorities, and the service operator."
