# StaffGPT &amp; RoboReady — Integration Strategy

> Status: **Reference / future implementation.** This is a strategy blueprint, not a
> committed build plan. It captures how RoboReady.net and StaffGPT.net should relate as
> two customer-facing products on one shared platform. Use it to inform roadmap decisions;
> pair it with `docs/roboready-build-plan.md` for the concrete RoboReady build.

## Core thesis

Architect this as **two customer-facing products on top of one shared platform** — do not
literally merge the two websites.

- **StaffGPT = platform.** The infrastructure for AI employees, AI teams, and AI workflows.
- **RoboReady = application.** A specialized AI workforce for autonomous-ready commercial property.

Strategic relationship (a two-way loop):

- RoboReady acquires specialized customers → StaffGPT expands the relationship into an AI workforce.
- StaffGPT acquires AI-workforce customers → RoboReady becomes one specialized solution they can deploy.

The customer should think: *"RoboReady solves my property problem,"* and after becoming a
customer, *"StaffGPT gives me the AI workforce behind the solution."* StaffGPT customers should
think: *"RoboReady is one of the specialized AI businesses I can deploy."*

Merge the brands **commercially, technically, and strategically** — not visually or structurally.

## 1. Overall architecture

```
                        INTERNET
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
      ROBOREADY.NET                  STAFFGPT.NET
   "Autonomous Property"          "AI Workforce Platform"
             └──────────────┬──────────────┘
                            ▼
                 SHARED CUSTOMER IDENTITY
                 ┌──────────┴──────────┐
                 ▼                     ▼
          SHARED PLATFORM         SHARED BILLING
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
     AI API   Agents   Workflows
        └────────┼────────┘
                 ▼
           STAFFGPT ENGINE
       ┌─────────┴──────────┐
       ▼                    ▼
 ROBOREADY WORKFORCE   OTHER VERTICALS
```

Websites are separate. **Account, AI infrastructure, billing, analytics, lead system, and
agent infrastructure are shared.**

## 2. RoboReady site architecture

RoboReady is more focused than StaffGPT. Its job: **Attract → assess → qualify → sell → expand.**

Primary navigation:

- Solutions: Commercial Properties, Multifamily, Retail, Industrial, Hotels, Parking / Mobility
- Assess Your Property
- How It Works
- Reports
- For Owners / For Operators / For Developers
- Resources
- Login
- **[Get Your Score]** ← dominant CTA

The dominant CTA is **"Get Your RoboReady Score"**, not "Learn about AI." The customer is
buying an outcome, not AI technology.

### Homepage

- **Hero:** "Is Your Property Ready for the Autonomous Future?" — assess readiness for robotaxis,
  AVs, delivery robots, drones, EV infrastructure, and emerging mobility.
- CTA: **[Get Your RoboReady Score]**, secondary **[See How It Works]**.
- Small secondary branding: "Powered by StaffGPT AI Workforce Technology."

## 3. RoboReady conversion funnel

An actual product funnel, not a contact form:

```
Landing page → Property Address → Property Type → Basic Property Questions
→ AI Preliminary Analysis → "Your preliminary score is 74" → Email / account creation
→ Full Report → $499 Readiness Check → $2,500 Standard Assessment → $7,500 Pro Report
→ RoboReady Care → StaffGPT AI Workforce
```

**The score is the hook. The report is the product. The AI workforce is the expansion.**

> Note: this blueprint's price ladder is `$499 / $2,500 / $7,500`. The current shipped RoboReady
> MVP uses `$2,500` assessment + proposal deposit via Stripe. Reconcile the ladder before adopting.

## 4. RoboReady dashboard (post-login)

