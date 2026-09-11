// Plain (non-"use server") module so these runtime constants and types can be
// imported by both server actions and client components. A "use server" file
// may only export async functions.

export const LEAD_STAGES = ["new", "qualifying", "qualified", "proposal", "won", "lost"] as const
export type LeadStage = (typeof LEAD_STAGES)[number]

export type LeadInput = {
  company: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  source?: string
  estimatedValue?: number | null
  notes?: string
}
