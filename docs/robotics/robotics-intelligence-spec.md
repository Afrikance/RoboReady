# RoboReady Robotics Intelligence — Product, Architecture, Data, UX, API & Integration Specification

> **Status: reference spec for a FUTURE build phase. Not yet implemented.**
> Placed in docs at the product owner's request. Nothing in this document has been
> built. See `docs/robotics/README.md` for how it relates to the current RoboReady
> codebase and the recommended first milestone.

## Document purpose

Build and integrate a new **Robotics Intelligence / Robotics Marketplace** module into
the existing RoboReady platform.

The module must let RoboReady maintain a continuously updated database of:

- Humanoid robot manufacturers
- Humanoid robot models
- Other commercial work robots
- U.S. distributors
- Rental companies
- RaaS providers
- Integrators
- Deployment/service companies
- Robot operators
- Manufacturer partnership programs
- Robot capabilities
- Commercial availability
- Pricing
- Deployment requirements
- Industries served

The module must then connect this data to RoboReady's existing property-readiness
assessment system.

**Ultimate product flow:**

```
Property → Requirements → Readiness → Robot Matching → Vendor Matching → Quote/Demo/Deployment
```

> Do **NOT** build this as a static directory. Build it as a **structured data platform
> and matching engine**.

The important architectural decision: integrate Robotics Intelligence into RoboReady as a
**first-class module**, while keeping the underlying robotics data/API **modular enough to
become a standalone API later**.

---

## 1. Critical first step — inspect the existing RoboReady application

Before writing code:

1. Inspect the entire existing repository.
2. Identify: frontend framework, backend framework, database, ORM, authentication,
   authorization, API architecture, existing AI architecture, existing assessment models,
   existing scoring engine, payment system, PDF/report generation, map/satellite
   functionality, file storage, existing dashboard, existing admin functionality, existing
   background jobs, email infrastructure, deployment infrastructure, environment-variable
   conventions.
3. Identify existing entities/models for: users, organizations, properties, assessments,
   reports, customers, subscriptions/payments.
4. Do **NOT** replace working infrastructure.
5. Extend the current architecture wherever practical.
6. Follow the existing project's naming conventions and coding patterns.
7. Do **NOT** introduce a new framework/database/service merely because it is familiar.
8. Do **NOT** duplicate existing functionality.

Before implementation, produce an **architecture assessment** containing: current
architecture, proposed architecture, files/modules that will change, new database
tables/models, new API routes, new frontend routes, dependencies required, migration plan,
risks, rollback strategy.

> Do not begin destructive refactoring.

---

## 2. Product positioning

Add a new primary product area: **Robotics Intelligence**.

Suggested navigation:

```
Dashboard
Properties
Assessments
Robotics Intelligence
   ├── Robots
   ├── Manufacturers
   ├── Distributors
   ├── RaaS & Rental
   ├── Integrators
   ├── Industries
   ├── Compare
   ├── Robot Matcher
   └── Market Intelligence
Reports
Network
Settings
Admin
```

Do not remove the existing property/autonomy product. Robotics Intelligence is an
**additional** product capability.

---

## 3. Core product concept — three layers

- **Layer A — Robotics Intelligence Database:** structured information about robots and companies.
- **Layer B — Property Intelligence:** information about a customer's property and operational requirements.
- **Layer C — Matching Engine:** determine which robots/providers best match the property and use case.

```
                   ROBOREADY
                        |
        +---------------+---------------+
        |                               |
 PROPERTY INTELLIGENCE          ROBOTICS INTELLIGENCE
        |                               |
        |                    +----------+----------+
        |                    |          |          |
   Property             Robots    Manufacturers  Providers
        |                    |          |          |
        +--------------------+----------+----------+
                             |
                      MATCHING ENGINE
                             |
                +------------+------------+
                |            |            |
             Robots      Vendors       Services
                |
          Quote / Demo / Deployment
```

---

## 4. Database architecture

Create a **normalized relational data model**. Do not put all robot information into a
single JSON blob. Use structured tables plus JSON fields only where flexibility is genuinely
required.

Recommended entities:

```
Manufacturer          Provider              RobotAssessmentMatch
RobotModel            ProviderService       CustomerRequirement
RobotVariant          ProviderRobot         Lead
RobotCapability       PartnerProgram        QuoteRequest
RobotIndustry                               SavedRobot
RobotDeployment                             SavedManufacturer
RobotAvailability
RobotPricing
RobotSource
```

Existing RoboReady entities should be reused where possible.

---

## 5. Manufacturer model

**`Manufacturer`** fields:

