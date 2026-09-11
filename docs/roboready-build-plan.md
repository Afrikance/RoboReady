# RoboReady — Master Build Plan

> RoboReady (formerly "RoboArrival"; treat *RoboArrival* as an alias) — the Autonomous
> Arrival Infrastructure Operating System. The AI workforce (StaffGPT) creates the
> intelligence; RoboReady owns the property data and assets.
>
> **Status:** Planning approved-for-review. Build MVP 1 only after explicit sign-off.

---

## 0. Locked decisions (from kickoff Q&A)

| Area | Decision |
| --- | --- |
| **Payments** | **Stripe now.** Real payment integration for assessments, proposals, one-time installs, and recurring service plans. See §8. |
| **Database / Auth** | **Neon (Postgres) + Better Auth** (email/password), per-query tenant scoping. No RLS engine — every query filters by `organization_id`. |
| **StaffGPT API** | No external API exists yet. Build `StaffGPTAdapter` behind a server-only boundary with a working AI-Gateway implementation now; design + expose a real API on the StaffGPT side in parallel. Requires login access to `staffgpt-landing-page.vercel.app`. See §7. |
| **Scope** | Document the full 4-MVP roadmap; implement **one MVP at a time**, MVP 1 only after approval. |

**Payment rule going forward:** every feature that could involve charging a customer is flagged with 💳 in this doc, and I will confirm the charge model with you before wiring it.

---

## 1. Product positioning

RoboReady is **not** "an AI report generator + a pretty map." It is the operating
platform that takes a property from *"curious about autonomous transportation"* to
*"designed, deployed, and monitored autonomous-arrival infrastructure."*

- RoboReady does **not** manufacture or operate robotaxis or drones.
- It designs, assesses, plans, manages, and (later) monitors everything *around*
  autonomous transportation — interior and exterior.
- Physical products are all instances of one expandable `InfrastructureAsset` model:
  **LandingPad** (ground passenger), **RoboCharge** (EV energy), **DronePad** (aerial
  delivery), and future types (SmartCurb, ArrivalBeacon, WayfindingSystem,
  AccessibilityHub, WaitingShelter, DigitalSign, SmartBollard, Concierge…).

---

## 2. Two-layer architecture

```
                       ROBOREADY (system of record)
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                       │
   AI WORKFORCE            PROPERTY DATA             ASSETS
   (StaffGPT, external)    (Neon Postgres)     (InfrastructureAsset)
        │                      │              ┌───────┼────────┐
   via StaffGPTAdapter    Digital Twin     LandingPad  RoboCharge  DronePad
```

- **Layer A — RoboReady Platform:** customer-facing SaaS. Owns customers, properties,
  profiles, assessments, site data, designs, projects, proposals, assets, service
  plans, dashboards, documents, users, permissions, billing, analytics, audit logs.
- **Layer B — StaffGPT AI Workforce:** external AI execution/orchestration service.
  **Never** the system of record. Isolated entirely behind `StaffGPTAdapter`. If
  StaffGPT is unavailable or plan-limited, RoboReady must keep functioning.

**Hard boundary:** `RoboReady → AI Orchestration → StaffGPT`. This keeps us free to
swap AI providers later.

---

## 3. Tech stack

- **Framework:** Next.js 16 (App Router, RSC, Server Actions), TypeScript.
- **DB:** Neon Postgres accessed via the Neon serverless driver + Drizzle ORM (per the
  neon-on-vercel skill). Migrations in-repo.
- **Auth:** Better Auth (email/password), cookie config hardened for the v0 preview
  iframe (`sameSite:'none', secure:true`).
- **AI:** Vercel AI SDK through AI Gateway (zero-config in v0/Vercel). Used *inside* the
  StaffGPTAdapter's local implementation and for image-concept generation.
- **Payments:** Stripe (Checkout + Billing) via the Stripe integration. 💳
- **Files:** Vercel Blob (private) for property documents, photos, site plans, reports.
- **Maps:** `MapProvider` abstraction (server-configured); MVP uses a satellite/static
  tile + marker layer, provider-agnostic.
- **UI:** Tailwind + shadcn/ui, following the RoboReady design system (§ design).

