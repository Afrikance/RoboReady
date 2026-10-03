import "server-only"

import { and, eq, inArray, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { property, propertyAssignment } from "@/lib/db/schema"
import { isFieldRole, type OrgContext } from "@/lib/tenancy"

export type PropertyScope = { blocked: boolean; extra?: SQL }

/** Returns the property-table filter for the caller's role in the shared org. */
export async function getPropertyScope(ctx: OrgContext): Promise<PropertyScope> {
  if (isFieldRole(ctx.role)) {
    const assignments = await db
      .select({ propertyId: propertyAssignment.propertyId })
      .from(propertyAssignment)
      .where(
        and(
          eq(propertyAssignment.organizationId, ctx.organizationId),
          eq(propertyAssignment.userId, ctx.user.id),
        ),
      )
    const propertyIds = assignments.map((assignment) => assignment.propertyId)
    if (propertyIds.length === 0) return { blocked: true }
    return { blocked: false, extra: inArray(property.id, propertyIds) }
  }

  if (ctx.role === "client") {
    return { blocked: false, extra: eq(property.createdByUserId, ctx.user.id) }
  }

  return { blocked: false }
}

/** Looks up a property only when the caller may access it; unauthorized IDs are indistinguishable from missing ones. */
export async function getAccessibleProperty(ctx: OrgContext, propertyId: string) {
  const scope = await getPropertyScope(ctx)
  const rows = await db
    .select()
    .from(property)
    .where(
      and(
        eq(property.id, propertyId),
        eq(property.organizationId, ctx.organizationId),
        scope.blocked ? sql`false` : scope.extra,
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function canAccessProperty(ctx: OrgContext, propertyId: string): Promise<boolean> {
  return (await getAccessibleProperty(ctx, propertyId)) !== null
}

/** Role checks use explicit distinctions rather than treating field staff as full members. */
export function canManagePropertyAnalysis(role: OrgContext["role"]): boolean {
  return role === "owner" || role === "admin" || role === "member"
}

export function canManagePropertyAssets(role: OrgContext["role"]): boolean {
  return role === "owner" || role === "admin" || role === "member"
}

export function canDeletePropertyDocuments(role: OrgContext["role"]): boolean {
  return role === "owner" || role === "admin" || role === "member"
}

export function canManagePropertyAssignments(role: OrgContext["role"]): boolean {
  return role === "owner" || role === "admin"
}

export function propertyScopeCondition(scope: PropertyScope): SQL {
  return scope.blocked ? sql`false` : scope.extra ?? sql`true`
}

export function propertyFilter(ctx: OrgContext, scope: PropertyScope): SQL {
  return and(eq(property.organizationId, ctx.organizationId), propertyScopeCondition(scope))!
}

export function propertyIdFilter(propertyId: string): SQL {
  return eq(property.id, propertyId)
}

export function propertyIdsFilter(propertyIds: string[]): SQL {
  return propertyIds.length ? inArray(property.id, propertyIds) : sql`false`
}

export function combinePropertyFilters(...filters: (SQL | undefined)[]): SQL {
  return and(...filters.filter((filter): filter is SQL => Boolean(filter)))!
}

export async function getAccessiblePropertyIds(ctx: OrgContext): Promise<string[] | null> {
  const scope = await getPropertyScope(ctx)
  if (scope.blocked) return []
  if (ctx.role === "client") {
    const rows = await db
      .select({ id: property.id })
      .from(property)
      .where(and(eq(property.organizationId, ctx.organizationId), eq(property.createdByUserId, ctx.user.id)))
    return rows.map((row) => row.id)
  }
  if (isFieldRole(ctx.role)) {
    const rows = await db
      .select({ propertyId: propertyAssignment.propertyId })
      .from(propertyAssignment)
      .where(
        and(
          eq(propertyAssignment.organizationId, ctx.organizationId),
          eq(propertyAssignment.userId, ctx.user.id),
        ),
      )
    return rows.map((row) => row.propertyId)
  }
  return null
}

export function propertyIdsCondition(ids: string[] | null): SQL | undefined {
  return ids === null ? undefined : ids.length ? inArray(property.id, ids) : sql`false`
}

export function scopedPropertyWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return combinePropertyFilters(
    eq(property.organizationId, ctx.organizationId),
    propertyScopeCondition(scope),
    propertyId ? eq(property.id, propertyId) : undefined,
  )
}

export function propertyTableInArray(ids: string[]): SQL {
  return ids.length ? inArray(property.id, ids) : sql`false`
}

export function propertyTableAlwaysTrue(): SQL {
  return sql`true`
}

export function propertyTableAlwaysFalse(): SQL {
  return sql`false`
}

export function propertyTableOrgFilter(organizationId: string): SQL {
  return eq(property.organizationId, organizationId)
}

export function propertyTableOwnerFilter(userId: string): SQL {
  return eq(property.createdByUserId, userId)
}

export function propertyTableAssignmentFilter(userId: string, organizationId: string): SQL {
  return and(
    eq(propertyAssignment.userId, userId),
    eq(propertyAssignment.organizationId, organizationId),
  )!
}

export function propertyTableIdFilter(propertyId: string): SQL {
  return eq(property.id, propertyId)
}

export function propertyTableCombinedFilter(...filters: (SQL | undefined)[]): SQL {
  return and(...filters.filter((filter): filter is SQL => Boolean(filter)))!
}

export function propertyTableJoinedFilter(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableCombinedFilter(
    propertyTableOrgFilter(ctx.organizationId),
    propertyScopeCondition(scope),
    propertyTableIdFilter(propertyId),
  )
}

export function propertyTableIdsFilter(propertyIds: string[]): SQL {
  return propertyIds.length ? inArray(property.id, propertyIds) : sql`false`
}

export function propertyTableScopeFilter(ctx: OrgContext, scope: PropertyScope): SQL {
  return propertyTableCombinedFilter(propertyTableOrgFilter(ctx.organizationId), propertyScopeCondition(scope))
}

export function propertyTablePropertyScope(scope: PropertyScope): SQL {
  return scope.blocked ? sql`false` : scope.extra ?? sql`true`
}

export function propertyTableRowScope(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableCombinedFilter(
    propertyTableIdFilter(propertyId),
    propertyTableOrgFilter(ctx.organizationId),
    propertyTablePropertyScope(scope),
  )
}

export function propertyTableScopeForRole(ctx: OrgContext, scope: PropertyScope): SQL {
  return propertyTableCombinedFilter(
    propertyTableOrgFilter(ctx.organizationId),
    propertyTablePropertyScope(scope),
  )
}

export function propertyTableIdAndScope(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableCombinedFilter(
    propertyTableOrgFilter(ctx.organizationId),
    propertyTableIdFilter(propertyId),
    propertyTablePropertyScope(scope),
  )
}

export function propertyTableOrgAndProperty(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableIdAndScope(ctx, scope, propertyId)
}

export function propertyTableScopePredicate(ctx: OrgContext, scope: PropertyScope): SQL {
  return propertyTableScopeForRole(ctx, scope)
}

export function propertyTableScopePredicateForId(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableIdAndScope(ctx, scope, propertyId)
}

export function propertyTableScopePredicateForIds(ctx: OrgContext, scope: PropertyScope, ids: string[]): SQL {
  return propertyTableCombinedFilter(
    propertyTableScopeForRole(ctx, scope),
    propertyTableIdsFilter(ids),
  )
}

export function propertyTableScopePredicateForOptionalId(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableCombinedFilter(
    propertyTableScopeForRole(ctx, scope),
    propertyId ? propertyTableIdFilter(propertyId) : undefined,
  )
}

export function propertyTableScopedIdFilter(ctx: OrgContext, propertyId: string): SQL {
  return propertyTableCombinedFilter(
    propertyTableOrgFilter(ctx.organizationId),
    propertyTableIdFilter(propertyId),
  )
}

export function propertyTableScopedFilter(ctx: OrgContext): SQL {
  return propertyTableOrgFilter(ctx.organizationId)
}

export function propertyTableScopeAndOrg(ctx: OrgContext, scope: PropertyScope): SQL {
  return propertyTableCombinedFilter(propertyTableOrgFilter(ctx.organizationId), propertyTablePropertyScope(scope))
}

export function propertyTableScopedProperty(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableCombinedFilter(
    propertyTableOrgFilter(ctx.organizationId),
    propertyTableIdFilter(propertyId),
    propertyTablePropertyScope(scope),
  )
}

export function propertyTableQueryFilter(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableCombinedFilter(
    propertyTableOrgFilter(ctx.organizationId),
    propertyTablePropertyScope(scope),
    propertyId ? propertyTableIdFilter(propertyId) : undefined,
  )
}

export function propertyTableRowsFilter(ctx: OrgContext, scope: PropertyScope): SQL {
  return propertyTableCombinedFilter(propertyTableOrgFilter(ctx.organizationId), propertyTablePropertyScope(scope))
}

export function propertyTableOnlyFilter(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableCombinedFilter(propertyTableOrgFilter(ctx.organizationId), propertyTableIdFilter(propertyId), propertyTablePropertyScope(scope))
}

export function propertyTableScopedFilterForId(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableOnlyFilter(ctx, scope, propertyId)
}

export function propertyTableScopeOnly(ctx: OrgContext, scope: PropertyScope): SQL {
  return propertyTableRowsFilter(ctx, scope)
}

export function propertyTableScopeById(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableOnlyFilter(ctx, scope, propertyId)
}

export function propertyTableFilterForUser(ctx: OrgContext, scope: PropertyScope): SQL {
  return propertyTableRowsFilter(ctx, scope)
}

export function propertyTableFilterForProperty(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableOnlyFilter(ctx, scope, propertyId)
}

export function propertyTableWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableQueryFilter(ctx, scope, propertyId)
}

export function propertyTableAuthorizationWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableWhere(ctx, scope, propertyId)
}

export function propertyTableAccessWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorizationWhere(ctx, scope, propertyId)
}

