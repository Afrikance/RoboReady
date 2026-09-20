# RoboReady · StaffGPT · RoboArrival — Model & Strategy

> **Status:** Reference strategy narrative for **future implementation**. Not yet implemented.
> Source: "RoboReady StaffGPT RoboArrival Model" (provided by the product owner).
> Companion to the build instruction in
> [`robosearch-roboarrival-model-prompt.md`](./robosearch-roboarrival-model-prompt.md).

RoboReady is the product ecosystem. RoboSearch is the intelligence/data engine.
RoboArrival is the first major vertical/use case. StaffGPT is the AI workforce
that builds and operates the intelligence layer. This is a modular architecture
where RoboSearch can start as a subsystem of RoboReady and later become an
independent company/product without throwing away the work.

StaffGPT already supports specialized AI employees, workflows, APIs, and
cloud/local/hybrid execution, with an engineering team spanning architecture,
full-stack, code-review, QA and DevOps roles — making it suitable as the AI
workforce/orchestration side rather than duplicating an entire AI-employee
platform inside RoboReady.

---

## 1. The Umbrella: RoboReady

RoboReady = the autonomous-world data and discovery company. It should
ultimately know about: robots, robot manufacturers, robot operators, robot
rentals, autonomous vehicles, robotaxis, cybercabs, air taxis, vertiports, robot
parking, robot charging, autonomous-ready properties, hotels, restaurants,
campuses, hospitals, warehouses, infrastructure, service areas, companies,
locations, availability, partnerships, media, news/events,
regulations/requirements, commercial deployments.

**But don't make the public website a giant database on day one. Build the data
engine underneath it.**

---

## 2. The Intelligence Layer: RoboSearch

The most important restructuring. **RoboSearch by RoboReady** — tagline:
*"Search the autonomous world."*

RoboSearch isn't merely a search box. It is: **data model + AI research +
curation + entity resolution + semantic search + natural-language interface.**

```
                ROBOREADY
                     │
          ┌──────────┴──────────┐
          │                     │
      ROBOSEARCH            ROBOARRIVAL
          │                     │
     Intelligence          Applications
          │                     │
    ┌─────┼─────┐       ┌──────┼──────┐
    │     │     │       │      │      │
  Data   AI   Search  Hotels Properties Mobility
```

And eventually:

```
                   ROBOSEARCH
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   RoboReady.com    RoboArrival    Public API
        │              │              │
     Consumer        Travel/       Enterprise
     discovery       property       data
```

---

## 3. RoboArrival

Make RoboArrival the first flagship application of RoboSearch. Concept: *"Where
does the autonomous world arrive?"* A person shouldn't have to understand
robotics — they might simply ask:

- "Which hotels can accommodate autonomous transportation?"
- "Where can my robot be delivered?"
- "Find a hotel with EV charging, robot delivery access and autonomous pickup."

RoboArrival converts the underlying RoboSearch data into arrival/location
intelligence. It could cover: hotels, airports, vertiports, robotaxi pickup, air
taxi arrival, autonomous vehicle drop-off, robot delivery, robot parking, robot
charging, ADA/accessibility, loading zones, property amenities, autonomous
readiness.

---

## 4. StaffGPT Becomes the Workforce

Don't make StaffGPT and RoboReady compete — operate them at different levels.

```
                StaffGPT
              AI Workforce
                   │
                   ▼
             RoboSearch
        Intelligence Engine
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    RoboReady  RoboArrival   API
```

StaffGPT describes its employees as having defined roles, missions, rules,
workflows, deliverables and success metrics — which maps almost perfectly to
what RoboSearch needs.

---

## 5. The RoboSearch AI Workforce

Instead of one giant "RoboReady AI," create specialized workers:

- **RoboScout** — finds new entities ("Find robots announced or deployed in the last 30 days.").
- **RoboResearcher** — investigates the entity ("What does this robot do?").
- **RoboExtractor** — turns unstructured information into structured fields.
- **RoboVerifier** — checks whether information is supported by sources.
- **RoboResolver** — decides whether "Pudu BellaBot" and "BellaBot by PUDU" are the same entity.
- **RoboUpdater** — detects changes ("This company's robot rental page changed.").
- **RoboLocator** — connects entities to geography.
- **RoboArrival Analyst** — analyzes properties for autonomous arrival capability.
- **RoboContent** — creates profile drafts, articles and guides.
- **RoboSearch Analyst** — improves search results and identifies unanswered searches.
- **RoboSales** — finds businesses that could benefit from a RoboReady listing.
- **RoboPartner** — identifies manufacturers/operators/infrastructure companies for partnerships.

---

## 6. The Most Important Asset: The Data Model

Put the majority of engineering effort here. Don't start with pages — start
with entities and relationships:

