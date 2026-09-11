import Link from "next/link"
import type { ReactNode } from "react"
import { Logo } from "@/components/brand/logo"
import { SiteFooter } from "@/components/marketing/site-footer"

/** Shared chrome + typography for static legal pages. */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center border-b px-6">
        <Link href="/" aria-label="RoboReady home">
          <Logo size="md" />
        </Link>
      </header>
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
          <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:text-pretty">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
