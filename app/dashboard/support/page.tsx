import { redirect } from "next/navigation"
import { Inbox } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getOrgContext } from "@/lib/tenancy"
import { canAccessSupport, OPERATOR_HOME } from "@/lib/access"
import { getInquiries } from "@/app/actions/support"
import { InquiryInbox } from "@/components/support/inquiry-inbox"
import type { ChatMessage, InquiryStatus, InquiryTopic } from "@/lib/support/types"

export const metadata = { title: "Support" }

export default async function SupportPage() {
  const ctx = await getOrgContext()
  if (!ctx || !canAccessSupport(ctx.role)) redirect(OPERATOR_HOME)

  const rows = await getInquiries()
  const openCount = rows.filter((r) => r.status === "new").length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "inquiry" : "inquiries"} captured by Robo
          {openCount > 0 ? ` — ${openCount} new` : ""}.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Inbox className="size-6" />
            </span>
            <div>
              <p className="font-medium">No inquiries yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                When visitors ask Robo to have the team follow up, their details land here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <InquiryInbox
          inquiries={rows.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            topic: r.topic as InquiryTopic,
            message: r.message,
            conversation: (r.conversation as ChatMessage[]) ?? [],
            status: r.status as InquiryStatus,
            pageUrl: r.pageUrl,
            createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
          }))}
        />
      )}
    </div>
  )
}
