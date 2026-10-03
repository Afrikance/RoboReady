# RoboReady security readiness evidence

**Assessment date:** 2026-10-03  
**Scope:** repository and connected Neon schema inspected during this pass; no production migration, destructive probe, external integration, or deployment-setting change was performed. This is an engineering readiness snapshot, not an audit opinion or SOC 2 / ISO 27001 certification.

## Confirmed findings and remediation

| Severity | Finding / scenario | Reference | Remediation in this pass | Residual risk |
|---|---|---|---|---|
| High | The app uses one shared organization. Several property-bound reads/actions previously checked only organization membership, allowing a client to try another property ID and retrieve or mutate its records. | CWE-639; OWASP API1:2023 Broken Object Level Authorization | Added a shared property policy: clients must own the property; field roles must be assigned and are limited to property shell/intake/documents; staff access remains org-scoped. Applied it to assessment, plan, report, planner, asset, payment, subscription, referral, document, and tracker paths. Sensitive child queries include property and organization filters. | This pass covers the identified surfaces, not a formal proof of every action/API. Continue the route inventory and regression matrix before launch. |
| High | A signup whose email matched an implicit owner address, or an unverified invite email, could gain a privileged role; a solicited offer could transfer a property to an unverified matching account. | CWE-863; OWASP ASVS V4 | Owner bootstrap now requires an explicitly configured `SUPER_ADMIN_EMAIL` and a verified email; the hard-coded fallback was removed. Invite-role consumption and offer handover require `emailVerified`. Existing owner memberships are left intact. Ordinary signups still become clients. | Email verification delivery is not configured. New invitees therefore remain clients until verified and manually promoted; existing elevated memberships were not audited or rewritten. Existing owner memberships should be reviewed by the workspace owner. |
| High | Field-role members shared the `member` rank and could pass member-only server action checks beyond their intended work surfaces. | CWE-862; OWASP ASVS V4 | Field roles now rank below full members for role assertions, with an explicit allowlist for intake/documents and the shared field-work claim/release actions. Removing/demoting field staff transactionally removes their property assignments. | Verify the business role matrix against all future actions when adding new surfaces. |
| High | A document pathname in the shared organization could be used to request another property's private Blob object. | CWE-639; OWASP API1:2023 | File retrieval now authorizes the associated property and role before reading the private Blob; response names are normalized and content is marked `nosniff` with safe inline/attachment disposition. | Malware scanning is not present. MIME and extension checks remain based on client-supplied metadata; content-signature inspection is not implemented. |
| Medium | AI/report, uploads, invitations, and public support could be repeatedly invoked without an application-level shared limiter. | CWE-770; OWASP API4:2023 | Added atomic database-backed per-minute buckets for assessment/report/plans/planners, uploads, team invitations, assessment offers, and public support; upload request size is bounded before multipart parsing. | Fixed-window throttles are not a substitute for a tuned abuse program. Auth-provider-specific rate limits, alerts, and capacity testing remain unverified. |
| Medium | Browser response policy lacked CSP reporting and framework version disclosure remained enabled. | CWE-693; OWASP ASVS V14 | Disabled `X-Powered-By`, retained nosniff/referrer/frame/permissions headers, limited HSTS to production, and added a conservative CSP in Report-Only mode based on observed app integrations. | Report-Only does not block anything. Collect and review deployed reports before moving to an enforcing policy; confirm Stripe/Turnstile and other production origins. |

## Evidence matrix

