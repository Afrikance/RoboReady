# RoboReady · RoboSearch · RoboArrival — Master Build Instruction

> **Status:** Reference specification for **future implementation**. Not yet implemented.
> Source: "RoboReady RoboSearch RoboArrival Model Prompt" (provided by the product owner).
> This is the master build instruction for evolving RoboReady into a modular
> autonomous-world intelligence platform. See the companion narrative in
> [`robosearch-staffgpt-roboarrival-strategy.md`](./robosearch-staffgpt-roboarrival-strategy.md).

---

## Mission

Transform the existing **RoboReady.net** application into the foundation for an
AI-powered autonomous-world intelligence platform.

The architecture must support:

- RoboReady
- RoboSearch
- RoboArrival
- StaffGPT-powered AI research/curation
- autonomous-world data
- natural-language search
- business/property directories
- future marketplaces
- future B2B APIs
- eventual independent deployment of RoboSearch

**The most important architectural requirement:** RoboSearch must begin as a
modular subsystem of RoboReady but be capable of becoming an independent
product/service later **without rebuilding its core**.

Do not destroy or unnecessarily rewrite the existing RoboReady application.

---

## 1. First: Inspect Before Coding

Before making significant changes, inspect the entire existing RoboReady codebase.
Determine: framework, language, frontend architecture, backend architecture,
database, ORM, authentication, authorization, API structure, routing, existing
search, existing content management, existing admin functionality, existing
business/listing functionality, deployment, environment variables, storage,
image handling, analytics, testing, CI/CD, existing integrations.

Also identify: reusable components, technical debt, duplicate functionality,
existing data models, potential migration risks.

**Do NOT replace an existing technology simply because another might be preferable.
Reuse the current stack wherever practical.**

---

## 2. Create an Architecture Report FIRST

Before implementing the major system, create `/docs/robosearch-architecture.md`
containing:

- **Current Architecture** — what RoboReady currently does.
- **Proposed Architecture** — how RoboSearch fits into RoboReady.
- **Module Boundaries** — clearly separate RoboReady, RoboSearch, RoboArrival, StaffGPT integration.
- **Database Plan** — proposed entities and relationships.
- **API Plan** — the API boundary between RoboReady and RoboSearch.
- **Migration Plan** — how existing RoboReady data can coexist with the new model.
- **Detachment Plan** — how RoboSearch could eventually be extracted into an independent service, repository, deployment, and public API.

Do not perform destructive migrations before documenting them.

---

## 3. Target Architecture

```
               ROBOREADY
                    |
          ---------------------
          |                   |
      ROBOSEARCH          ROBOARRIVAL
          |
   Intelligence Core
          |
-------------------------
|     |      |          |
Data  AI   Search   Knowledge
Model Jobs Engine    Graph
          |
       StaffGPT
          |
  AI Research Workforce
```

The conceptual dependency should be:

`RoboReady → RoboSearch API → RoboSearch Core`

**NOT** `RoboReady → hundreds of direct database queries into RoboSearch internals`.

---

## 4. RoboSearch Must Be Modular

Create a clearly isolated module/service. Suggested conceptual structure
(adapt to the existing framework — the requirement is **logical separation**,
not this exact folder tree):

```
RoboSearch
├── core
├── entities
├── relationships
├── sources
├── claims
├── search
├── research
├── verification
├── entity-resolution
├── locations
├── media
├── jobs
├── api
└── adapters
```

---

## 5. RoboSearch Purpose

RoboSearch is **NOT** merely an AI chatbot. It is a structured, continuously
researched, source-aware intelligence system for the autonomous world.

It should eventually contain knowledge about: robots, robot manufacturers,
robot operators, robot rental companies, autonomous vehicles, robotaxis,
autonomous shuttles, delivery robots, security robots, industrial robots,
air taxis, vertiports, autonomous mobility infrastructure, hotels, properties,
airports, campuses, restaurants, warehouses, hospitals, charging, parking,
pickup/dropoff, accessibility, companies, locations, services, deployments,
partnerships, media.

**Do not attempt to populate everything immediately. Build the infrastructure
that can support it.**

---

## 6. Canonical Data Model

Create a normalized data model. At minimum, support the following entities.

### Company
`id, name, slug, description, company_type, website, contact info (where
appropriate), logo/media, locations, source records, verification status,
created_at, updated_at`.

Types: manufacturer, operator, rental provider, integrator, property owner,
fleet operator, infrastructure provider, service provider, partner, other.

