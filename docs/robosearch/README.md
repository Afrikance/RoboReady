# RoboSearch — Future Implementation Docs

> **Status: Not yet implemented.** These documents capture the product owner's
> vision for evolving RoboReady into a modular autonomous-world intelligence
> platform (RoboReady → RoboSearch → RoboArrival, powered by StaffGPT). They are
> stored here as reference specs for a future build. No code in this repo
> implements them yet.

## Documents

- **[`robosearch-roboarrival-model-prompt.md`](./robosearch-roboarrival-model-prompt.md)**
  — the master build instruction: mission, canonical data model, provenance &
  verification system, AI research engine, StaffGPT adapter, natural-language
  search, RoboArrival, RoboOps admin, monetization-ready architecture,
  detachability requirement, and the phased implementation order + MVP definition.

- **[`robosearch-staffgpt-roboarrival-strategy.md`](./robosearch-staffgpt-roboarrival-strategy.md)**
  — the strategy narrative: the three-layer model (RoboReady / RoboSearch /
  StaffGPT), the RoboGraph relationship layer, the AI workforce roles, the
  "detach test," the flywheel, and the long-term product vision.

## Core principles (quick reference)

1. **Inspect before coding.** Reuse the existing RoboReady stack (Next.js 16 +
   Neon + Better Auth); do not rewrite.
2. **Modular from day one.** RoboSearch is a subsystem now, extractable into an
   independent service/product later without rebuilding its core.
3. **API boundary is the escape hatch.** `RoboReady → RoboSearch API →
   RoboSearch Core`, never direct DB queries into RoboSearch internals.
4. **AI may propose; evidence establishes.** Every important fact is a Claim
   with a Source, confidence, and verification state.
5. **StaffGPT is optional for basic operation.** Search, database, and public
   listings must work even if StaffGPT is unavailable. Reuse the existing
   `StaffGPTAdapter` seam.
6. **MVP first:** DATA + RESEARCH + PROVENANCE + SEARCH + ROBOARRIVAL — not
   thousands of pages.

## Relationship to existing RoboReady work

RoboReady already ships MVP 1 + MVP 2 (assessments → RoboReady Score, CRM leads,
Sales AI, planners, proposals, Stripe checkout) and has a `StaffGPTAdapter`
(LocalOrchestrator on AI Gateway). This RoboSearch initiative is the **next major
architectural phase** and should build on those seams rather than replacing them.
When a scoring model is merged, keep the factual per-attribute assessment as the
source of truth and treat the 0–100 score as a derived, documented view.