| Control area | SOC 2 / ISO alignment | Code/config evidence observed | Automated evidence | Operational evidence still required | State |
|---|---|---|---|---|---|
| Governance, ownership, role management | CC1, CC2, CC6; ISO 27001 organizational/access controls | `lib/tenancy.ts`, `lib/roles.ts`, `app/actions/team.ts`; owner/admin/member/client/field roles; audit events on role and assignment changes | Property-policy unit tests; TypeScript check | Named control owners, access-review cadence, joiner/mover/leaver approvals, review legacy owner/admin memberships | Partial |
| Logical access and tenant isolation | CC6, CC7; ISO access control | Shared-org boundary is explicit; `getAuthorizedProperty` checks org, client ownership, and live field assignment; sensitive actions use the primitive | Policy tests cover owners vs non-owners, assigned vs unassigned field staff, field-operation limits, and role rank | Complete endpoint-by-endpoint negative authorization tests and production access-review evidence | Partial |
| Authentication and sessions | CC6; ISO identity/authentication | Better Auth email/password; generic sign-in error; Turnstile plugin is conditional on configured secret; seven-day session and one-day update age; development preview cookies use `SameSite=None; Secure`; CSRF/origin checks are not disabled | Source inspection only in this pass | Browser sign-in/reload/sign-out and cookie-attribute verification; verify production origins and provider throttles; implement email verification delivery before invite-based privilege provisioning | Partial / release blocker for invite automation |
| Encryption and database | CC6, CC7; ISO cryptography | Drizzle uses a shared `pg` pool from `DATABASE_URL`; app queries are server-side. Live schema snapshot showed RLS disabled on the inspected public tables, so authorization is application-enforced. | Schema/type checking only | Verify deployed TLS enforcement, secret rotation/access, backups, restore testing, and database network policy; review query scopes across the full app | Unknown operationally |
| File handling | CC6, CC7; ISO data protection | Document uploads use private Blob access, MIME/size allowlists, safe storage names, property authorization, and scoped download proxy | TypeScript; route code review | Malware scanning/quarantine, retention/deletion policy, deployed Blob access review, adversarial file-content tests | Partial |
| Secure development and changes | CC8; ISO secure development/change management | TypeScript strict mode; request validation and scoped mutations added; response headers in `next.config.mjs` | TypeScript and focused Node policy tests | CI branch protections, peer review records, release approvals, full lint/security CI | Partial |
| Vulnerability management and suppliers | CC7, CC9; ISO supplier/vulnerability controls | Dependencies are declared in `package.json` and lockfile | Audit not yet run in this pass | Run dependency advisory review, maintain remediation SLAs, review Vercel/Neon/Blob/Stripe/AI provider attestations and subprocessors | Unknown |
| Logging and monitoring | CC2, CC4, CC7; ISO logging/incident controls | Append-only-style application audit events are written through `recordAudit`; errors are logged; status changes and key actions emit audit events | No alert/log-retention test run | Confirm retention, alert routing, tamper resistance, PII minimization, incident exercises, and audit-log completeness | Partial |
| Availability and recovery | CC7, CC8; ISO continuity/backup controls | Database-backed fixed-window rate-limit buckets and bounded upload requests are present | Unit policy tests; no load/restore test | Verify provider quotas, autoscaling limits, backups, RPO/RTO, restore exercises, and DoS protections | Unknown |
| Privacy and data lifecycle | CC3, CC6; ISO privacy/data protection | Private property documents are streamed only after property authorization; portal/report routes require a signed-in session; no bearer links are implemented | Source inspection only | Confirm retention/deletion, subject requests, data inventory, consent/notice, vendor data-processing terms, and AI data handling | Partial |

## Verified non-findings and boundaries

- `/portal/[id]` is not a public bearer-token portal; it redirects anonymous users to sign-in and relies on the same report authorization as the in-app report.
- Document Blob access is configured as private in upload and retrieval code; deletion removes the Blob best-effort and removes its database row, so later proxy retrieval fails authorization.
- No caller-controlled outbound URL fetch was found in the reviewed property/report/document paths. Other external integrations should be reviewed when enabled.
- No secret value was intentionally printed or added. A secret-history scan has not yet been run.
- No claim is made that SOC 2 or ISO requirements are satisfied; certification requires independent audit and operational evidence.

## Prioritized follow-up

1. Configure and test email verification before re-enabling automated invite-role/property handover; until then, manually assign roles to existing users and review current privileged memberships.
2. Finish two-user/two-property action/API regression coverage and scan every server action for property-child queries lacking both organization and authorized-property scope.
3. Add content-signature validation and a malware scanning/quarantine process for uploads.
4. Collect CSP Report-Only violations in a deployed environment, then tighten and enforce CSP without breaking auth, Stripe, Turnstile, or map assets.
5. Complete secret-history scanning, browser auth/upload/report tests, and operational evidence for TLS, backups, alerting, incident response, and access reviews. The current database connection emitted a pg SSL-mode compatibility warning; confirm the configured production mode remains certificate-verified and prepare it explicitly for the next pg major version.
6. Keep this matrix current; it is a code-evidence tracker, not compliance certification.

## Changed code areas in this pass

- `lib/property-access-policy.ts`, `lib/tenancy.ts`, `lib/rate-limit.ts`
- Property-bound actions for assessments, reports, planners, plans, proposals, billing, assets, assignments, documents, referrals, team, and field-work actions
- `app/api/documents/{file,upload}/route.ts`, `app/api/support/route.ts`, `next.config.mjs`
- `tests/property-access-policy.test.mjs`

No database schema migration or external integration was applied.
```