```
COMPANY
   ├── manufactures → ROBOT
   ├── operates → ROBOT
   ├── rents → ROBOT
   └── owns → PROPERTY

ROBOT
   ├── operates_at → LOCATION
   ├── rented_by → COMPANY
   ├── manufactured_by → COMPANY
   └── compatible_with → INFRASTRUCTURE

PROPERTY
   ├── located_at → LOCATION
   ├── has → AMENITY
   ├── supports → ROBOT
   ├── supports → AUTONOMOUS_VEHICLE
   └── near → VERTIPORT

AUTONOMOUS_VEHICLE
   ├── operated_by → COMPANY
   ├── operates_in → LOCATION
   └── picks_up_at → PROPERTY
```

That's the beginning of a **RoboGraph** — a strong internal name for the
underlying relationship/data layer.

---

## 7. Every Piece of Information Needs Provenance

Don't simply store "Hotel has EV charging." Store:

```
Claim:        Hotel has EV charging
Source:       hotel website
Source URL:   ...
Discovered:   2026-09-19
Last checked: 2026-09-19
Confidence:   High
Verification: Unverified / Business verified / RoboReady verified
Evidence:     ...
Expires/recheck: ...
```

Now RoboSearch becomes a living knowledge base rather than an AI-generated
directory — a potential major competitive advantage.

---

## 8. AI Shouldn't "Make Up the Database"

Fundamental rule: **AI may propose. Evidence establishes.**

```
AI discovers → AI extracts → AI proposes → Source attached
→ Confidence assigned → Verification → Database → Search
```

---

## 9. Natural-Language Search Is the Interface

The user doesn't need to know the schema. "Find a hotel in Las Vegas that can
handle robot delivery and has EV charging." becomes:

```json
{ "property_type": "hotel", "location": "Las Vegas", "robot_delivery": true, "ev_charging": true }
```

"I need a robot for warehouse security." becomes: `category = security,
environment = warehouse, purpose = autonomous patrol, commercial = true`.

---

## 10. RoboArrival Is the First Vertical

Don't launch 15 verticals simultaneously. Start with **RoboArrival** — *"Know
what can arrive, where it can arrive, and what the location is ready for."*

Example profile:

```
The Grand Hotel — RoboArrival Profile
● Robot delivery: Supported
● Robot parking: Available
● EV charging: 8 spaces
● Autonomous pickup: Property reported
● ADA entrance: Verified
● Loading zone: Yes
● Air taxi/vertiport proximity: 2.4 miles
● Robot charging: Unknown
● Fleet integration: Unknown
```

Then a **RoboArrival Readiness** structured assessment — *not* a government
certification.

---

## 11. Then Expand Outward

Once RoboArrival works: **RoboRent** (find/rent a robot), **RoboFleet**
(discover autonomous fleets/operators), **RoboTaxi** (discover autonomous
transportation), **RoboAir** (air taxi/vertiport intelligence), **RoboProperty**
(make properties autonomous-ready), **RoboData** (sell the dataset/API). All use
the same RoboSearch engine.

---

## 12. What Lives on RoboReady.net

Make RoboReady.net the modular shell:

```
roboready.net/
├── /search
├── /robots
├── /companies
├── /properties
├── /locations
├── /robot-rental
├── /robotaxi
├── /air-taxi
├── /robot-parking
├── /autonomous-ready
├── /roboarrival
├── /robosearch
├── /blog
└── /business
```

Internally: RoboReady → { RoboSearch module, RoboArrival module, Directory
module, Marketplace module, Business module, Content module }.

---

## 13. Design RoboSearch So It Can Escape

Build it as though it might become its own company, even while it initially
lives inside RoboReady:

```
RoboReady UI → RoboSearch API → RoboSearch Core
                                 ├── Data model
                                 ├── Search
                                 ├── AI research
                                 ├── Curation
                                 ├── Verification
                                 ├── Entity resolution
                                 └── Knowledge graph
```

RoboReady must not be technically fused to RoboSearch.

---

## 14. The API Boundary Is the Escape Hatch

RoboReady shouldn't directly manipulate the RoboSearch database everywhere:

```
RoboReady → RoboSearch API → RoboSearch services → Database/search index
```

Later:

```
RoboReady ───────┐
RoboArrival ─────┤
Enterprise API ──┼──▶ RoboSearch
Mobile App ──────┘
```

This is how you prevent a future rewrite.

---

## 15. StaffGPT ↔ RoboSearch

Establish a formal interface. StaffGPT sends jobs: `DISCOVER_ENTITY,
RESEARCH_ENTITY, UPDATE_ENTITY, VERIFY_ENTITY, RESOLVE_DUPLICATE,
ANALYZE_PROPERTY, CREATE_CONTENT, FIND_LEADS, ANALYZE_SEARCHES`.

