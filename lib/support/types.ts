// Shared, client-safe support types (no server-only imports).

export const INQUIRY_TOPICS = ["question", "demo", "pricing", "support", "partnership", "other"] as const
export type InquiryTopic = (typeof INQUIRY_TOPICS)[number]

export const INQUIRY_STATUSES = ["new", "in_progress", "resolved"] as const
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number]

export const TOPIC_LABELS: Record<InquiryTopic, string> = {
  question: "General question",
  demo: "Demo request",
  pricing: "Pricing",
  support: "Support",
  partnership: "Partnership",
  other: "Other",
}

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
}

export type ChatRole = "user" | "assistant"

export type ChatMessage = {
  role: ChatRole
  content: string
}

export function isInquiryTopic(value: unknown): value is InquiryTopic {
  return typeof value === "string" && (INQUIRY_TOPICS as readonly string[]).includes(value)
}

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === "string" && (INQUIRY_STATUSES as readonly string[]).includes(value)
}
