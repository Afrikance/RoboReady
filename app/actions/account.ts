"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { ensureOrganization, recordAudit, getOrgContext } from "@/lib/tenancy"

export async function signOutAction() {
  const ctx = await getOrgContext()
  await recordAudit({
    organizationId: ctx?.organizationId ?? null,
    userId: ctx?.user.id ?? null,
    action: "auth.sign_out",
  })
  await auth.api.signOut({ headers: await headers() })
  redirect("/sign-in")
}

/** Ensures the signed-in user has an org; used when entering the dashboard. */
export async function bootstrapWorkspace() {
  await ensureOrganization()
}
