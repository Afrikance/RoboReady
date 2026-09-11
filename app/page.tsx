import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"
import { ScoreGauge } from "@/components/score/score-gauge"
import { SiteFooter } from "@/components/marketing/site-footer"
import { ASSESSMENT_TIERS } from "@/lib/products"
import { Badge } from "@/components/ui/badge"
import { Bot, MapPin, FileText, ClipboardCheck, ArrowRight, Check } from "lucide-react"

function priceLabel(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/dashboard")

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
        <Logo size="lg" />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="#features"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Pricing
          </Link>
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Robotaxi &amp; CyberCab readiness, quantified
            </span>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">
              Is your property ready for robotaxis?
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
              RoboReady assesses commercial properties for autonomous ride-hail — Waymo, Tesla
              Cybercab, and Zoox pick-up and drop-off — plus delivery robots, drones, and EV
              charging. Run an AI assessment, get a 0–100 RoboReady Score, and plan exactly what
              infrastructure you need.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Assess a property
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#pricing">See pricing</Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-xl border bg-card p-8 shadow-sm">
              <ScoreGauge score={82} size={260} />
              <p className="mt-4 max-w-xs text-center text-sm text-muted-foreground">
                Example: a mixed-use hotel scoring 82 — robotaxi-ready with a dedicated pick-up/drop-off
                lane, needing only minor fast-charging work.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-t bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={ClipboardCheck}
              title="Guided intake"
              body="Capture the building details that drive readiness in a structured questionnaire."
            />
            <Feature
              icon={Bot}
              title="AI assessment"
              body="An AI workforce reviews your property and grades readiness across every dimension."
            />
            <Feature
              icon={MapPin}
              title="Robotaxi infrastructure"
              body="Place robotaxi stands, pick-up/drop-off zones, and fast chargers on a satellite map of the site."
            />
            <Feature
              icon={FileText}
              title="Client-ready reports"
              body="Export a branded PDF and share a live portal with stakeholders."
            />
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-t">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Simple, one-time pricing
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground text-pretty">
                Start with a fast readiness snapshot, or go straight to a build-ready report. Every tier is a
                one-time assessment of a single property.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {ASSESSMENT_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={
                    tier.featured
                      ? "relative flex flex-col rounded-xl border-2 border-primary bg-card p-6 shadow-sm"
                      : "relative flex flex-col rounded-xl border bg-card p-6"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{tier.name}</h3>
                    {tier.featured ? <Badge>Most popular</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight">{priceLabel(tier.priceInCents)}</span>
                    <span className="text-sm text-muted-foreground">one-time</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {tier.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2.5 text-sm text-pretty">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-8 w-full" variant={tier.featured ? "default" : "outline"}>
                    <Link href="/sign-up">
                      Get started
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground text-pretty">
              Need ongoing monitoring or maintenance? Ask about our Care plans after your assessment.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Bot
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}