### Design system (§28 of spec)
- Palette (3–5 colors): **Charcoal** (base), **White**, **Electric Blue** (autonomous
  operation / primary), **Green** (completed/ready), **Amber** (attention); Red reserved
  for emergency states only.
- Language: premium, architectural, accessible, calm, futuristic, commercially realistic.
- Avoid: sci-fi holograms, excessive neon, flying cars, generic-AI aesthetics, clutter.
- Target feel: premium infrastructure software + smart-city OS + hospitality tech.
- Status color code (assets/DronePad): Blue = autonomous op, Green = ready/complete,
  Amber = attention, Red = emergency.

---

## 4. Data model

Full target schema (spec §20). MVP-1 tables are marked ✅; later-MVP tables are listed
so the schema is designed once and grows without rewrites.

| Table | MVP | Notes |
| --- | --- | --- |
| `organizations` | ✅1 | Tenant root. |
| `users` / Better Auth tables | ✅1 | `organization_id` + `role`. |
| `properties` | ✅1 | Full property model (spec §4). |
| `property_contacts` | ✅1 | |
| `property_documents` | ✅1 | Blob refs, per-property access. |
| `assessments` | ✅1 | Workflow + approval state. |
| `assessment_scores` | ✅1 | 8 categories, each with evidence/confidence. |
| `assessment_recommendations` | ✅1 | Priority, risk flags, human-review flags. |
| `assets` (`InfrastructureAsset`) | ✅1 | Generic asset table (type-driven). |
| `ev_chargers` | ✅1 | RoboCharge (manual entry in MVP). |
| `designs` / `design_versions` | ✅1 | Concept image versioning (never overwrite). |
| `ai_tasks` / `ai_outputs` | ✅1 | Full AI traceability (spec §34). |
| `reports` | ✅1 | Structured → PDF. |
| `audit_logs` | ✅1 | AI actions, approvals, access. |
| `proposals` | 2 | 💳 pricing. |
| `projects` / `project_tasks` | 2 | CRM + delivery. |
| `landingpads` | 3 | Typed asset detail. |
| `dronepads` | 3 | Typed asset detail. |
| `wayfinding_systems` | 2 | |
| `accessibility_reviews` | 2 | |
| `vendors` | 3 | |
| `maintenance_records` | 3 | |
| `analytics_events` | 3 | |

Every table carries `organization_id`; every query filters by the session org.

---

## 5. Cross-cutting requirements (apply from MVP 1)

1. **Multi-tenancy** — org isolation enforced in the data-access layer; users only see
   their org's properties/projects. Future hierarchy: RoboReady internal → owner →
   management company → property.
2. **Roles** — Super Admin / Subadmin / Admin Assistant, RoboReady Employee, Designer,
   Sales, **Operator** (field data collection dashboard), Client Admin, Client Viewer,
   Vendor/Contractor (assigned-project-only). MVP 1 ships the enum + core gates; the
   Operator field-capture dashboard is scaffolded in MVP 1, expanded later.
3. **Security** — server-side secrets only (StaffGPT/AI/map/Stripe keys never in the
   browser), input validation, rate limiting, audit + AI-action + approval logs, file
   access controls.
4. **AI traceability (§34)** — every AI recommendation stores: employee, task ID, prompt
   version, knowledge sources, input documents, output, timestamp, model, confidence,
   human reviewer, approval status.
5. **Human approval gates (§14)** — states `AI_DRAFT → NEEDS_REVIEW → HUMAN_APPROVED →
   CLIENT_APPROVED → ENGINEERING_APPROVED → READY_FOR_DEPLOYMENT`. AI can never approve
   construction, electrical, structural, traffic, ADA/legal, fire/life-safety, drone ops,
   EV electrical, permits, or final drawings. System blocks deployment-ready without the
   required human approvals.
6. **Quality-control pipeline (§37)** — `AI GENERATED → VALIDATION → MISSING-INFO CHECK →
   CONFLICT CHECK → HUMAN REVIEW → CLIENT DELIVERY`. Never fabricate missing facts; label
   values `UNKNOWN` / `ESTIMATE` / `AI RECOMMENDATION` / `VERIFIED`.