```
Good morning, John

YOUR PROPERTIES
┌──────────────────────────────────────┐
│ 123 Main Street                      │
│ RoboReady Score              82/100  │
│ Infrastructure     88                │
│ Mobility           79                │
│ EV Readiness       84                │
│ Autonomous Access  77                │
│ [View Assessment] [Update Property]  │
└──────────────────────────────────────┘

AI WORKFORCE — Your RoboReady AI Team
● Property Analyst  ● Infrastructure Analyst  ● Financial Analyst  ● Report Writer
[Manage AI Workforce]  ← takes them into the StaffGPT environment
```

## 5. RoboReady report (major sales tool)

Sections: Executive Summary, Property Analysis, AV Readiness, Robotaxi Readiness, Delivery
Robot Readiness, Drone Readiness, EV Infrastructure, Electrical Requirements, Physical
Infrastructure, Estimated Investment, Potential Revenue Opportunities, Recommended
Improvements, Implementation Roadmap, AI-generated next steps.

Cross-sell at the end:

- "Your property is only 82% ready. RoboReady can help you plan the remaining infrastructure."
  → **[Create My Implementation Plan]**
- "Want an AI team managing this process?" → **[Activate StaffGPT]**

## 6. StaffGPT site architecture

StaffGPT is the platform-level brand. Hero: **"Build Your AI Workforce"** — deploy specialized
AI employees across sales, marketing, operations, finance, engineering, and industry-specific
workflows. CTA **[Build My AI Workforce]**, secondary **[Explore AI Employees]**.

AI Employees: Sales, Marketing, Finance, Operations, Engineering, Customer Success, Research,
Security, Industry Specialists.

### Solutions taxonomy

```
Solutions
├── By Department: Sales, Marketing, Finance, Operations, Engineering, Customer Success
├── By Industry: Commercial Property → RoboReady, Construction, Hospitality, Manufacturing, Professional Services
└── By Company Size: Startup, SMB, Enterprise
```

This gives RoboReady a legitimate position inside StaffGPT without looking like a subsidiary site.

## 7. The two funnels

- **StaffGPT → RoboReady:** Under Industries, "Specialized AI Workforce: Commercial Property →
  Meet RoboReady → [Assess a Property]". Because the visitor already has a StaffGPT account,
  they should be **automatically authenticated** — no re-registration.
- **RoboReady → StaffGPT:** RoboReady customer → assessment → AI report → recommendations →
  "Automate the next steps" → StaffGPT → AI Property Workforce. Selling a **digital department**,
  not "an AI chatbot."

## 8. Shared account architecture

Combine the backend. One identity:

```
ACCOUNT
├── User        ├── Organization  ├── Team Members  ├── Properties
├── AI Employees├── Workflows     ├── Reports       ├── Conversations
├── Usage       ├── Subscriptions └── Integrations
```

The user may enter through RoboReady, but their account is a **StaffGPT platform account**.

## 9. Domain architecture

```
staffgpt.net   → /employees /teams /workflows /solutions /industries /enterprise /pricing /login
roboready.net  → /assessment /properties /solutions /reports /resources /pricing /login
```

Behind the scenes: `app.staffgpt.net` (workforce platform); RoboReady may have `app.roboready.net`.
**Both authenticate against the same identity service.**

## 10. API architecture

StaffGPT is the platform API. RoboReady **consumes** StaffGPT capabilities rather than building a
separate AI system:

```
STAFFGPT API → Identity | AI Agents | Workflows → Data Layer → RoboReady | CRM/Leads | Billing
```

Example endpoints RoboReady calls:

```
POST /agents/analyze-property
POST /agents/generate-report
POST /agents/estimate-roi
POST /workflows/follow-up
POST /leads/qualify
POST /reports/generate
```

## 11. Common data model

```
Organization
├── Users
├── Properties → Assessments, Reports, Scores, Recommendations
├── AI Employees → Skills, Instructions, Tools, Memory
├── Workflows
├── Leads
├── Opportunities
└── Subscriptions
```

Every RoboReady customer becomes a potential StaffGPT customer.

## 12. CRM &amp; lead attribution

