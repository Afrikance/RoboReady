/**
 * Client-safe role primitives. Kept free of any server-only imports (no
 * `next/headers`, no db) so both server code (lib/tenancy.ts) and client code
 * (lib/access.ts → the sidebar) can share one definition.
 */

export type Role = "owner" | "admin" | "member" | "operator" | "client" | "vendor" | "contractor"

/** Field roles that can be assigned to build out a property's assessment. */
export const FIELD_ROLES = ["operator", "vendor", "contractor"] as const
export type FieldRole = (typeof FIELD_ROLES)[number]

export function isFieldRole(role: Role): role is FieldRole {
  return role === "operator" || role === "vendor" || role === "contractor"
}

/** Roles an owner/admin may assign when inviting someone. */
export const ASSIGNABLE_ROLES: Role[] = ["admin", "member", "operator", "vendor", "contractor", "client"]

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  operator: "Field Operator",
  vendor: "Vendor",
  contractor: "Contractor",
  client: "Client",
}