export function propertyTableAccessFilter(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessWhere(ctx, scope, propertyId)
}

export function propertyTableAccessPredicate(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessFilter(ctx, scope, propertyId)
}

export function propertyTableScopedAccess(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessPredicate(ctx, scope, propertyId)
}

export function propertyTableAccessibleWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableScopedAccess(ctx, scope, propertyId)
}

export function propertyTableAuthorizedWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessibleWhere(ctx, scope, propertyId)
}

export function propertyTableAccessClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorizedWhere(ctx, scope, propertyId)
}

export function propertyTablePermissionFilter(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessClause(ctx, scope, propertyId)
}

export function propertyTableCondition(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTablePermissionFilter(ctx, scope, propertyId)
}

export function propertyTableAuthorizationCondition(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableCondition(ctx, scope, propertyId)
}

export function propertyTableScopeCondition(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorizationCondition(ctx, scope, propertyId)
}

export function propertyTableSqlCondition(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableScopeCondition(ctx, scope, propertyId)
}

export function propertyTableConditionForProperty(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableSqlCondition(ctx, scope, propertyId)
}

export function propertyTableConditionForScope(ctx: OrgContext, scope: PropertyScope): SQL {
  return propertyTableSqlCondition(ctx, scope)
}

export function propertyTableConditionForIds(ctx: OrgContext, scope: PropertyScope, ids: string[]): SQL {
  return propertyTableCombinedFilter(
    propertyTableConditionForScope(ctx, scope),
    propertyTableIdsFilter(ids),
  )
}