```
id, name, legal_name, slug, description, country, state_region, city, headquarters,
website_url, official_product_url, logo_url, company_type, founded_year, employee_range,
funding_stage, funding_amount, public_company, parent_company_id, us_presence,
us_headquarters, us_office, us_sales_presence, us_support_presence, commercial_status,
partnership_status, distributor_program, dealer_program, integration_partner_program,
service_partner_program, regional_partner_program, raas_program, rental_program,
api_available, sdk_available, ros_support, contact_url, partnership_url, sales_url,
support_url, last_verified_at, created_at, updated_at
```

`company_type` enum: `STARTUP, PUBLIC_COMPANY, AUTOMAKER, BIG_TECH, RESEARCH_INSTITUTE,
UNIVERSITY, GOVERNMENT, SUPPLIER, ECOSYSTEM, CONGLOMERATE, OTHER`

`commercial_status` enum: `COMMERCIAL, PILOT, PREORDER, PROTOTYPE, RESEARCH, RETIRED,
DEFUNCT, UNKNOWN`

> Do not infer commercial status. Every important status must have a source.

---

## 6. Robot model

**`RobotModel`** fields:

```
id, manufacturer_id, name, slug, model_number, generation, description, robot_category,
form_factor, humanoid, bipedal, wheeled, quadruped, upper_body_humanoid, industrial,
service_robot, warehouse_robot, hospitality_robot, security_robot, healthcare_robot,
retail_robot, home_robot, construction_robot, agriculture_robot, research_robot,
telepresence_robot, general_purpose, commercial_status, target_market, launch_date,
first_public_demo, production_status, country_of_origin, website_url, product_url,
documentation_url, api_url, sdk_url, manual_url, video_url, image_url, last_verified_at,
created_at, updated_at
```

`robot_category`: `HUMANOID, AMR, DELIVERY, SERVICE, INDUSTRIAL, SECURITY, CLEANING,
AGRICULTURAL, QUADRUPED, DRONE, ROBOT_ARM, TELEPRESENCE, ROBOTAXI, OTHER`
— architecture must allow additional categories later.

---

## 7. Robot technical specifications

Separate **`RobotSpecification`** entity:

```
robot_id, height_mm, width_mm, depth_mm, weight_kg, payload_kg, reach_mm,
walking_speed_mps, driving_speed_mps, battery_capacity_wh, runtime_hours,
charging_time_hours, operating_temperature_min, operating_temperature_max, ip_rating,
stairs_capable, elevator_capable, door_capable, ramp_capable, carpet_capable,
outdoor_capable, indoor_capable, rough_terrain_capable, vision_system, lidar, depth_camera,
force_sensors, tactile_sensors, speech, natural_language, teleoperation,
autonomous_navigation, manipulation, gripper_type, number_of_arms, degrees_of_freedom,
compute_platform, connectivity, wifi, cellular, ethernet, charging_method,
power_requirements, notes
```

> Unknown values must remain NULL/UNKNOWN. Never invent specifications.

---

## 8. Robot capability system

Normalized capabilities:

```
Capability: id, name, category, description
```

Example capabilities: Walking, Object manipulation, Box handling, Pallet handling, Shelf
picking, Door opening, Elevator operation, Stair climbing, Navigation, Indoor navigation,
Outdoor navigation, Speech, Customer interaction, Cleaning, Security patrol, Inspection,
Delivery, Room service, Warehouse picking, Loading/unloading, Manufacturing, Machine
tending, Teleoperation, Remote assistance.

Join through **`RobotCapability`**: `robot_id, capability_id, level, evidence_source_id`

`level`: `DEMO, PILOT, COMMERCIAL, PRODUCTION, UNKNOWN`

---

## 9. Industry system

Create `Industry`, `RobotIndustry`, `ManufacturerIndustry`.

Initial industries: Warehousing, Logistics, Manufacturing, Automotive, Healthcare,
Hospitals, Senior Living, Hospitality, Hotels, Restaurants, Retail, Grocery, Construction,
Agriculture, Security, Facilities Management, Data Centers, Airports, Ports, Education,
Government, Defense, Events, Entertainment, Residential, Property Management, Cleaning,
Food Processing, Pharmaceutical, Laboratory, Oil & Gas, Utilities, Energy.

---

## 10. Commercial acquisition model

A robot may be sold, leased, rented, offered through RaaS, available for pilot,
enterprise-only, or unavailable.

**`RobotCommercialOffering`** fields:

```
robot_id, offering_type, availability, minimum_order_quantity, purchase_price,
monthly_price, annual_price, rental_daily_price, rental_weekly_price, rental_monthly_price,
raas_hourly_price, raas_daily_price, raas_monthly_price, lease_term_months,
deposit_required, setup_fee, maintenance_included, operator_included, training_included,
shipping_included, support_included, us_available, us_states, can_ship_to_us,
enterprise_only, pilot_only, contact_required, source_id, last_verified_at
```

