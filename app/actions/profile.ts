"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { recordAudit } from "@/lib/tenancy"
import { eq } from "drizzle-orm"

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120, "Name must be 120 characters or fewer."),
  phone: z.string().trim().max(40, "Phone number must be 40 characters or fewer.").transform((value) => value || null),
  addressLine1: z.string().trim().max(160, "Address must be 160 characters or fewer.").transform((value) => value || null),
  addressLine2: z.string().trim().max(160, "Address must be 160 characters or fewer.").transform((value) => value || null),
  city: z.string().trim().max(100, "City must be 100 characters or fewer.").transform((value) => value || null),
  region: z.string().trim().max(100, "State or region must be 100 characters or fewer.").transform((value) => value || null),
  postalCode: z.string().trim().max(32, "Postal code must be 32 characters or fewer.").transform((value) => value || null),
  country: z.string().trim().max(100, "Country must be 100 characters or fewer.").transform((value) => value || null),
})

export async function updateAccountProfile(input: unknown) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false as const, error: "Your session has expired. Sign in and try again." }

  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check your profile details and try again." }
  }

  const [updatedProfile] = await db
    .update(user)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))
    .returning({
      name: user.name,
      phone: user.phone,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      city: user.city,
      region: user.region,
      postalCode: user.postalCode,
      country: user.country,
    })

  if (!updatedProfile) return { ok: false as const, error: "Could not update your profile. Please try again." }

  await recordAudit({
    organizationId: null,
    userId: session.user.id,
    action: "account.profile_updated",
    entityType: "user",
    entityId: session.user.id,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/settings")

  return { ok: true as const, profile: updatedProfile }
}