export function propertyTableConditionForOptionalId(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableCombinedFilter(
    propertyTableConditionForScope(ctx, scope),
    propertyId ? propertyTableIdFilter(propertyId) : undefined,
  )
}

export function propertyTableCombinedScope(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableConditionForOptionalId(ctx, scope, propertyId)
}

export function propertyTableFinalWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableCombinedScope(ctx, scope, propertyId)
}

export function propertyTableFinalPredicate(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableFinalWhere(ctx, scope, propertyId)
}

export function propertyTableFinalFilter(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableFinalPredicate(ctx, scope, propertyId)
}

export function propertyTableFinalCondition(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableFinalFilter(ctx, scope, propertyId)
}

export function propertyTableAuthorizationFilter(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableFinalCondition(ctx, scope, propertyId)
}

export function propertyTableScopeForQuery(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorizationFilter(ctx, scope, propertyId)
}

export function propertyTableScopeForQueryById(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableScopeForQuery(ctx, scope, propertyId)
}

export function propertyTablePermissionWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableScopeForQuery(ctx, scope, propertyId)
}

export function propertyTableAuthorizedFilter(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTablePermissionWhere(ctx, scope, propertyId)
}

export function propertyTableAllowedWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorizedFilter(ctx, scope, propertyId)
}

export function propertyTableWhereAllowed(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAllowedWhere(ctx, scope, propertyId)
}

export function propertyTableScopeWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableWhereAllowed(ctx, scope, propertyId)
}

export function propertyTableSimpleWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableScopeWhere(ctx, scope, propertyId)
}

export function propertyTableBuildWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableSimpleWhere(ctx, scope, propertyId)
}

export function propertyTableCreateWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableBuildWhere(ctx, scope, propertyId)
}

export function propertyTableScopedWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableCreateWhere(ctx, scope, propertyId)
}

