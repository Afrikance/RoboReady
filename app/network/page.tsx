import Link from "next/link"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/marketing/site-footer"
import { NetworkExplorer } from "@/components/network/network-explorer"
import { resolveNetworkAudience, searchNetwork } from "@/lib/network/data"

export const metadata = {
  title: "Autonomous Ready Properties Network — powered by RoboArrival",
  description:
    "Search assessed autonomous-ready properties: EV Level 3 chargers, CyberCab & robotaxi pickup points, air-taxi landing pads, humanoid-robot-cleared sites, ADA-compliant loading, and idle-AV parking.",
}

export default async function NetworkPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const signedIn = !!session?.user

  const { audience, isCarePlan } = await resolveNetworkAudience()
  const listings = await searchNetwork({}, audience)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6">
        <Link href="/" aria-label="RoboReady home">
          <Logo size="sm" />
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/how-it-works">How it works</Link>
          </Button>
          {signedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard/network">Open dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Powered by RoboArrival</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Autonomous Ready Properties Network
          </h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            Find where autonomous vehicles, robots, and air taxis can already operate. Search assessed properties by
            amenity — EV Level 3 charging, CyberCab pickup, air-taxi landing pads, humanoid-robot clearance, ADA loading,
            and idle-AV parking — and track live arrivals as the network comes online.
          </p>
        </div>

        <NetworkExplorer listings={listings} signedIn={signedIn} isCarePlan={isCarePlan} />
      </main>

      <SiteFooter />
    </div>
  )
}
