import type React from "react"
import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { ShieldCheck, Bot, MapPin } from "lucide-react"

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Link href="/">
          <Logo invert />
        </Link>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-balance">
            Is your property ready for robotaxis?
          </h2>
          <p className="mt-4 leading-relaxed text-sidebar-foreground/70">
            Run AI-powered readiness assessments for autonomous ride-hail — Waymo, Tesla Cybercab,
            Zoox — plus robots and drones. Get a RoboReady Score and plan the infrastructure to
            deploy.
          </p>

          <ul className="mt-8 flex flex-col gap-4 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-accent">
                <Bot className="size-4 text-sidebar-primary" />
              </span>
              AI assessments graded 0–100
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-accent">
                <MapPin className="size-4 text-sidebar-primary" />
              </span>
              Map-based infrastructure planning
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-sidebar-accent">
                <ShieldCheck className="size-4 text-sidebar-primary" />
              </span>
              Client-ready reports and portals
            </li>
          </ul>
        </div>

        <p className="text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} RoboReady. Autonomy readiness, quantified.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/">
              <Logo />
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