Native lead attribution. Every lead gets a `lead_source` (e.g. `roboready_homepage`,
`roboready_assessment`, `staffgpt_homepage`, `staffgpt_industry_property`, `google`, `partner`,
`referral`, `direct`).

```
Lead → RoboReady Assessment → Qualified → Paid Assessment → StaffGPT Opportunity
→ AI Workforce → Expansion
```

Measure: **"RoboReady generated $X in StaffGPT ARR."**

## 13. Billing architecture

One customer account; products attach to it. Enables bundling.

```
CUSTOMER
├── RoboReady: $499 Assessment, $2,500 Assessment, $7,500 Pro, Care Plan
└── StaffGPT:  AI Employee, AI Team, AI Workforce, Enterprise
```

Killer bundle: **"RoboReady AI Property Workforce"** — assessment + a deployed AI property team
(Property Analyst, Infrastructure Analyst, Financial Analyst, Research Agent, Report Agent,
Sales/Outreach Agent, StaffGPT workspace).

## 14. Admin — one master console

```
STAFFGPT ADMIN
Overview | Organizations | Users | AI Employees | Agents | Workflows | Usage | Billing | Leads | Opportunities
PRODUCTS: StaffGPT, RoboReady
ROBOREADY: Properties, Assessments, Reports, Scores, Care Plans
ANALYTICS: Revenue, Conversion, Cross-sell, MRR/ARR, CAC, LTV
```

Customer-facing brands stay separate; management sees one ecosystem.

## 15. Analytics — cross-product funnel

```
RoboReady traffic → assessment start → assessment completed → email capture
→ $499 → $2,500 → $7,500 → Care Plan → StaffGPT trial → StaffGPT paid
→ AI Workforce → Expansion
```

- **RoboReady:** visitor→assessment, assessment→lead, lead→paid, avg assessment value, report
  conversion, care-plan conversion.
- **StaffGPT:** trial→paid, AI employee activation, AI team activation, MRR, usage, retention, expansion.
- **Combined (most important):** RoboReady↔StaffGPT conversion, revenue per customer, combined LTV,
  cross-sell rate, CAC, revenue by acquisition channel.

## 16. RoboReady AI employees (StaffGPT-powered)

- **Property Analyst** — property characteristics, entrances/exits, traffic patterns,
  pickup/drop-off, site constraints, accessibility, autonomy infrastructure.
- **Infrastructure Analyst** — EV charging, robotaxi staging, delivery robots, drones,
  electrical requirements, physical infrastructure.
- **Financial Analyst** — estimated infrastructure costs, revenue opportunities, ROI, payback
  period, property-value implications.
- **Report Writer** — executive report, property score, recommendations, implementation plan,
  diagrams, client presentation.
- **Sales Agent** — asks "Would you like the build-ready infrastructure plan?" → bridge to
  $2,500 / $7,500 products.

Internal sales machine — every RoboReady lead can spawn a StaffGPT workflow:

```
New lead → AI Lead Qualifier → AI Researcher → AI Sales Rep → AI Proposal Writer
→ Human closes → AI Customer Success → Upsell StaffGPT
```

Pitch: *"The same AI workforce technology we use to analyze your property is available to your company."*

## 17. Positioning &amp; messaging

- **StaffGPT:** "The AI workforce platform for building specialized AI businesses." Products:
  AI Employees, AI Teams, AI Workflows, AI Studios, Hybrid/Local AI, Enterprise AI Workforce.
- **RoboReady:** "The AI workforce for autonomous-ready commercial property." Products:
  RoboReady Score, Readiness Assessment, Infrastructure Planning, Build-Ready Reports, Monitoring/Care.
- Behind both: the **StaffGPT AI Workforce Engine.**

Don't make RoboReady look like a StaffGPT demo — it must feel like a serious industry solution:
Input (property + site info + questionnaire) → Analysis (specialized AI workforce) → Output
(RoboReady Score + recommendations + site concept + cost estimates + priorities + executive report).

## 18. Navigation relationship