`offering_type`: `PURCHASE, LEASE, RENTAL, RAAS, PILOT, DEMO, CUSTOM`

> Never estimate a price and present it as a manufacturer price. If estimated, store
> `price_type = ESTIMATE` and clearly display it as an estimate.

---

## 11. Source / evidence system (mandatory)

Every important fact needs provenance.

**`Source`** fields: `id, source_type, url, title, publisher, published_at, accessed_at,
source_hash, notes`

`source_type`: `OFFICIAL_WEBSITE, OFFICIAL_PRODUCT_PAGE, OFFICIAL_DOCUMENTATION,
OFFICIAL_PRESS_RELEASE, OFFICIAL_PARTNER_PAGE, OFFICIAL_STORE, GOVERNMENT, ACADEMIC, NEWS,
INDUSTRY_DATABASE, SECONDARY, USER_SUBMITTED`

**`EntityEvidence`** fields: `id, entity_type, entity_id, source_id, field_name, claim,
confidence, verified_at`

`confidence`: `HIGH, MEDIUM, LOW, UNVERIFIED`

> **Critical rule:** never allow the AI to silently convert an inference into a database fact.

---

## 12. Master data import

Initial import should include:

- **Universe A** — 109-maker broad humanoid dataset.
- **Universe B** — 108-company manufacturer dataset.
- **Universe C** — 45 active-company dataset.

Do NOT blindly duplicate companies. Create **entity-resolution logic**. Example: `Unitree`
/ `Unitree Robotics` / `Unitree Robotics Co., Ltd.` must resolve to one manufacturer;
`UBTECH` / `UBTECH Robotics` / `UBTECH Robotics Corp.` must resolve to one.

Store aliases — **`ManufacturerAlias`**: `manufacturer_id, alias, source`

---

## 13. Do not claim "109 manufacturers" without qualification

The UI must distinguish:

- Broad robotics/humanoid ecosystem — "109 organizations tracked"
- Commercial humanoid manufacturers — "X commercially active manufacturers"
- U.S.-available robots — "X robots currently identified as available in the U.S."

> The numbers must be **calculated from database status**, not hard-coded.

---

## 14. Robot directory — `/robots`

Features: search, filters, sort, compare, save, share, request information.

Filters: Humanoid, Bipedal, Warehouse, Manufacturing, Hospitality, Healthcare, Security,
RaaS, Rental, Purchase, Lease, U.S. Available, Pilot, Commercial, Price, Payload, Runtime,
Speed, Industry, Manufacturer.

Cards show: robot image, robot name, manufacturer, category, commercial status, U.S.
availability, acquisition options, primary industries, starting price if verified, last
verified.

---

## 15. Manufacturer directory — `/manufacturers`

Manufacturer cards: logo, name, country, company type, number of robots, commercial robots,
U.S. availability, partner program, distributor program, RaaS, rental, industries.

---

## 16. Manufacturer detail page — e.g. `/manufacturers/unitree-robotics`

Sections: Overview, Robots, U.S. Availability, Purchase, Rental, RaaS, Partner Program,
Distributor Program, Industries, Technical Support, Documentation, Evidence, Contact /
Request Partnership. Display a visible `Last verified: <date>` where appropriate.

---

## 17. Robot detail page — e.g. `/robots/unitree-g1`

Sections: Overview, Specifications, Capabilities, Industries, Commercial Availability,
Purchase / Rental / RaaS, U.S. Availability, Infrastructure Requirements, Integration,
Safety, Documentation, Evidence, Similar Robots, Compare, Request Demo, Request Quote.

---

## 18. Property → robot matching engine (most important feature)

Extend the **existing** RoboReady assessment model. RoboReady already assesses: access,
curb frontage, parking, power, site layout, robotaxi, humanoids, delivery rovers, drones,
EV charging — and produces a 0–100 score.

> Do not create a separate property model. Add robot-specific requirements to the existing property.

---

## 19. Property robot requirements

**`PropertyRobotRequirement`** fields:

```
property_id, industry, use_case, indoor_outdoor, floor_count, elevator_available,
stairs_available, door_width, corridor_width, floor_surface, ceiling_height,
charging_available, charging_voltage, network_available, wifi_available, cellular_available,
storage_available, secure_storage, operator_available, teleoperation_allowed, working_hours,
hours_per_day, days_per_week, payload_required, speed_required, runtime_required,
noise_limit, customer_interaction, food_handling, medical_environment, security_requirements,
integration_requirements, existing_software, budget, acquisition_preference
```

