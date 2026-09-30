import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  BriefcaseBusiness,
  CarFront,
  ChartNoAxesCombined,
  ClipboardCheck,
  Landmark,
  ShieldCheck,
  WalletCards,
} from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/marketing/site-footer"

const ASSESSMENT_EMAIL =
  "mailto:hello@roboready.app?subject=Request%20a%20Government%20Readiness%20Assessment&body=Hello%20RoboReady%20and%20StaffGPT%2C%0A%0AI%27d%20like%20to%20discuss%20a%20Government%20Readiness%20Assessment.%0A%0AGovernment%20or%20agency%3A%20%0AJurisdiction%3A%20%0APrimary%20interest%3A%20"

export const metadata: Metadata = {
  title: "AI Workforce & Autonomous Infrastructure for Government",
  description:
    "StaffGPT and RoboReady help government teams explore practical AI workforce support and prepare public facilities for autonomous transportation, robotics, and EV charging.",
  alternates: { canonical: "https://roboready.net/government" },
  openGraph: {
    title: "AI Workforce for Government. Infrastructure for the Autonomous Era.",
    description:
      "A practical government partnership from StaffGPT and RoboReady: AI workforce support and public infrastructure readiness.",
    url: "https://roboready.net/government",
    images: ["/images/government-infrastructure-hero.png"],
    type: "website",
  },
}

const CAPABILITIES = [
  {
    icon: Landmark,
    title: "Administration",
    description:
      "Support research, records and document workflows, meeting summaries, standard operating procedures, and constituent-service knowledge resources—with agency staff reviewing the work.",
  },
  {
    icon: WalletCards,
    title: "Finance & Procurement",
    description:
      "Assist with budget research, grant discovery, vendor comparisons, procurement documentation, and first drafts of RFP and RFQ materials.",
  },
  {
    icon: ShieldCheck,
    title: "IT & Security",
    description:
      "Organize technical knowledge, document policies and incidents, and support security assessment workflows with qualified personnel retaining decision authority.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Economic Development",
    description:
      "Bring research together for grant opportunities, site analysis, planning documents, and business and industry landscape reviews.",
  },
  {
    icon: Building2,
    title: "Public Works",
    description:
      "Explore AI-assisted research and documentation for facilities, infrastructure programs, maintenance processes, and public works operations.",
  },
  {
    icon: CarFront,
    title: "Autonomous Infrastructure",
    description:
      "Assess public facilities and mobility environments for curbside access, EV charging, autonomous vehicle arrival, delivery robotics, and emerging aerial logistics.",
  },
]

const STEPS = [
  {
    number: "01",
    title: "Understand your priorities",
    description:
      "Start with the agency, operating needs, facilities, governance requirements, and procurement context—not a one-size-fits-all package.",
  },
  {
    number: "02",
    title: "Identify practical opportunities",
    description:
      "Explore where an AI workforce may support staff and which public sites could benefit from an autonomous-infrastructure readiness review.",
  },
  {
    number: "03",
    title: "Plan a measured next step",
    description:
      "Receive a scoped discussion of possible discovery work, pilot options, deployment considerations, and a prioritized roadmap.",
  },
]

