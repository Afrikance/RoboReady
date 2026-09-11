import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"
import { ScoreGauge } from "@/components/score/score-gauge"
import { Bot, MapPin, FileText, ClipboardCheck, ArrowRight } from "lucide-react"

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect("/dashboard")

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <Logo />
        <nav className="flex items-center gap-2">
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
              Autonomy readiness, quantified
            </span>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">
              Is your property ready for the robots?
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
              RoboReady assesses commercial buildings for robot, drone, and autonomous-vehicle
              deployment. Run an AI assessment, get a 0–100 RoboReady Score, and plan exactly what
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
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-xl border bg-card p-8 shadow-sm">
              <ScoreGauge score={82} size={260} />
              <p className="mt-4 max-w-xs text-center text-sm text-muted-foreground">
                Example: a mid-size hotel scoring 82 — ready for delivery robots, with minor
                elevator-integration work.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t bg-secondary/40">
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
              title="Infrastructure planning"
              body="Place chargers, landing pads, and staging zones on a satellite map of the site."
            />
            <Feature
              icon={FileText}
              title="Client-ready reports"
              body="Export a branded PDF and share a live portal with stakeholders."
            />
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} RoboReady. All rights reserved.</p>
        </div>
      </footer>
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
