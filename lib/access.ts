import { isClient, isFieldRole, type Role } from "@/lib/roles"

/**
 * Field roles (Field Operator, Vendor, Contractor) are on-site staff who build
 * out a property's assessment, so they are intentionally scoped to a narrow
 * slice of the app: filling intake forms and uploading documents on a property,
 * working the field-work handover queue, managing their own sales leads, and
 * downloading the blank intake form from Settings. Everything else — the
 * portfolio overview, AI activity, reports, team management, the prospect
 * database, the verification queue, and the analysis tabs on a property — is
 * hidden and redirected away. Gating is by explicit role, not the permission
 * hierarchy (field roles share a rank with members), so these checks name the
 * roles directly.
 *
 * These helpers are pure and client-safe: the sidebar filters nav with them and
 * server pages reuse them to guard access.
 */

/** Dashboard sidebar destinations a Field Operator may open. */
const OPERATOR_NAV_HREFS = new Set([
  "/dashboard/leads",
  "/dashboard/properties",
  "/dashboard/handover",
  "/dashboard/settings",
])

/** Destinations only admins/owners may open. */
const ADMIN_ONLY_NAV_HREFS = new Set([
  "/dashboard/properties/database",
  "/dashboard/verification",
  "/dashboard/support",
])

/**
 * Dashboard sidebar destinations a Client (property owner) may open. Clients
 * see their own portfolio and reports and manage their account — not the sales,
 * field-work, prospecting, AI-ops, or team surfaces, which belong to staff.
 */
const CLIENT_NAV_HREFS = new Set([
  "/dashboard",
  "/dashboard/properties",
  "/dashboard/reports",
  "/dashboard/cyber-fleet",
  "/dashboard/settings",
])

/** Where a Client is sent when they hit a page they cannot access. */
export const CLIENT_HOME = "/dashboard"

/** Property detail tabs a Field Operator may open. */
const OPERATOR_PROPERTY_TABS = new Set(["intake", "documents"])

/** Where field staff are sent when they hit a page they cannot access. */
export const OPERATOR_HOME = "/dashboard/properties"

export function isOperator(role: Role): boolean {
  return isFieldRole(role)
}

export function isAdminRole(role: Role): boolean {
  return role === "admin" || role === "owner"
}

// Re-export so pages can guard client-only redirects from a single module.
export { isClient }

export function canUseNavHref(role: Role, href: string): boolean {
  if (isFieldRole(role)) return OPERATOR_NAV_HREFS.has(href)
  if (isClient(role)) return CLIENT_NAV_HREFS.has(href)
  // The field-work queue is a shared field-staff + admin surface; hide it from
  // ordinary members and clients.
  if (href === "/dashboard/handover") return isAdminRole(role)
  if (ADMIN_ONLY_NAV_HREFS.has(href)) return isAdminRole(role)
  return true
}

/** Adding a property to the prospect database is a staff (admin/owner) action. */
export function canCreateProspect(role: Role): boolean {
  return isAdminRole(role)
}

export function canUsePropertyTab(role: Role, tabId: string): boolean {
  if (!isFieldRole(role)) return true
  return OPERATOR_PROPERTY_TABS.has(tabId)
}

/** The field-work handover queue: field staff plus admins/owners. */
export function canAccessHandover(role: Role): boolean {
  return isFieldRole(role) || isAdminRole(role)
}

/** The prospect database (AI prospecting + manual add): admins/owners only. */
export function canAccessProspectDatabase(role: Role): boolean {
  return isAdminRole(role)
}

/** The admin verification queue: admins/owners only. */
export function canAccessVerification(role: Role): boolean {
  return isAdminRole(role)
}

/** The Robo support inbox: admins/owners only. */
export function canAccessSupport(role: Role): boolean {
  return isAdminRole(role)
}

/** Inviting members, changing roles, and assigning staff: admins/owners only. */
export function canManageTeam(role: Role): boolean {
  return isAdminRole(role)
}
