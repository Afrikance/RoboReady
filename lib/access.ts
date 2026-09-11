import type { Role } from "@/lib/tenancy"

/**
 * Field Operators are on-site data collectors, so they are intentionally scoped
 * to a narrow slice of the app: filling intake forms and uploading documents on
 * a property, managing their own sales leads, and downloading the blank intake
 * form from Settings. Everything else — the portfolio overview, AI activity,
 * reports, team management, and the analysis tabs on a property — is hidden and
 * redirected away. Gating is by explicit role, not the permission hierarchy
 * (operators share a rank with members), so these checks name the role directly.
 *
 * These helpers are pure and client-safe: the sidebar filters nav with them and
 * server pages reuse them to guard access.
 */

/** Dashboard sidebar destinations a Field Operator may open. */
const OPERATOR_NAV_HREFS = new Set(["/dashboard/leads", "/dashboard/properties", "/dashboard/settings"])

/** Property detail tabs a Field Operator may open. */
const OPERATOR_PROPERTY_TABS = new Set(["intake", "documents"])

/** Where operators are sent when they hit a page they cannot access. */
export const OPERATOR_HOME = "/dashboard/properties"

export function isOperator(role: Role): boolean {
  return role === "operator"
}

export function canUseNavHref(role: Role, href: string): boolean {
  if (role !== "operator") return true
  return OPERATOR_NAV_HREFS.has(href)
}

export function canUsePropertyTab(role: Role, tabId: string): boolean {
  if (role !== "operator") return true
  return OPERATOR_PROPERTY_TABS.has(tabId)
}
