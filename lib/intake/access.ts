import type { Role } from "@/lib/tenancy"

// Intake-form download access (master spec: Admins, Clients, and Field
// Operators). Gating is by explicit role, not the permission hierarchy, so a
// Client (low rank) can export while a Member cannot. Owners are treated as
// admins and get both.
//
// - Blank template  → Field Operators take it on-site: operator, admin, owner
// - Filled export   → Clients receive it, admins produce it: client, admin, owner

export function canDownloadBlankIntake(role: Role): boolean {
  return role === "operator" || role === "admin" || role === "owner"
}

export function canDownloadFilledIntake(role: Role): boolean {
  return role === "client" || role === "admin" || role === "owner"
}

export function canAccessIntakeDownloads(role: Role): boolean {
  return canDownloadBlankIntake(role) || canDownloadFilledIntake(role)
}