export default function GovernmentPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="RoboReady home">
              <Logo size="sm" />
            </Link>
            <span aria-hidden="true" className="h-7 w-px bg-border" />
            <a
              href="https://www.staffgpt.net"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-primary sm:text-lg"
            >
              StaffGPT
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </a>
          </div>
          <nav aria-label="Government page" className="flex items-center gap-2">
            <Link
              href="#capabilities"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Capabilities
            </Link>
            <Button asChild size="sm" aria-label="Request a Government Readiness Assessment">
              <a href={ASSESSMENT_EMAIL}>
                <span className="sm:hidden">Request</span>
                <span className="hidden sm:inline">Request an assessment</span>
              </a>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-sidebar text-sidebar-foreground">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-24">
            <div className="flex flex-col items-start gap-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1.5 text-sm text-sidebar-foreground">
                <span className="size-2 rounded-full bg-sidebar-primary" aria-hidden="true" />
                A government partnership
              </div>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="block">AI Workforce for Government.</span>
                <span className="mt-2 block text-sidebar-primary">
                  Infrastructure for the Autonomous Era.
                </span>
              </h1>
              <p className="max-w-2xl text-pretty text-lg leading-relaxed text-sidebar-foreground/80 sm:text-xl">
                Deploy practical AI employees across government operations while preparing public
                facilities and infrastructure for autonomous transportation, robotics and EV
                charging.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button asChild size="lg" variant="secondary">
                  <a href={ASSESSMENT_EMAIL}>
                    Request a Government Readiness Assessment
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                <Link
                  href="#capabilities"
                  className="rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                >
                  Explore capabilities
                </Link>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-sidebar-foreground/65">
                A practical starting point for state and local agencies, public institutions, and
                special districts. No obligation to pursue both workstreams.
              </p>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-accent shadow-2xl shadow-sidebar/20">
                {/* Generated editorial image; the civic setting is illustrative, not a real project site. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/government-infrastructure-hero.png"
                  alt="Illustrative civic campus with an autonomous electric shuttle, accessible curbside arrival, EV charging, and a delivery rover"
                  className="aspect-[4/3] w-full object-cover"
                  fetchPriority="high"
                />
              </div>
              <p className="mt-3 text-right text-xs leading-relaxed text-sidebar-foreground/60">
                Illustrative concept image
              </p>
            </div>
          </div>
        </section>

        <section id="capabilities" className="scroll-mt-20 border-b bg-secondary/40">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="mb-10 flex flex-col gap-4 lg:mb-12 lg:max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                One partnership. Practical options.
              </p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Support today&apos;s public service. Prepare for what&apos;s next.
              </h2>
              <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
                StaffGPT and RoboReady bring complementary capabilities together. Agencies can
                explore the workstreams that fit their goals, staffing, sites, and procurement
                path.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="flex h-full flex-col gap-4 rounded-xl border bg-card p-6 transition-colors hover:border-primary/40"
                >
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div className="flex flex-col items-start gap-5">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                Two complementary workstreams
              </p>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Start with the need. Build from there.
              </h2>
              <p className="text-pretty leading-relaxed text-muted-foreground">
                A government assessment can help clarify where additional operational capacity
                could matter, which facilities merit closer review, and what a responsible next
                step might look like. StaffGPT and RoboReady can be considered together or
                separately.
              </p>
            </div>

            <div className="flex flex-col divide-y rounded-xl border bg-card">
              <div className="flex flex-col gap-3 p-6 sm:flex-row sm:gap-6 sm:p-8">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BriefcaseBusiness className="size-5" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-semibold">StaffGPT Government</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    Specialized AI employees can assist with research, document preparation,
                    process documentation, finance and procurement workflows, communications, and
                    internal knowledge—while agency personnel stay in control of review and
                    decisions.
                  </p>
                  <a
                    href="https://www.staffgpt.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Explore StaffGPT
                    <ArrowUpRight className="size-4" />
                  </a>
                </div>
              </div>
              <div className="flex flex-col gap-3 p-6 sm:flex-row sm:gap-6 sm:p-8">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardCheck className="size-5" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-semibold">RoboReady Government</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    Readiness reviews can help agencies assess public-facing sites and facilities
                    for arrival, curb and parking needs, EV charging, and potential autonomous
                    vehicle or robotics use cases—then prioritize questions for further planning.
                  </p>
                  <Link
                    href="/how-it-works"
                    className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    See how RoboReady assessments work
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-secondary/40">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                A clear first step
              </p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                A government readiness conversation, shaped around your jurisdiction.
              </h2>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.number} className="flex flex-col gap-4 rounded-xl border bg-card p-6 sm:p-7">
                  <span className="font-mono text-sm font-semibold tracking-wide text-primary">
                    {step.number}
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="request" className="scroll-mt-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-5 py-16 text-center sm:px-8 sm:py-20">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Request a Government Readiness Assessment
            </h2>
            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Tell us about your agency, priorities, and the facilities or workflows you&apos;re
              considering. We&apos;ll start with a conversation about fit and a possible scope.
            </p>
            <Button asChild size="lg">
              <a href={ASSESSMENT_EMAIL}>
                Request an assessment
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Deployment options, security controls, records practices, and procurement
              requirements depend on the agency and proposed scope. We confirm these details during
              discovery and do not imply certifications or procurement eligibility that have not
              been established.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