### Robot
`id, name, model, manufacturer, category, description, capabilities,
environment, indoor/outdoor, autonomy info, payload (where applicable),
commercial status, rental status, purchase status, operator, service areas,
media, sources, verification, timestamps`.

Categories (extensible): delivery, security, hospitality, cleaning, warehouse,
logistics, agriculture, construction, healthcare, inspection, retail,
education, entertainment, other.

### Autonomous Vehicle
`vehicle/model, manufacturer, operator, vehicle type, autonomy info,
deployment status, service areas, pickup locations, service hours (if verified),
booking info, sources, verification`.

Examples: robotaxi, autonomous shuttle, autonomous delivery vehicle,
autonomous truck, autonomous passenger vehicle, cybercab, other.
**Do not hard-code specific manufacturers.**

### Property
`name, type, address, coordinates, website, owner/operator, amenities, parking,
charging, loading, pickup/dropoff, robot access, autonomous vehicle access,
ADA/accessibility info, robot parking, robot charging, connectivity, security,
air mobility proximity, media, sources, verification`.

Property types: hotel, apartment, office, hospital, campus, restaurant, retail,
warehouse, airport, venue, residential, other.

### Location
Reusable geographic entity: `address, city, state/province, country, postal
code, latitude, longitude, timezone, geographic hierarchy`.
**Do not duplicate geographic information unnecessarily across every entity.**

### Infrastructure
`EV charging, robot charging, robot parking, autonomous pickup/dropoff, loading
zones, vertiports, landing facilities, other autonomous infrastructure`.

---

## 7. Relationships

The model must support extensible relationships such as:

- Company **manufactures** Robot
- Company **operates** Robot
- Company **rents** Robot
- Company **operates** AutonomousVehicle
- Robot **operates_at** Location
- Property **located_at** Location
- Property **supports** Robot
- Property **supports** AutonomousVehicle
- Property **has** Infrastructure
- Property **near** Vertiport
- Company **operates** Property
- Company **owns** Property

**Do not limit relationships to today's use cases. Make the relationship system extensible.**

---

## 8. Source + Provenance System

This is a critical feature. Every important external fact should be traceable.

**Source entity:** source URL, source type, publisher, discovered_at,
last_checked_at, source status.

**Claim entity** (e.g. "Property X has EV charging"): entity, field/property,
value, source, discovery date, confidence, verification status, reviewer (if
applicable), last verified date.

**Fundamental rule: AI may propose information. Evidence establishes information.
Never allow an AI-generated guess to silently become a verified fact.**

---

## 9. Verification States

Support at minimum: Unknown, AI discovered, Source supported, Business reported,
Business verified, RoboReady reviewed, Needs review, Outdated, Disputed.

Do not call something "certified" unless RoboReady eventually creates an actual
certification process.

---

## 10. AI Research Engine

Create a generic research-job system. Conceptual jobs: `DISCOVER_ENTITY,
RESEARCH_ENTITY, EXTRACT_ENTITY, UPDATE_ENTITY, VERIFY_ENTITY, RESOLVE_DUPLICATE,
LOCATE_ENTITY, ANALYZE_PROPERTY, GENERATE_CONTENT, ANALYZE_SEARCH`.

Every job tracks: `id, type, input, output, status, created_at, completed_at,
errors, sources, confidence, model/provider (if available), estimated/actual AI
cost (where possible), human review status`.

**Design this so AI providers can be changed later. Do not tightly couple the
application to one AI vendor.**

---

## 11. StaffGPT Integration

Use StaffGPT as the AI workforce/orchestration layer where practical. The
integration should be **adapter-based**:

```
ResearchJob → StaffGPT Adapter → AI Employee / Workflow → Research Result
→ RoboSearch Validation → Human Review (if necessary) → RoboSearch Database
```

**Do not make RoboSearch dependent on StaffGPT being available for basic
operation.** If StaffGPT is unavailable: search still works, database still
works, public listings still work, admins can manually create/edit data.

> Implementation note for this repo: RoboReady already has a `StaffGPTAdapter`
> seam (`LocalOrchestrator` on AI Gateway now, real StaffGPT API later). Reuse it.

---

## 12. AI Employee Roles

Design for specialized agents/workflows (add incrementally, not all at once):

- **RoboScout** — discovers new entities.
- **RoboResearcher** — researches an entity.
- **RoboExtractor** — converts unstructured info into structured fields.
- **RoboVerifier** — checks supporting sources.
- **RoboResolver** — identifies duplicate entities.
- **RoboUpdater** — detects changes.
- **RoboLocator** — normalizes geographic info.
- **RoboArrival Analyst** — analyzes property/autonomous-arrival characteristics.
- **RoboContent** — creates draft content.
- **RoboSearch Analyst** — analyzes unanswered or poorly answered searches.

