export type PropertyAccessPurpose = "property" | "read" | "intake" | "documents" | "report" | "billing" | "operations"

export type PropertyAccessInput = {
  role: string
  purpose: PropertyAccessPurpose
  isOwner: boolean
  isAssigned: boolean
}

/** A completed intake keeps its submitter's narrow access until verification. */
export function fieldCompletedIntakeBelongsToUser(
  intake: unknown,
  userId: string,
): boolean {
  if (!intake || typeof intake !== "object") return false
  const submission = intake as { status?: unknown; createdByUserId?: unknown }
  return submission.status === "completed" && submission.createdByUserId === userId
}

/** A field-work claim grants the same narrow property access as an assignment. */
export function fieldClaimBelongsToUser(metadata: unknown, userId: string): boolean {
  if (!metadata || typeof metadata !== "object") return false
  const pipeline = (metadata as { pipeline?: unknown }).pipeline
  if (!pipeline || typeof pipeline !== "object") return false
  const claim = (pipeline as { claim?: unknown }).claim
  if (!claim || typeof claim !== "object") return false
  return (claim as { byUserId?: unknown }).byUserId === userId
}

/** Pure role policy shared by server authorization and focused regression tests. */
export function canAccessProperty(input: PropertyAccessInput): boolean {
  if (input.role === "client") return input.isOwner && input.purpose !== "operations"

  if (["operator", "vendor", "contractor"].includes(input.role)) {
    return input.isAssigned && ["property", "intake", "documents"].includes(input.purpose)
  }

  return ["member", "admin", "owner"].includes(input.role)
}

export function meetsRoleRequirement(role: string, minimum: string): boolean {
  const ranks: Record<string, number> = {
    client: 0,
    operator: 0,
    vendor: 0,
    contractor: 0,
    member: 1,
    admin: 2,
    owner: 3,
  }
  return (ranks[role] ?? -1) >= (ranks[minimum] ?? Number.POSITIVE_INFINITY)
}