---

## 20. Matching algorithm

Create a **deterministic** scoring engine first. Do not allow an LLM to invent the score.

```
MATCH SCORE =
  30% capability fit
  20% physical/site fit
  15% operational fit
  10% infrastructure fit
  10% commercial availability
   5% geographic availability
   5% integration fit
   5% budget fit
```

> Weights must be configurable and stored in the database. Do not hard-code weights
> throughout the frontend.

---

## 21. Hard-fail requirements

Some requirements eliminate a robot rather than merely reduce its score:

- `required_payload > robot_payload` → `NOT_ELIGIBLE`
- `required_outdoor = true AND robot.outdoor_capable = false` → `NOT_ELIGIBLE`
- `US_REQUIRED = true AND robot.us_available = false` → `NOT_ELIGIBLE` **or** `LOW_CONFIDENCE` (configurable)

> Do not allow a high overall score to hide an essential incompatibility.

---

## 22. Match explanation

Every match must explain itself, e.g.:

```
92% Match

Why:
+ Payload requirement met
+ Indoor navigation supported
+ Elevator-compatible
+ 10-hour operational requirement met
+ U.S. availability confirmed

Limitations:
- Requires dedicated charging area
- Manufacturer currently requires enterprise deployment
- Integration with your PMS requires partner support
```

> The explanation is generated from **structured facts**. An LLM can improve wording but
> cannot invent the underlying facts.

---

## 23. Match result types

`BEST_FIT, GOOD_FIT, PARTIAL_FIT, NOT_ELIGIBLE, INSUFFICIENT_DATA`

> Do not describe a robot as "best robot" globally. "Best fit" always means best fit for
> **this property's** stated requirements.

---

## 24. Do not turn the database into a political or subjective ranking system

No subjective manufacturer rankings. Do not display "#1 company", "best/worst manufacturer",
or "top political/controversial company". Use objective filters and requirement-based
matching.

---

## 25. Compare feature

Allow users to select up to 4 robots. Comparison fields: Manufacturer, Robot type, Height,
Weight, Payload, Runtime, Speed, Navigation, Manipulation, Stairs, Elevator, Indoor,
Outdoor, Purchase, Lease, Rental, RaaS, U.S. availability, Industries, API, SDK, ROS,
Support, Warranty, Last verified.

---

## 26. "Find a robot for my business" — guided wizard

1. What industry?
2. What job do you want automated?
3. Where will the robot work?
4. How many hours per day?
5. Payload?
6. Walking or wheeled?
7. Human interaction?
8. Purchase, lease, rental or RaaS?
9. Budget?
10. Location?

Then: requirements summary + eligible robots + provider matches + infrastructure
requirements + request quote.

---

## 27. Provider database

Do not restrict the platform to manufacturers.

**`Provider`** types: `MANUFACTURER, DISTRIBUTOR, DEALER, INTEGRATOR, RAAS, RENTAL, OPERATOR,
MAINTENANCE, REPAIR, FINANCING, TRAINING, CONSULTING, DEPLOYMENT`

Fields:

```
name, website, country, states_served, service_area, industries, robot_brands, services,
purchase, lease, rental, raas, installation, integration, training, maintenance, repair,
operator, financing, contact_url, partner_program, verified, last_verified_at
```

---

## 28. Provider search — `/providers`

Filters: Location, Service, Robot brand, Industry, Rental, RaaS, Purchase, Integration,
Maintenance, Operator, Training.

Example: "Find a Unitree deployment partner within 100 miles of Baltimore." →
Provider, Distance, Services, Unitree experience, Rental, Deployment, Maintenance, Contact.

---

## 29. Partnership marketplace — `/partners`

Manufacturers can eventually publish **Seeking:** Distributor, Dealer, Integrator, Service
Partner, Regional Partner, Installation Partner, Repair Partner, RaaS Partner, Sales
Partner.

Providers can publish **We offer:** Sales, Installation, Programming, Maintenance,
Operations, Rental, RaaS, Training.

> This becomes a two-sided network.

---

## 30. Lead generation

Every robot/manufacturer/provider page should have: Request Quote, Request Demo, Request
Rental, Request RaaS, Request Deployment, Contact Manufacturer, Become a Partner.

> Do not expose vendor contact details unnecessarily. Route inquiries through RoboReady.

**`Lead`** fields: `id, organization_id, property_id, robot_id, manufacturer_id,
provider_id, lead_type, source, status, notes, created_at, updated_at, assigned_to`

`lead_type`: `QUOTE, DEMO, RENTAL, RAAS, PURCHASE, LEASE, DEPLOYMENT, PARTNERSHIP, SERVICE`