7. **Demo data (§36)** — seed **Quality Inn & Suites Bel Air** with a clearly-labeled
   concept/demo dataset (banner everywhere: "concept/demo — not an installed or endorsed
   deployment").

---

## 6. AI employees (StaffGPT workforce)

Configured as data, executed through the adapter. Ten employees (spec §3):

1. **Property Assessment Specialist** — readiness assessment + RoboReady Score. *(MVP 1)*
2. **Site Intelligence Specialist** — where the arrival zone should go. *(MVP 1)*
3. **Wayfinding Designer** *(MVP 2)*
4. **Accessibility Specialist** — always emits `REQUIRES_PROFESSIONAL_VERIFICATION`
   where code/ADA/construction/legal is implicated. *(MVP 2)*
5. **Infrastructure Designer** — concept + BOM. *(MVP 1 concept level, deeper in 3)*
6. **Report Generator** — structured data → professional report. *(MVP 1)*
7. **Proposal Specialist** *(MVP 2, 💳)*
8. **Sales Employee** — never makes contractual commitments. *(MVP 2)*
9. **Marketing Employee** *(MVP 2/3)*
10. **Operations Employee** — incl. digital signing. *(MVP 3)*

Each employee is specified with name, role, mission, personality, knowledge base,
guardrails, inputs, workflow, deliverables, QC checklist, success metrics, handoff, and
exact configuration prompts (deliverable of the AI Employee Blueprint doc, authored in
MVP 1 for employees 1/2/5/6).

### Orchestration workflows (§18)
- **A — New Property:** Assessment → Site Intelligence → Accessibility → Wayfinding →
  Infrastructure Design → Report → Human Review → Client. *(MVP 1 runs A's 1/2/5/6 path.)*
- **B — New Lead:** Sales → Qualify → Research → Assessment Offer → Assessment → Meeting →
  Proposal. *(MVP 2)*
- **C — LandingPad Request:** Site Intel → Infra Design → Accessibility → Wayfinding →
  Cost → Proposal → Human Approval. *(MVP 2/3)*

---

## 7. StaffGPT integration plan

The spec forbids inventing endpoints and requires inspecting the real API. **StaffGPT
has no external API today** (it's server-action + studio driven on Supabase). So:

### 7a. `StaffGPTAdapter` (RoboReady side, MVP 1)
Server-only interface with methods: `listEmployees`, `getEmployee`, `createTask`,
`executeEmployee`, `getTaskStatus`, `getTaskResult`, `cancelTask`, `uploadDocument`,
`getEmployeeCapabilities`, `registerWebhook`. Two implementations behind the same
interface:
- **`LocalOrchestrator` (ships in MVP 1):** runs the employee prompts via AI Gateway so
  RoboReady is fully functional and demoable immediately. Writes to `ai_tasks`/`ai_outputs`
  with full traceability.
- **`RemoteStaffGPTClient` (swap-in):** talks to the real StaffGPT API once it exists.

Feature-flagged; RoboReady never hard-fails if StaffGPT is down or plan-limited.

### 7b. StaffGPT API surface (StaffGPT side — needs your access)
To make the remote path real, StaffGPT (`Afrikance/staffgpt-landing-page`) needs a
minimal, authenticated API: employee list/lookup, task submit/execute, status/result,
document upload, webhook registration, plus org/workspace identifiers and scopes. This is
a **separate coordinated change** in that repo.

**What I need from you (§ open items):** login access to
`staffgpt-landing-page.vercel.app/en` and confirmation to open a branch/PR on
`Afrikance/staffgpt-landing-page` to add the API. Until then, MVP 1 runs on
`LocalOrchestrator` — no blocker.

---

## 8. Payments — Stripe 💳

Confirmed: **Stripe now.** Mapping to the asset-based revenue model (spec §25):

| Product / service | Charge model | MVP |
| --- | --- | --- |
| Assessment | One-time | 2 (MVP 1 records price as data; no checkout yet) |
| Design | One-time | 2 |
| LandingPad | One-time install + optional recurring | 3 |
| RoboCharge (EV) | Equipment + install + optional recurring | 3 |
| DronePad | Equipment + install + optional recurring | 3 |
| Concierge | Monthly | 3 |
| Analytics | Monthly | 3 |
| Maintenance | Monthly / annual | 3 |
| Enterprise | Custom | 4 |

**Plan:** connect the Stripe integration when we start the first billed surface (proposal
acceptance / assessment purchase in **MVP 2**). Server-side price + quantity validation,
recompute totals server-side, idempotency keys on checkout creation. MVP 1 stores prices
and proposal amounts as data only — no card processing — so no Stripe dependency blocks
the core build. I'll confirm exact SKUs/prices with you before wiring checkout.

---

## 9. MVP roadmap

### MVP 1 — Core assessment product *(build after approval)*
Ships the spec's Definition-of-Done core. Delivered as one coherent build, in this order:

1. **Foundation** — Next.js app shell, RoboReady design system (charcoal/white/electric-
   blue/green/amber), Neon + Drizzle schema & migrations for the ✅1 tables, Better Auth
   (email/password), org multi-tenancy + role enum, audit-log plumbing.
2. **Property management & intake** — create/list/view properties (full property model),
   contacts, and the document repository (Blob, private) with per-property access.
3. **Operator capture (scaffold)** — basic Operator dashboard to upload site images/videos/
   measurements against a property.
4. **StaffGPTAdapter + LocalOrchestrator** — service boundary, AI employees 1/2/5/6
   configured as data, `ai_tasks`/`ai_outputs` traceability, QC + human-approval gates.
5. **Assessment engine** — run the New-Property workflow (Assessment → Site Intelligence
   → Infra concept → Report), producing the 100-pt **RoboReady Score** across the 8
   categories (Curb 20 / Wayfinding 15 / Accessibility 15 / Passenger 15 / Signage 10 /
   Infrastructure 10 / Traffic 10 / Future 5), each score with explanation, evidence,
   confidence, recommendations.
6. **Site concept generation** — structured design brief → image concept, versioned
   (v1/v2/v3, never overwritten), stored with prompt/model/generation-id/date.
7. **EV assets (manual)** — add RoboCharge chargers as `InfrastructureAsset`s.
8. **Property map** — interactive map with clickable assets (LandingPad concept, EV,
   entrances, etc.) via `MapProvider`.
9. **Report + PDF** — structured report generator with AI-vs-human-vs-engineering content
   labeling, review/edit, PDF export.
10. **Client portal + property dashboard** — score, assets summary, project status.
11. **Demo seed** — Quality Inn & Suites Bel Air, clearly labeled concept/demo.

**MVP 1 Definition of Done:** account → property → address → upload info → start
assessment → AI workflow runs → structured score → recommendations → EV assets → assets
on map → professional report → review/edit → export PDF → view dashboard. (LandingPad
concept, DronePad, and proposal are stubbed/labeled "future" in MVP 1 per the spec's DoD
annotations; proposals become real in MVP 2.)

### MVP 2 — Sales & design depth
Wayfinding, Accessibility (with professional-verification flags), Proposal generation 💳,
CRM lead-to-property pipeline, Sales AI, EV charging planner. Stripe goes live here.

### MVP 3 — Infrastructure & operations
DronePad + designer & product states, LandingPad designer, Analytics dashboard,
Concierge, Maintenance, asset telemetry, Operations employee (digital signing). Recurring
billing 💳.

### MVP 4 — Enterprise & twin
Digital twin, 3D, CAD/BIM/LiDAR import, external infrastructure integrations (OCPP EV
networks, etc.), multi-property enterprise management, custom enterprise billing 💳.

---

## 10. Engineering discipline (per module)
Type-check, lint, build, verify migrations, verify endpoints, verify auth, verify tenant
isolation, verify AI-task logging. Browser-verify user-visible flows. Never claim the
StaffGPT integration "works" until tested against the real service.

---

## 11. Open items — need from you
1. **StaffGPT access:** login to `staffgpt-landing-page.vercel.app/en` + OK to open a
   PR on `Afrikance/staffgpt-landing-page` to add the external API. *(Not a blocker for
   MVP 1 — LocalOrchestrator covers it.)*
2. **Stripe:** confirm we defer Stripe wiring to MVP 2 (recommended) and, when we get
   there, the SKU/price list. 💳
3. **Maps provider:** any preferred provider/key, or use a provider-agnostic
   satellite+marker default for MVP 1?
4. **Approval to start MVP 1.**
