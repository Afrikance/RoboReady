import "server-only"

import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { assessment, cyberFleetReferral, partnerSetting, property } from "@/lib/db/schema"
import { createNotification } from "@/lib/notifications"
import {
  DEFAULT_SCORE_RANGE,
  isQualifyingScore,
  PARTNER,
  type ReferralCtaData,
  type ReferralStatus,
  type ScoreRange,
} from "@/lib/cyber-fleet"

/**
 * Reads a workspace's partner configuration, falling back to the built-in
 * defaults (Cyber Fleet enabled, qualifying band 50-100) when no row exists.
 */
/**
 * Assembles the data a client-facing referral CTA needs for one property: its
 * current referral status (if any), whether its score qualifies under the
 * workspace band, and the owner's name/email to prefill the request form.
 */
export async function buildReferralCtaData(input: {
  organizationId: string
  propertyId: string
  score: number | null
  userName?: string | null
  userEmail?: string | null
}): Promise<ReferralCtaData> {
  try {
    const range = await getPartnerSetting(input.organizationId)
    const [row] = await db
      .select({ status: cyberFleetReferral.status })
      .from(cyberFleetReferral)
      .where(
        and(
          eq(cyberFleetReferral.propertyId, input.propertyId),
          eq(cyberFleetReferral.organizationId, input.organizationId),
        ),
      )
      .limit(1)
    return {
      status: (row?.status as ReferralStatus | undefined) ?? null,
      qualifies: isQualifyingScore(input.score, range),
      defaultName: input.userName ?? null,
      defaultEmail: input.userEmail ?? null,
    }
  } catch (err) {
    console.log("[v0] buildReferralCtaData failed:", (err as Error).message)
    return { status: null, qualifies: false }
  }
}

export async function getPartnerSetting(organizationId: string): Promise<ScoreRange> {
  try {
    const [row] = await db
      .select()
      .from(partnerSetting)
      .where(eq(partnerSetting.organizationId, organizationId))
      .limit(1)
    if (!row) return DEFAULT_SCORE_RANGE
    return { min: row.qualifyMinScore, max: row.qualifyMaxScore, enabled: row.cyberFleetEnabled }
  } catch (err) {
    console.log("[v0] getPartnerSetting failed:", (err as Error).message)
    return DEFAULT_SCORE_RANGE
  }
}

/**
 * Called at the end of the assessment lifecycle. If the property's latest score
 * falls inside the workspace's qualifying band, this upserts an `eligible`
 * Cyber Fleet referral for the property and notifies the owner exactly once
 * (the first time it becomes eligible). Idempotent and best-effort: it must
 * never break the assessment flow, so all failures are swallowed with a log.
 *
 * There is no cron in this app, so the qualifying moment IS the notification
 * moment; admins can later nudge non-acting owners with a manual reminder.
 */
export async function evaluateReferralEligibility(input: {
  organizationId: string
  propertyId: string
  ownerUserId: string
}): Promise<void> {
  const { organizationId, propertyId, ownerUserId } = input
  try {
    const range = await getPartnerSetting(organizationId)
    if (!range.enabled) return

    const [assess] = await db
      .select({ id: assessment.id, score: assessment.roboReadyScore })
      .from(assessment)
      .where(and(eq(assessment.propertyId, propertyId), eq(assessment.organizationId, organizationId)))
      .orderBy(desc(assessment.version))
      .limit(1)
    if (!assess) return

    const qualifies = isQualifyingScore(assess.score, range)
    if (!qualifies) return

    const [existing] = await db
      .select()
      .from(cyberFleetReferral)
      .where(and(eq(cyberFleetReferral.propertyId, propertyId), eq(cyberFleetReferral.organizationId, organizationId)))
      .limit(1)

    if (existing) {
      // Refresh the score snapshot but never regress a further-along status or
      // re-notify. Only a still-`eligible` row is kept in sync.
      await db
        .update(cyberFleetReferral)
        .set({ assessmentId: assess.id, roboReadyScore: assess.score ?? null, updatedAt: new Date() })
        .where(eq(cyberFleetReferral.id, existing.id))
      return
    }

    const [prop] = await db
      .select({ name: property.name })
      .from(property)
      .where(eq(property.id, propertyId))
      .limit(1)

    await db.insert(cyberFleetReferral).values({
      id: crypto.randomUUID(),
      organizationId,
      propertyId,
      assessmentId: assess.id,
      roboReadyScore: assess.score ?? null,
      ownerUserId,
      createdByUserId: ownerUserId,
      status: "eligible",
    })

    await createNotification({
      organizationId,
      userId: ownerUserId,
      type: "cyber_fleet_eligible",
      title: `${prop?.name ?? "Your property"} qualifies for ${PARTNER.name}`,
      body: `Your RoboReady Score means this site is a strong fit for autonomous security and robotics operations. Request a ${PARTNER.name} evaluation now, or come back to it anytime from your report.`,
      href: `/dashboard/properties/${propertyId}`,
      propertyId,
    })
  } catch (err) {
    console.log("[v0] evaluateReferralEligibility failed:", (err as Error).message)
  }
}