---

## 13. Natural-Language Search

Users can ask questions naturally, e.g.:

- "Find delivery robots available for rental near Baltimore."
- "Find hotels with EV charging and autonomous pickup."
- "Which properties support robot delivery?"
- "Find security robots for a warehouse."
- "Where can autonomous vehicles pick up passengers?"
- "Show hotels near air taxi infrastructure."
- "Find companies that rent hospitality robots."

The system should: (1) interpret the request, (2) extract structured intent,
(3) search the canonical database, (4) apply geographic filtering, (5) rank
results, (6) show evidence/provenance where useful, (7) clearly indicate
uncertainty.

**Do not answer factual database questions purely from an LLM when structured
RoboSearch data is available.**

---

## 14. Search Architecture

Combine (rather than choose only one of):

- **Structured search** — exact filters: category, location, property type,
  rental, capability, charging, parking, availability status.
- **Semantic search** — meaning-based discovery.
- **Natural-language search** — LLM interprets the request and translates it
  into structured/semantic queries.

---

## 15. RoboArrival

Build RoboArrival as the first major application on top of RoboSearch.
Concept: *"Know what can arrive, where it can arrive, and what the location is
ready for."*

Focus initially on: hotels, airports, properties, robot delivery, autonomous
pickup/dropoff, robot parking, robot charging, EV charging, accessibility, air
mobility proximity.

Example query: *"Find hotels that support robot delivery, have EV charging and
are accessible to autonomous pickup."* — retrieved from RoboSearch.

**Do not create a separate duplicate database for RoboArrival.**

---

## 16. RoboArrival Readiness

Create an assessment model. Attributes: autonomous pickup/dropoff, robot
delivery, robot parking, robot charging, EV charging, loading access,
accessibility, connectivity, security, fleet integration, air mobility
proximity. Each supports: yes / no / unknown / needs verification.

**Do not create an arbitrary "score" initially. Build the underlying factual
assessment first.** A scoring system can be added later if there is a defensible
methodology.

> Note: RoboReady already has a 0–100 RoboReady Score. When merging with this
> model, keep the factual per-attribute assessment as the source of truth and
> treat the score as a derived, documented view.

---

## 17. RoboReady Website Integration

Add RoboSearch without disrupting current functionality. Potential routes (only
add those that fit the existing architecture; reuse existing UI components):

`/search, /robots, /companies, /properties, /locations, /autonomous-vehicles,
/robot-rental, /robotaxi, /air-taxi, /robot-parking, /autonomous-ready,
/roboarrival`

---

## 18. Admin / RoboOps

Administrative intelligence dashboard showing: total entities, new entities,
changed entities, records needing review, duplicate candidates, broken sources,
stale records, research jobs, failed jobs, AI costs, searches, unanswered
searches.

Admin actions: approve, reject, merge, edit, verify, invalidate, re-research,
refresh source, inspect provenance.

---

## 19. Business Claims

Eventually allow businesses to: claim a company, claim a robot, claim a
property, update information, upload media, provide evidence, respond to leads.
**Build the data model now so these ownership/claim relationships can exist later.**

---

## 20. Monetization-Ready Architecture

Do not build complex billing yet, but design entities for: free listings, paid
listings, featured listings, verified listings, sponsored results, lead
generation, API subscriptions, enterprise data access.

**Keep monetization separate from core factual data. A business paying for
placement must NOT automatically change factual search ranking or verification.**

---

## 21. Future RoboSearch API

Create internal APIs with clean boundaries so they can eventually become public.
Conceptual endpoints: `/search, /entities, /robots, /companies, /properties,
/locations, /autonomous-vehicles, /sources, /claims, /research`.

Use versioning (e.g. `/api/v1/`). Do not expose sensitive internal fields.

---

## 22. Detachability Requirement (mandatory)

- RoboSearch must not depend on RoboReady-specific UI code.
- RoboSearch must not depend on RoboReady-specific page routes.
- RoboSearch must expose a clean service/API boundary.
- RoboReady should **consume** RoboSearch rather than embedding RoboSearch logic everywhere.

If RoboSearch eventually becomes RoboSearch Inc., the underlying service should
already be structurally capable of moving.

---

## 23. Data Quality

Implement basic safeguards: duplicate detection, source tracking, timestamps,
stale-data detection, confidence, verification, audit history.
**Never silently replace verified information with low-confidence AI information.**

---

## 24. Security