---

## 31. CRM pipeline (robotics)

`NEW → QUALIFIED → MATCHED → VENDOR_CONTACTED → DEMO_SCHEDULED → QUOTE_RECEIVED → PILOT →
NEGOTIATION → CONTRACT → DEPLOYED → LOST`

---

## 32. Admin system — `/admin/robotics`

Dashboard: Manufacturers, Robots, Providers, Sources, Unverified claims, Expired data, New
submissions, Partnership programs, Pricing changes, Availability changes.

Admin can: add/edit manufacturer, merge duplicates, add robot, edit specifications, attach
sources, verify information, mark stale, archive robot, approve provider, approve
manufacturer, review user-submitted information.

---

## 33. Data freshness

Every important record needs `last_verified_at, verification_status, verification_source`.

Stale thresholds (configurable): Pricing 30 days, Availability 30 days, Partnership status
60 days, Technical specs 180 days, Company description 365 days.

Show "Verified 12 days ago" or "Verification overdue".

> Do not silently present stale data as current.

---

## 34. Automated data refresh

Build the architecture for future crawlers. Do NOT immediately build an uncontrolled web
scraper.

**`DataRefreshJob`**: `source_url, entity_type, entity_id, run_at, status, changed_fields,
review_required`

Pipeline: `Source → Fetch → Parse → Compare → Change detection → Confidence evaluation →
Human review if needed → Publish`

> AI can assist extraction. AI cannot automatically overwrite high-value facts without
> validation rules.

---

## 35. AI research agent (later phase)

Workflow: `Research Agent → Find official source → Extract claim → Attach source → Compare
existing value → Flag change → Admin approval → Publish`

Priority sources: (1) manufacturer official website, (2) official product page, (3) official
documentation, (4) official store, (5) official partner page, (6) government, (7) academic,
(8) reputable industry source, (9) secondary source.

---

## 36. AI rules

The AI must distinguish: `FACT, CLAIM, ESTIMATE, INFERENCE, UNKNOWN`.

- Bad: "Unitree G1 costs $13,500" (from an outdated page).
- Better: "Listed starting price: $X / Source: official store / Verified: DATE".
- If unavailable: "Price not publicly verified."

> Never hallucinate missing values.

---

## 37. Report integration

Extend existing RoboReady reports with a **Robotics Deployment Opportunities** section. Per
property: Current Robotics Readiness, Recommended robot categories, Top compatible robots,
Infrastructure requirements, Estimated deployment complexity, Acquisition options, Potential
vendors, Next steps.

Example:

```
Humanoid Readiness: 81/100
Recommended application: Warehouse box handling
Compatible robots: 1. Robot A — 94% property match  2. Robot B — 89%  3. Robot C — 83%
Required modifications:
- 240V charging circuit
- secure charging/storage
- network coverage in loading zone
- 42-inch clear door opening
```

---

## 38. Do not change the existing RoboReady score without a versioned migration

Do not silently change existing scoring. Create `assessment_version` and `scoring_version`
(e.g. "RoboReady v1", "Robotics Matching v1"). Existing reports must remain reproducible.

---

## 39. New robotics readiness score

Create a **separate** score: **Humanoid Readiness Score**. Do not automatically merge it
into the existing master score.

Dimensions (each 0–100): Physical Environment, Infrastructure, Connectivity, Power, Safety,
Operational Fit, Human Interaction, Integration, Deployment Support, Commercial
Availability. Humanoid Readiness = weighted score; weights configurable.

---

## 40. User experience

The module should feel native to RoboReady. Use existing navigation, colors, cards,
typography, buttons, dashboard patterns, authentication, report design.

> Do not create a visually unrelated "robot directory."

---

## 41. SEO

Indexable pages: `/robots`, `/robots/[slug]`, `/manufacturers`, `/manufacturers/[slug]`,
`/providers`, `/providers/[slug]`, `/industries/[slug]`. Generate metadata: title,
description, canonical, OpenGraph, structured data.

> Do not generate thousands of thin pages. Only index pages with sufficient verified
> information.

---

## 42. API

Design an internal REST or GraphQL API consistent with the existing application.

```
GET  /api/robots            GET  /api/manufacturers        GET  /api/providers
GET  /api/robots/:id        GET  /api/manufacturers/:id    GET  /api/providers/:id
GET  /api/industries        GET  /api/robot-matches        POST /api/robot-matches
POST /api/leads             POST /api/quote-requests       POST /api/demo-requests

Admin:
POST  /api/admin/robots           PATCH /api/admin/robots/:id
POST  /api/admin/manufacturers    PATCH /api/admin/manufacturers/:id
POST  /api/admin/sources          POST  /api/admin/providers
```

