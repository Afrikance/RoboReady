import type { Metadata } from "next"
import Link from "next/link"
import { Bot, ClipboardCheck, MapPin, FileText, ArrowRight } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How RoboReady turns a commercial property into an autonomous-arrival readiness plan — from guided intake to a build-ready report.",
}

type Step = {
  icon: typeof Bot
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: ClipboardCheck,
    title: "Capture the property",
    body: "Start with a guided intake that captures the building details that actually drive readiness — access lanes, curb frontage, parking, power, and site layout. No autonomy expertise required.",
  },
  {
    icon: Bot,
    title: "Run the AI assessment",
    body: "An AI workforce reviews your property and grades it across every readiness dimension — robotaxi pick-up/drop-off, humanoid bots, delivery rovers, drones, and EV charging — producing a single 0–100 RoboReady Score.",
  },
  {
    icon: MapPin,
    title: "Plan the infrastructure",
    body: "Place robotaxi stands, pick-up/drop-off zones, and fast chargers on a satellite map of the site. See exactly what to build, where, and how each change moves your score.",
  },
  {
    icon: FileText,
    title: "Share a build-ready report",
    body: "Export a branded PDF and share a live portal with owners, operators, and stakeholders — a clear, prioritized plan to make the property ready for current and future autonomous vehicles.",
  },
]

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
        <Link href="/" aria-label="RoboReady home">
          <Logo size="lg" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 text-center lg:py-20">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            How RoboReady works
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            From property to autonomous-arrival plan in four steps
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
            RoboReady quantifies how ready a commercial property is for robotaxis and autonomous
            arrival, then shows you exactly what to build to improve it.
          </p>
        </section>

        <section className="border-t bg-secondary/40">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <ol className="flex flex-col gap-10">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                  <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <step.icon className="size-6" />
                    </span>
                    {i < STEPS.length - 1 ? (
                      <span className="hidden w-px flex-1 bg-border sm:block" aria-hidden="true" />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Step {i + 1}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-balance">{step.title}</h2>
                    <p className="max-w-2xl leading-relaxed text-muted-foreground text-pretty">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Ready to score your property?
            </h2>
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
              Run your first assessment and get a 0–100 RoboReady Score with a prioritized infrastructure plan.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Assess a property
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/#pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