Brands subtly reference each other — **no side-by-side logos everywhere.**

- RoboReady header: small "Powered by StaffGPT" (clicking → StaffGPT).
- StaffGPT header: under Industries, "Commercial Property — RoboReady."

Cross-sell **inside** the products, not just footer links.

## 19. SEO opportunity

- **StaffGPT** owns broad AI searches: AI employees, AI workforce, AI {sales,marketing,finance,
  operations,engineering} employee.
- **RoboReady** owns specific emerging searches: robotaxi-ready property, robotaxi infrastructure,
  commercial property robotaxi, AV property readiness, Tesla Cybercab property, Waymo property
  readiness, EV charging infrastructure, autonomous delivery readiness, drone-ready commercial property.

## 20. The flywheel

```
StaffGPT → AI Workforce → Specialized Apps → RoboReady → Property Leads → Assessments
→ Paid Customers → StaffGPT Upsell → AI Workforce → More Data/Results → Better Product
→ More Leads → (loop)
```

## 21. Phased development

- **Phase 1 — Connect the brands:** shared auth, shared customer ID, cross-domain login,
  StaffGPT↔RoboReady navigation, lead attribution, basic cross-sell tracking.
- **Phase 2 — RoboReady → StaffGPT:** RoboReady AI workforce (property/infrastructure/financial
  analysts, report writer), StaffGPT activation from RoboReady.
- **Phase 3 — StaffGPT → RoboReady:** Industry Solutions section, Commercial Property solution,
  RoboReady launch flow, one-click property assessment.
- **Phase 4 — Unified billing:** shared customer, shared subscriptions, bundles, usage billing,
  enterprise contracts.
- **Phase 5 — Platformization:** StaffGPT launches additional vertical AI businesses (HotelReady,
  BuildReady, FactoryReady, healthcare/manufacturing ops) on the same architecture.

## 22. The long-term play

Don't think "StaffGPT + RoboReady." Think **"StaffGPT → Vertical AI Companies,"** with RoboReady
as the first flagship example:

```
STAFFGPT (AI Workforce Engine)
├── ROBOREADY (Commercial Property)
├── [Vertical #2] Healthcare Operations
└── [Vertical #3] Manufacturing AI
```

Each vertical = specific problem + specialized AI workforce + specialized reports/workflows +
lead generation, all on the shared StaffGPT platform.

## Recommended architecture (summary)

| Layer | Brand | Purpose |
| --- | --- | --- |
| AI platform | StaffGPT | AI workforce engine |
| Vertical application | RoboReady | Autonomous-property intelligence |
| Lead generation | RoboReady | Property owners / operators |
| AI workforce upsell | StaffGPT | Expand customer's AI workforce |
| Assessment revenue | RoboReady | $499 → $2,500 → $7,500 |
| Recurring AI revenue | StaffGPT | Monthly / enterprise |
| Enterprise infrastructure | StaffGPT | Cloud / local / hybrid |
| Industry expansion | Both | New vertical AI companies |

## Relevance to the current RoboReady codebase

This repo already implements several primitives this strategy depends on:

- **AI workforce seam** — `StaffGPTAdapter` (LocalOrchestrator on AI Gateway today, real StaffGPT
  API later) already frames RoboReady's agents as consumers of a StaffGPT-style engine. That maps
  directly to §10 (RoboReady consumes StaffGPT APIs).
- **CRM leads + Sales AI (Mercer)** — aligns with §12 lead attribution and §16's internal sales
  machine. Add a `lead_source` field to make attribution native.
- **Assessment lifecycle + scoring + reports + proposal generation + Stripe checkout** — the
  RoboReady funnel (§3) and report (§5) already exist in MVP form.

Open items to reconcile before implementing: unify the price ladder (`$499/$2,500/$7,500` vs current
`$2,500`), introduce shared customer identity + cross-domain SSO (§8–9), and add the admin/analytics
cross-product views (§14–15).