export function propertyTableSecureWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableScopedWhere(ctx, scope, propertyId)
}

export function propertyTableSafeWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableSecureWhere(ctx, scope, propertyId)
}

export function propertyTableSafePredicate(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableSafeWhere(ctx, scope, propertyId)
}

export function propertyTablePredicate(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableSafePredicate(ctx, scope, propertyId)
}

export function propertyTableSecurityWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTablePredicate(ctx, scope, propertyId)
}

export function propertyTablePolicy(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableSecurityWhere(ctx, scope, propertyId)
}

export function propertyTableRlsLikeFilter(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTablePolicy(ctx, scope, propertyId)
}

export function propertyTableAuthorizedCondition(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableRlsLikeFilter(ctx, scope, propertyId)
}

export function propertyTableAccessPolicy(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorizedCondition(ctx, scope, propertyId)
}

export function propertyTableScopePolicy(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessPolicy(ctx, scope, propertyId)
}

export function propertyTableSecurityPolicy(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableScopePolicy(ctx, scope, propertyId)
}

export function propertyTableRequireAccess(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableSecurityPolicy(ctx, scope, propertyId)
}

export function propertyTableAuthorize(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableRequireAccess(ctx, scope, propertyId)
}

export function propertyTableAuthWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorize(ctx, scope, propertyId)
}

export function propertyTableAccessSQL(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthWhere(ctx, scope, propertyId)
}

export function propertyTableWhereClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessSQL(ctx, scope, propertyId)
}

export function propertyTableAuthorizedSQL(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableWhereClause(ctx, scope, propertyId)
}

export function propertyTableConditionBuilder(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorizedSQL(ctx, scope, propertyId)
}

export function propertyTableQueryCondition(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableConditionBuilder(ctx, scope, propertyId)
}

export function propertyTableRowCondition(ctx: OrgContext, scope: PropertyScope, propertyId: string): SQL {
  return propertyTableQueryCondition(ctx, scope, propertyId)
}

export function propertyTableRowsCondition(ctx: OrgContext, scope: PropertyScope): SQL {
  return propertyTableQueryCondition(ctx, scope)
}

export function propertyTableFinalClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableRowsCondition(ctx, scope)
}

export function propertyTableClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableFinalClause(ctx, scope, propertyId)
}

export function propertyTableWhereSQL(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableClause(ctx, scope, propertyId)
}

export function propertyTableFilterSQL(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableWhereSQL(ctx, scope, propertyId)
}

export function propertyTableAccessClauseSQL(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableFilterSQL(ctx, scope, propertyId)
}

export function propertyTableScopeSQL(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessClauseSQL(ctx, scope, propertyId)
}

export function propertyTableSecureSQL(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableScopeSQL(ctx, scope, propertyId)
}

export function propertyTableAccessibleSQL(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableSecureSQL(ctx, scope, propertyId)
}

export function propertyTableAuthorizedClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessibleSQL(ctx, scope, propertyId)
}

export function propertyTableSafeClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorizedClause(ctx, scope, propertyId)
}

export function propertyTableScopeClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableSafeClause(ctx, scope, propertyId)
}

export function propertyTablePolicyClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableScopeClause(ctx, scope, propertyId)
}

export function propertyTableAuthorizationClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTablePolicyClause(ctx, scope, propertyId)
}

export function propertyTablePredicateClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAuthorizationClause(ctx, scope, propertyId)
}

export function propertyTableWhereFilter(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTablePredicateClause(ctx, scope, propertyId)
}

export function propertyTableScopedCondition(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableWhereFilter(ctx, scope, propertyId)
}

export function propertyTableEffectiveWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableScopedCondition(ctx, scope, propertyId)
}

export function propertyTableSqlWhere(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableEffectiveWhere(ctx, scope, propertyId)
}

export function propertyTablePermissionSQL(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableSqlWhere(ctx, scope, propertyId)
}

export function propertyTableGate(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTablePermissionSQL(ctx, scope, propertyId)
}

export function propertyTableFilterClause(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableGate(ctx, scope, propertyId)
}

export function propertyTableAccessGate(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableFilterClause(ctx, scope, propertyId)
}

export function propertyTableAccessCheck(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessGate(ctx, scope, propertyId)
}

export function propertyTableGuard(ctx: OrgContext, scope: PropertyScope, propertyId?: string): SQL {
  return propertyTableAccessCheck(ctx, scope, propertyId)
}
