import { NextResponse } from "next/server"
import { getRoboDefaultOpen } from "@/lib/site-settings"

export const dynamic = "force-dynamic"

export async function GET() {
  const defaultOpen = await getRoboDefaultOpen()
  return NextResponse.json(
    { defaultOpen },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  )
}
