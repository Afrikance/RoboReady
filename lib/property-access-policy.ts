export type PropertyAccessPurpose = "property" | "read" | "intake" | "documents" | "report" | "billing" | "operations"

export type PropertyAccessInput = {
  role: string
  purpose: PropertyAccessPurpose
  isOwner: boolean
  isAssigned: boolean
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