RoboSearch returns: `job_id, status, entities, claims, sources, confidence,
recommended_actions`.

StaffGPT's cloud/local/hybrid deployment could matter later if RoboSearch
handles proprietary datasets or enterprise customer data.

---

## 16. Human Staff Become Supervisors

Not "AI replaces employees" but "one human supervises an AI department." Example
— a human Data Director controls data standards, verification rules, taxonomy,
and quality, overseeing an AI team (researchers, curators, verifiers, locators,
content agents) and handling exceptions.

---

## 17. Build an AI Operations Center (RoboOps)

Inside RoboReady admin, show live counts: entities, new discoveries, awaiting
verification, changed records, duplicate candidates, failed sources, AI research
jobs, human reviews. Then answer *"What happened today?"* in natural language —
now you have an AI-operated data company.

---

## 18. Monetization Follows the Architecture

Don't monetize everything immediately. Tiers: **Free** (public RoboSearch),
**Business** (claim profile), **Pro** (enhanced profile + leads + analytics),
**Verified** (RoboReady assessment + verification), **Marketplace** (robot
rental/service leads), **Sponsored** (featured placement), **API** (RoboSearch
data API), **Enterprise** (custom data feeds).

Eventually: *"RoboSearch API — Autonomous World Intelligence as a Service"* —
potentially more valuable than advertising.

---

## 19. The Flywheel

```
More data → Better search → More users → More searches
→ Learn what people want → More businesses claim profiles
→ More verified data → Better recommendations → More transactions → More data
```

StaffGPT accelerates the first part: `StaffGPT → More research → More entities → Better RoboSearch`.

---

## 20. Development Roadmap

- **Phase 0 — Architecture:** don't build features. Inspect RoboReady (stack,
  database, routes, auth, deployment, APIs, reusable components, current search,
  content system). Then design the RoboSearch Core API before touching major UI.
- **Phase 1 — RoboGraph:** build the data model — Company, Robot, Autonomous
  Vehicle, Property, Location, Operator, Service, Infrastructure, Amenity,
  Source, Claim, Media — and relationships.
- **Phase 2 — Research Engine:** connect StaffGPT. Build Scout, Researcher,
  Extractor, Resolver, Verifier, Updater. Goal: a continuously improving
  database, not thousands of pages.
- **Phase 3 — RoboSearch:** natural-language search, filters, semantic search,
  entity search, location search, source-aware results.
- **Phase 4 — RoboArrival:** first vertical — hotels, properties, airports,
  transportation, parking, charging, robot access, autonomous pickup,
  accessibility.
- **Phase 5 — Marketplace:** business accounts, claims, leads, rental requests,
  partner requests, sponsored listings.
- **Phase 6 — RoboSearch API:** expose the engine to hotel groups, developers,
  robot manufacturers, autonomous fleets, travel companies, logistics companies,
  mapping companies, insurers, consultants, municipalities, enterprise AI systems.

---

## 21. The "Detach" Test

From day one: *If RoboSearch disappeared from RoboReady tomorrow, RoboReady
should still function. If RoboSearch became an independent company tomorrow, it
should still function.*

- **RoboReady owns:** website, customer accounts, marketplace, branding,
  consumer UX, business listings, transactions.
- **RoboSearch owns:** entities, relationships, sources, claims, research,
  verification, semantic index, knowledge graph, AI research jobs, search API.
- **StaffGPT owns/operates:** AI employee execution, orchestration, task
  management, specialized AI workforce, potentially local/hybrid compute.

---

## 22. The Ultimate Vision

*RoboReady builds the intelligence infrastructure for the autonomous world.*

Products: **RoboSearch** (search the autonomous world), **RoboArrival** (know
what can arrive — and where), **RoboRent** (find and rent robots), **RoboReady**
(make your property ready for autonomous mobility), **RoboData** (autonomous-world
data for businesses and developers), **StaffGPT** (the AI workforce that
researches, maintains and operates the system).

The critical insight: **RoboSearch should be built as infrastructure, not as
another website feature** — so you can start small inside RoboReady, prove the
concept with RoboArrival, and later spin RoboSearch out without rebuilding the
underlying technology.

---

## What to Hand the Coding Agent Next

Not the giant original feature list — a **RoboSearch Architecture & Migration
PRD**, instructing it to:

1. Inspect RoboReady.
2. Map the existing architecture.
3. Design the independent RoboSearch module.
4. Design the canonical data model.
5. Design the API boundary.
6. Design the StaffGPT job interface.
7. Build the database layer.
8. Build the first research/curation pipeline.
9. Build natural-language search.
10. Add RoboArrival as the first consumer of that engine.
11. Keep every component detachable.