Follow existing RoboReady security practices. Do not expose: private research
data, private business data, internal AI prompts, API credentials, private
StaffGPT information, internal source metadata (when inappropriate). Use
authorization for admin operations. Do not collect unnecessary personal
information.

---

## 25. Performance

Do not make every public search invoke an expensive LLM.

- **Fast path:** structured search + search index + cached semantic results.
- **Slow path:** AI interpretation + complex reasoning + research.

Cache reusable search interpretation where appropriate.

---

## 26. Testing

Add tests for: entity creation, entity updates, duplicate detection, source
provenance, claims, verification, search, natural-language query parsing,
geographic search, permissions, API contracts.

Create fixture/test data for: robots, companies, hotels, autonomous vehicles,
locations.

---

## 27. Implementation Order

1. Inspect RoboReady. Do not rewrite.
2. Create `/docs/robosearch-architecture.md`.
3. Create the canonical data model.
4. Create migrations. Do not destroy existing data.
5. Create RoboSearch service/module boundary.
6. Implement entities: Company, Robot, Autonomous Vehicle, Property, Location, Infrastructure, Source, Claim.
7. Implement provenance and verification.
8. Implement search API.
9. Implement natural-language query interpretation.
10. Implement first StaffGPT research adapter — start with ONE workflow: discover and research a robot/company and propose structured records with sources.
11. Create RoboOps admin review interface.
12. Build RoboArrival on top of RoboSearch.
13. Add public-facing RoboSearch pages.
14. Add business claiming.
15. Add marketplace functionality later.

---

## 28. MVP Definition

- **First milestone (NOT "thousands of robot pages"):** a user can ask
  RoboSearch a natural-language question, the system searches a structured
  autonomous-world database, returns useful results with geographic and factual
  context, and every important fact can be traced to its source.
- **Second milestone:** AI can discover a new entity, research it, propose
  structured data, attach sources, and send it to a human for approval.
- **Third milestone:** RoboArrival uses the same RoboSearch data to answer
  property/autonomous-arrival questions.

---

## 29. What NOT to Build Yet

Do not initially build: full robot rental transactions, complex payments, fleet
control, private Tesla/fleet tracking, autonomous vehicle control, a complicated
advertising platform, massive automated scraping infrastructure, proprietary
hardware integrations, dozens of AI agents, arbitrary scoring systems, mobile
apps, a separate RoboSearch website.

First prove the core: **DATA + RESEARCH + PROVENANCE + SEARCH + ROBOARRIVAL.**

---

## 30. Brand Architecture

- **RoboReady** — the overall platform/company.
- **RoboSearch by RoboReady** — the intelligence/search engine.
- **RoboArrival** — the first vertical application.
- **RoboOps** — internal data/AI operations center.
- **RoboGraph** — internal/possible future name for the relationship/knowledge layer.
- **StaffGPT** — AI workforce/orchestration partner.

Do not create separate domains or applications unless necessary.

---

## 31. Product Principle — The RoboSearch Engine Loop

```
DISCOVER → RESEARCH → EXTRACT → NORMALIZE → RESOLVE → VERIFY
→ STORE → SEARCH → LEARN → DISCOVER AGAIN
```

---

## 32. Long-Term Product

```
                        ROBOREADY
                            |
              ┌─────────────┴─────────────┐
              |                           |
          ROBOSEARCH                  ROBOARRIVAL
              |
       ┌──────┼────────┐
       |      |        |
    RoboGraph Search   AI Research
       |               |
       |           StaffGPT
       |
       ├── Robots
       ├── Companies
       ├── Properties
       ├── Vehicles
       ├── Locations
       ├── Infrastructure
       ├── Services
       └── Sources
```

And eventually:

```
                    ROBOSEARCH API
                          |
        ┌─────────────────┼─────────────────┐
        |                 |                 |
     RoboReady        Enterprise        Partners
        |
    RoboArrival
```

---

## 33. First Task

Do NOT immediately start generating lots of code. First:

1. Inspect the existing RoboReady codebase.
2. Produce the architecture report.
3. Identify the exact existing stack.
4. Identify existing database models.
5. Identify where RoboSearch can be introduced with minimal disruption.
6. Propose the canonical schema.
7. Propose the API boundary.
8. Propose the first migration.
9. Identify risks.
10. Then begin implementation.

When reporting progress, separate: **completed / in progress / blocked /
decisions needed.** Do not claim functionality is complete until it has been
implemented and tested.

The goal is not to build a giant new application beside RoboReady. The goal is
to evolve RoboReady into the first application powered by a modular RoboSearch
intelligence platform. **Build the foundation first.**
