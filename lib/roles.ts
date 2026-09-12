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

/**
 * Roles the Super Admin / Sub-Admins may assign when inviting someone.
 * "owner" (Super Admin) is intentionally excluded — there is exactly one, keyed
 * to a single account — and "member" is legacy and no longer offered.
 */
export const ASSIGNABLE_ROLES: Role[] = ["admin", "client", "operator", "vendor", "contractor"]

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Super Admin",
  admin: "Sub-Admin",
  member: "Member",
  operator: "Field Operator",
  vendor: "Vendor",
  contractor: "Contractor",
  client: "Client",
}

/** Property owners / customers. The default role for a self-service sign-up. */
export function isClient(role: Role): boolean {
  return role === "client"
}