Follow existing API authentication patterns.

---

## 43. Search

Use the application's existing search infrastructure if one exists. Search across: robot
name, manufacturer, model, capability, industry, use case, location, provider. Support typo
tolerance (e.g. "unitree g1", "humanoid warehouse", "robot rental maryland", "humanoid
raas").

---

## 44. Filtering

Filtering must happen **server-side** for large datasets. Do not download all 109+ companies
and 180+ robots to the browser. Use pagination, cursor pagination where appropriate,
server-side filtering and sorting.

---

## 45. Performance targets

- Directory initial load < 2 s
- Robot detail < 1.5 s
- Manufacturer detail < 1.5 s
- Search response < 500 ms
- Matching calculation < 2 s

Cache public robot/manufacturer data. Do not cache private customer data incorrectly.

---

## 46. Security

Follow existing RoboReady authentication and authorization.

Roles: `SUPER_ADMIN, ADMIN, EDITOR, RESEARCHER, PARTNER, CUSTOMER, VIEWER`

Only authorized staff can edit master robotics data. Manufacturers/providers can edit only
their own claimed profiles. User-submitted information enters moderation.

---

## 47. Claim / profile verification

Allow a manufacturer to "Claim this profile".

Flow: `Request → Company email/domain validation → Admin review → Verified organization →
Claimed profile`

Then the manufacturer can submit corrections, pricing, new robots, partnership
opportunities, U.S. availability, distributor information — but submissions remain
unpublished until approved, unless a controlled workflow is implemented.

---

## 48. Analytics

Track: `robot_views, manufacturer_views, provider_views, compare_started, compare_completed,
match_started, match_completed, quote_requested, demo_requested, rental_requested,
raas_requested, partner_request, profile_claim, saved_robot, saved_manufacturer`.

Internal dashboard: Most viewed robots, Most searched manufacturers, Most requested
industries, Most requested robot categories, Most requested providers, Match conversion,
Quote conversion, Lead conversion.

---

## 49. Business model support

Architecture should support future: **Free** (robot discovery), **Pro** (Robotics
Intelligence subscription), **Enterprise** (portfolio-level robot procurement),
**Marketplace** (vendor lead fees), **Deployment** (RoboReady-managed implementation),
**RaaS** (recurring revenue).

> Do not implement all monetization now. Make the architecture capable of supporting it.

---

## 50. Phased implementation

- **Phase 0 — Architecture audit.** No UI changes. Deliver: architecture report, database
  proposal, API proposal, migration plan, dependency report.
- **Phase 1 — Data foundation.** Build Manufacturer, RobotModel, RobotSpecification,
  Capability, Industry, Provider, Source, Evidence, Availability, Pricing. Import initial
  dataset. Build admin CRUD.
- **Phase 2 — Public directory.** `/robots`, `/robots/[slug]`, `/manufacturers`,
  `/manufacturers/[slug]`, `/providers`, `/providers/[slug]`. Add search/filter/compare.
- **Phase 3 — Property integration.** Connect robotics requirements to existing properties.
  Add Humanoid Readiness, robot requirements, use cases, infrastructure requirements.
- **Phase 4 — Matching engine.** Deterministic matching. Find robots, find providers,
  explain match.
- **Phase 5 — Leads.** Quote, Demo, Rental, RaaS, Deployment, Partnership. Integrate with
  existing customer/CRM infrastructure if available.
- **Phase 6 — Reports.** Add robotics recommendations to RoboReady reports.
- **Phase 7 — Data intelligence.** Source verification, stale detection, research queue,
  AI-assisted extraction, change detection.
- **Phase 8 — Marketplace.** Vendor accounts, claimed profiles, manufacturer portal,
  partner marketplace, lead routing, quote management.

---

## 51. Testing requirements

- **Database:** migrations, relationships, uniqueness, foreign keys, soft deletion.
- **Matching:** payload mismatch, indoor/outdoor mismatch, runtime mismatch, budget
  mismatch, U.S. availability, unknown data, multiple matches, no matches.
- **Security:** customer cannot edit robot data; provider cannot edit another provider;
  manufacturer cannot edit another manufacturer; unauthenticated user cannot access admin.
- **API:** pagination, filters, sorting, authentication, authorization, invalid IDs,
  malformed requests.
- **UI:** directory, search, filters, comparison, matching wizard, quote flow.

---

## 52. Data quality tests

Automated checks: robot must have manufacturer; manufacturer must have name; robot slug
unique; manufacturer slug unique; prices require source; availability requires source;
technical specification changes require source; archived robots cannot appear as currently
available; defunct manufacturers cannot appear as current commercial suppliers.

Also detect: duplicate manufacturer, duplicate robot, conflicting price, conflicting
availability, stale source, missing source.

---

## 53. Database indexes

At minimum:

```
Manufacturer.slug, Manufacturer.country, Manufacturer.commercial_status
RobotModel.slug, RobotModel.manufacturer_id, RobotModel.robot_category, RobotModel.commercial_status
RobotCommercialOffering.robot_id, RobotCommercialOffering.us_available, RobotCommercialOffering.offering_type
Provider.slug, Provider.provider_type
Source.url, Source.source_type
RobotCapability.robot_id, RobotIndustry.robot_id
```

Add full-text/search indexes according to the actual database technology discovered during
the architecture audit.

---

## 54. Data import requirement

Do not manually type the entire dataset into application code. Create an import format
(CSV or JSON), e.g.:

```json
{
  "manufacturer": "Example Robotics",
  "country": "USA",
  "website": "https://example.com",
  "commercial_status": "COMMERCIAL",
  "robots": [
    { "name": "Example H1", "category": "HUMANOID", "commercial_status": "PILOT" }
  ]
}
```

> Import must be **idempotent** — running it twice must not create duplicates.

---

## 55. Data versioning

**`DatasetVersion`**: `id, name, version, source, imported_at, record_count, checksum`

Examples: "Humanoid Observer — September 2026", "Humanoid Index — September 2026",
"RoboReady Verified — September 2026".

> Never destroy previous source data during imports.

---

## 56. Admin import flow

`Upload CSV/JSON → Validate → Preview → Duplicate detection → Conflict detection → Approve →
Import → Report`

Import report example:

```
Records read: 109
New: 73
Updated: 28
Duplicates: 5
Conflicts: 3
Rejected: 0
```

---

## 57. Public data disclaimers

Every public robotics page should make clear that: specifications can change; availability
varies by geography; pricing may change; commercial status is based on available evidence;
users should confirm final specifications with the vendor; RoboReady does not guarantee
vendor availability unless explicitly stated; match scores are based on supplied
requirements/data. Avoid legal overstatement.

---

## 58. Do not build fake "live" data

If the system does not have a live vendor API, do **not** display "Live inventory", "Live
price", or "Available today". Instead display: "Last verified", "Manufacturer-listed",
"Contact manufacturer", "Availability requires confirmation".

---

## 59. Mobile

All directory and matching interfaces must work on mobile. Mobile priority: Search, Filters,
Robot cards, Match score, Quote button, Save, Compare. Do not require desktop-only tables.

---

## 60. Future API product

The underlying robotics database should eventually be accessible through `api.roboready.net`.

Potential future endpoints: `GET /v1/robots`, `GET /v1/manufacturers`, `GET /v1/providers`,
`GET /v1/capabilities`, `GET /v1/industries`, `POST /v1/match`.

> Do not deploy a public API in phase 1 unless required. Design the internal architecture so
> this can happen later without rewriting the database.

---

## 61. Recommended frontend information architecture

```
/robotics
    /robots            /robots/[slug]
    /manufacturers     /manufacturers/[slug]
    /providers         /providers/[slug]
    /compare
    /matcher
    /industries        /industries/[slug]

Authenticated:
/dashboard/robotics
/dashboard/robotics/saved
/dashboard/robotics/matches
/dashboard/robotics/leads

Admin:
/admin/robotics
/admin/robotics/robots
/admin/robotics/manufacturers
/admin/robotics/providers
/admin/robotics/sources
/admin/robotics/research
/admin/robotics/imports
```

---

## 62. Existing RoboReady integration (reuse, don't duplicate)

- Do not create a second property system — use existing property records.
- Do not create a second customer/account system — use existing users/organizations.
- Do not create a second payment system — use the existing payment system.
- Do not create a second report engine — extend the existing report engine.
- Do not create a second authentication system — use existing authentication.
- Do not create a second dashboard — add Robotics Intelligence to the existing dashboard.

---

## 63. Design principle

```
ONE CUSTOMER · ONE ORGANIZATION · ONE PROPERTY · ONE ASSESSMENT · ONE REPORT
                                +
MANY ROBOTS · MANY MANUFACTURERS · MANY PROVIDERS · MANY MATCHES · MANY LEADS
```

A property can be evaluated against many robots. A robot can match many properties. A
manufacturer can have many robots. A provider can support many robots.

---

## 64. MVP definition

MVP is complete when an authenticated RoboReady user can:

1. Open Robotics Intelligence.
2. Search the robot database.
3. Search manufacturers.
4. Filter robots.
5. View a robot.
6. View technical specifications.
7. See commercial availability.
8. See evidence/source dates.
9. Compare robots.
10. Select an existing RoboReady property.
11. Define a robotics use case.
12. Run a robot match.
13. Receive objective compatibility results.
14. See why each robot matched.
15. See infrastructure requirements.
16. Request a quote/demo/deployment.
17. Have that request become a RoboReady lead.
18. View the result in their dashboard.

Admin must be able to: add/edit manufacturers; add/edit robots; add/edit providers; add
sources; verify claims; import datasets; resolve duplicates; mark data stale; view leads;
view matching analytics.

---

## 65. Success metrics

Track: Robots indexed, Manufacturers indexed, Verified records, U.S.-available robots,
Commercial robots, Providers indexed, Properties assessed, Properties matched, Match
completion rate, Quote requests, Demo requests, Deployment requests, Partner applications,
Vendor conversion, Customer conversion.

**Primary product KPI:** percentage of assessed properties that generate a qualified
robotics opportunity.

---

## 66. Final architectural requirement

```
ROBOREADY APPLICATION
        |
        +-- Existing Property Intelligence
        +-- Existing Readiness Engine
        +-- Existing Reporting
        +-- ROBOTICS INTELLIGENCE MODULE
               +-- Robotics Database
               +-- Manufacturer Database
               +-- Provider Database
               +-- Evidence System
               +-- Matching Engine
               +-- Lead Engine
               +-- Admin/Data Operations
```

The robotics module should have clear boundaries. Do not make the entire application
dependent on robotics functionality. The underlying robotics data layer should be reusable
independently later.

---

## 67. Coding agent execution instructions

Work in this order:

1. Inspect repository.
2. Report existing architecture.
3. Map existing models/routes/components.
4. Produce migration plan.
5. Wait for approval if destructive changes are required.
6. Implement database foundation.
7. Implement admin data management.
8. Import initial dataset.
9. Implement public directory.
10. Implement property integration.
11. Implement matching engine.
12. Implement lead/quote flow.
13. Implement reports.
14. Implement tests.
15. Run lint/typecheck/tests/build.
16. Perform security review.
17. Perform UX review.
18. Provide deployment/migration instructions.

At the end of each phase, report: Completed, Files changed, Database changes, API changes,
Tests, Known issues, Next phase.

> Do not claim a feature is complete if it is mocked, hard-coded, or not connected to the
> database.

---

## 68. Most important product rule

> The database is **not** the product. The product is: **RoboReady tells a commercial
> property what robots it can realistically deploy, what infrastructure it needs, who can
> supply/deploy them, and what to do next.** The robotics database is the intelligence layer
> that makes that possible. Build toward that outcome rather than building a generic robot
> directory.

### One architectural change beyond the earlier concept

Do **not** immediately import "109 manufacturers + 180 robots" and call the job finished.
The first milestone should be the **data model + evidence/provenance system**:

- architecture report, database proposal, API proposal, migration plan, dependency report
- Manufacturer, RobotModel, RobotSpecification, Capability, Industry, Provider, Source,
  Evidence, Availability, Pricing

This matters because the broad 109-company dataset mixes startups, universities, research
institutes, automakers, big tech, suppliers and ecosystem organizations. Without a strong
schema, RoboReady will quickly end up with misleading records — e.g. a research prototype
appearing beside a commercially orderable humanoid.

The existing RoboReady site already has the right architectural anchor: **property → AI
assessment → infrastructure plan → client report.** The robotics module should plug into
that workflow rather than becoming a separate directory.

### Recommended end-state

```
                        ROBOREADY
                            │
             ┌──────────────┴──────────────┐
             │                             │
       PROPERTY DATA                 ROBOT DATA
             │                             │
       Site requirements          109+ organizations
       Building attributes        180+ robot records
       Infrastructure             Manufacturers
       Use cases                  Distributors
             │                     RaaS / Rental
             │                     Integrators
             └──────────────┬──────────────┘
                            │
                    MATCHING ENGINE
                            │
             ┌──────────────┼──────────────┐
             │              │              │
          ROBOTS         PROVIDERS   INFRASTRUCTURE
             │              │              │
             └──────────────┼──────────────┘
                            │
                     QUALIFIED LEAD
                            │
                 Quote / Demo / RaaS
                            │
                      DEPLOYMENT
```

This preserves the existing RoboReady pricing/reporting model rather than forcing a second
business around the database. The current site already supports **$499, $2,500, $7,500 and
$15,000** assessment tiers, plus ongoing-care positioning.

If the coding agent has access to the actual RoboReady repository, the next step is **Phase
0 only:** inspect the codebase and return the exact architecture/model/file map before
touching product code.
