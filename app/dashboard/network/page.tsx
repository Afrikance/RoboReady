import { NetworkExplorer } from "@/components/network/network-explorer"
import { orgHasProNetworkAccess, resolveNetworkAudience, searchNetwork } from "@/lib/network/data"

export const metadata = { title: "Network" }

export default async function DashboardNetworkPage() {
  const { audience, isCarePlan } = await resolveNetworkAudience()
  const [listings, aiEnabled] = await Promise.all([searchNetwork({}, audience), orgHasProNetworkAccess()])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Powered by RoboArrival</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">Autonomous Ready Properties Network</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
          Every assessed property published to the network — searchable by amenity, mapped, with live autonomous-vehicle
          arrival tracking.
        </p>
      </div>

      <NetworkExplorer listings={listings} signedIn isCarePlan={isCarePlan} aiEnabled={aiEnabled} />
    </div>
  )
}
