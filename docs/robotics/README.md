# Robotics Intelligence — docs index

Reference specs for a **future** RoboReady module. **Nothing here is built yet.** These
documents were placed in the repo at the product owner's request so a future build phase has
a canonical source of truth.

## Documents

- **`robotics-intelligence-spec.md`** — the full 68-section product/architecture/data/UX/API
  specification. Turns RoboReady into `Property → Requirements → Readiness → Robot Matching →
  Vendor Matching → Quote/Demo/Deployment`. Key non-negotiables: structured relational data
  model (not a JSON blob), a mandatory Source/Evidence provenance system, a deterministic
  (non-LLM) matching engine with configurable weights and hard-fail rules, and strict "never
  invent facts / never fake live data" rules.

## How this maps to the current RoboReady codebase

The spec's Section 1 and Section 62 both demand: **reuse existing infrastructure, do not
duplicate it.** For reference, what already exists today (verified during architecture
inspection):

- **Stack:** Next.js 16 (App Router) + Neon Postgres + Drizzle ORM (`lib/db/schema.ts`) +
  Better Auth. Schema changes are applied through the Neon integration and mirrored in
  `lib/db/schema.ts`.
- **Property Intelligence (Layer B) already exists:** `property`, `assessment`,
  `intakeSubmission`, the 0–100 RoboReady scoring engine (`lib/assessment/*`), infrastructure
  plans, and client `report` generation. The spec says to **extend** these, add
  `PropertyRobotRequirement`, and add a **separate, versioned** Humanoid Readiness Score —
  not to modify the existing score in place (Section 38/39).
- **Leads/CRM already exist:** there is a leads + Sales-AI (Mercer) CRM (RoboReady MVP 2).
  The robotics `Lead` + robotics CRM pipeline (Sections 30–31) should extend this rather than
  create a second lead system.
- **Payments already exist:** live Stripe embedded checkout (assessment + proposal deposit).
  The robotics business-model tiers (Section 49) should reuse it — do not build a second
  payment system.
- **AI workforce seam already exists:** `StaffGPTAdapter` (LocalOrchestrator on AI Gateway
  now, real StaffGPT API later). The AI research agent + AI-assisted extraction (Sections
  34–36) should route through this adapter, and — per the spec — **must never silently
  convert an inference into a database fact.**
- **Auth/roles already exist:** Better Auth + tenancy (`lib/tenancy.ts`). The spec's role set
  (`SUPER_ADMIN, ADMIN, EDITOR, RESEARCHER, PARTNER, CUSTOMER, VIEWER`, Section 46) is a
  superset of what exists and would extend the current role model.
- **Network already exists:** the RoboArrival network (`lib/network/*`) auto-lists assessed
  properties. This is distinct from the robotics Provider directory, but shares the
  "directory + evidence + verification date" UX patterns worth reusing.

## Recommended first milestone (from Section 68)

Do **not** start by importing "109 manufacturers + 180 robots". Start with **Phase 0
(architecture audit) + Phase 1 (data model + evidence/provenance system)** only:
`Manufacturer, RobotModel, RobotSpecification, Capability, Industry, Provider, Source,
Evidence, Availability, Pricing`, with entity-resolution (alias) logic and idempotent
imports. Get sign-off on the migration plan before touching product code.

## Related future-spec docs

- `docs/robosearch/` — the RoboSearch / RoboArrival / StaffGPT model specs (a related but
  separate future direction). Worth reading alongside this, since both extend the same
  property → assessment → report spine.
