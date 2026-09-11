"use server"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { membership, user } from "@/lib/db/schema"
import { requireOrgContext } from "@/lib/tenancy"

export async function listMembers() {
  const ctx = await requireOrgContext()
  return db
    .select({
      userId: membership.userId,
      role: membership.role,
      name: user.name,
      email: user.email,
      joinedAt: membership.createdAt,
    })
    .from(membership)
    .innerJoin(user, eq(user.id, membership.userId))
    .where(eq(membership.organizationId, ctx.organizationId))
}
