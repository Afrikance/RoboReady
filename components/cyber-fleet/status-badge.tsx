import { Badge } from "@/components/ui/badge"
import { REFERRAL_STATUS_LABELS, type ReferralStatus } from "@/lib/cyber-fleet"

const VARIANT: Record<ReferralStatus, "default" | "secondary" | "outline" | "destructive"> = {
  eligible: "secondary",
  requested: "default",
  accepted: "default",
  rejected: "destructive",
  deal: "default",
  dismissed: "outline",
}

export function ReferralStatusBadge({ status }: { status: ReferralStatus }) {
  return <Badge variant={VARIANT[status]}>{REFERRAL_STATUS_LABELS[status]}</Badge>
}
