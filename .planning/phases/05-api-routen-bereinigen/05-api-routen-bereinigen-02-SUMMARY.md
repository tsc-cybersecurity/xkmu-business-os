---
phase: 05-api-routen-bereinigen
plan: 02
subsystem: api
tags: [tenant-removal, api-routes, batch-refactor, single-tenant]

dependency_graph:
  requires: [05-01]
  provides: [all-193-api-routes-cleaned]
  affects: [all-api-routes, export-endpoint, import-endpoint, tenant-endpoint]

tech_stack:
  added: []
  patterns: [TENANT_ID-constant, no-auth-tenantId-in-routes]

key_files:
  created: []
  modified:
    - src/app/api/v1/export/database/route.ts
    - src/app/api/v1/import/database/route.ts
    - src/app/api/v1/tenant/route.ts
    - src/app/api/v1/tenant/analyze/route.ts
    - src/app/api/v1/tenant/seed-demo/route.ts
    - src/app/api/v1/emails/link-search/route.ts
    - "... 188 further route.ts files across all API directories"

decisions:
  - "Export route removes tenant_id filter: single-tenant means all data belongs to one instance"
  - "Import route enforces TENANT_ID on all imported rows: prevents spoofing via JWT"
  - "Tenant analyze keeps local tenantId alias pointing to TENANT_ID for code clarity"

metrics:
  duration_minutes: 25
  completed_date: 2026-04-17
  tasks_completed: 3
  files_modified: 194
---

# Phase 05 Plan 02: API-Routen Batch-Refactor (Rest + Sonderfaelle) Summary

**One-liner:** Replace auth.tenantId with TENANT_ID constant in all remaining 193 API routes, with special handling for export/import/tenant endpoints to complete Phase 5.

## What Was Done

Phase 5 Plan 2 completes the API route cleanup. All `auth.tenantId` references across
`src/app/api/v1/` are replaced with the `TENANT_ID` constant from `@/lib/constants/tenant`.

### Task 1: Mechanical Batch Replace — 188 Route Files

A Node.js script processed all `route.ts` files under `src/app/api/v1/` (excluding 5 special
case files), performing:

1. Remove `const tenantId = auth.tenantId` helper variable declarations
2. Replace all `auth.tenantId` occurrences with `TENANT_ID`
3. Add `import { TENANT_ID } from '@/lib/constants/tenant'` where not yet present

**188 files modified** across: activities, admin, ai-logs, ai-prompt-templates, ai-providers,
ai, api-keys, blog, business-intelligence, chat, cms, cockpit, companies, contract-clauses,
contract-templates, deliverables, din, document-templates, documents, email-templates, email,
emails, eos, execution-logs, feedback, grundschutz, ideas, images, ir-playbook, kie, kpi,
leads, marketing, media, n8n, newsletter, okr, opportunities, persons, processes,
product-categories, products, projects, receipts, roles, seo, social-media, sops, task-queue,
time-entries, users, webhooks, wiba.

**Commit:** `1ce68ca`

### Task 2: Special Cases — Export, Import, Tenant Routes

**export/database/route.ts:**
- Removed `const tenantId = auth.tenantId`
- TENANT_TABLES loop: removed `WHERE tenant_id = ${tenantId}` — all data exported (single-tenant)
- JOIN_TABLES loop: removed INNER JOIN tenant filter — simple `SELECT * FROM ${jt.table}`
- tenants query: `WHERE id = ${tenantId}` → `WHERE id = ${TENANT_ID}` (constant)
- Header comment updated from tenant-specific to instance-level description
- `auth` param → `_auth` (no longer used)

**import/database/route.ts:**
- `const tenantId = auth.tenantId` → `const tenantId = TENANT_ID`
- All tenant_id enforcement logic preserved — imported rows get TENANT_ID stamped
- DELETE WHERE clause uses TENANT_ID via local alias

**tenant/route.ts:**
- GET: `TenantService.getById(TENANT_ID)` (was auth.tenantId)
- PUT: `TenantService.slugExists(slug, TENANT_ID)` and `TenantService.update(TENANT_ID, ...)`
- Both handlers: `auth` → `_auth` (auth.userId/auth.role not needed)

**tenant/analyze/route.ts:**
- `const tenantId = auth.tenantId` → `const tenantId = TENANT_ID`
- All downstream DB queries and service calls use local `tenantId` alias for clarity

**tenant/seed-demo/route.ts:**
- `TenantSeedService.seedDemoData(auth.tenantId, auth.userId)` → `seedDemoData(TENANT_ID, auth.userId)`

**Commit:** `9e30423`

### Task 3: Build Fix + Final Verification

**Bug found and fixed (Rule 1):** `emails/link-search/route.ts` had 3 bare `tenantId` references
in `eq()` calls that survived after the batch script removed `const tenantId = auth.tenantId`.
TypeScript reported `Cannot find name 'tenantId'` (TS2304) on lines 45, 69, 90.

**Fix:** Added `import { TENANT_ID }` and replaced all 3 bare `tenantId` references with `TENANT_ID`.

**Commit:** `db8173c`

**Final verification:**
```
grep -r "auth.tenantId" src/app/api/v1/ | wc -l  -> 0
grep -r "TENANT_ID" src/app/api/v1/ | wc -l      -> 668
npx tsc --noEmit (non-test files)                 -> 0 errors
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `emails/link-search/route.ts` bare `tenantId` references**
- **Found during:** Task 3 (TypeScript build check)
- **Issue:** Batch script removed `const tenantId = auth.tenantId` declaration but 3 `eq(x.tenantId, tenantId)` usages remained, causing TS2304 errors
- **Fix:** Added TENANT_ID import and replaced the 3 bare `tenantId` references with `TENANT_ID`
- **Files modified:** `src/app/api/v1/emails/link-search/route.ts`
- **Commit:** `db8173c`

### Scope Extension

Plan Task 1 listed 13 specific directories (~73 files). The batch script processed all 193
route files (including activities, companies, eos, okr, etc. not listed in the plan scope).
This is correct — the objective states "no auth.tenantId anywhere in src/app/api/v1/" and the
05-01 worktree had not been merged, so all 193 files needed the same mechanical replacement.
No architectural change required.

## Phase 5 Completion

Both plans complete:
- **Plan 01:** First batch (covered in 05-01 plan — done in sibling worktree)
- **Plan 02:** All 193 remaining routes + 5 special cases cleaned in this execution
- **Result:** Phase 5 fully complete — `grep -r "auth.tenantId" src/app/api/v1/` returns 0 matches

## Security Notes (Threat Model)

- T-05-04 (Export without tenant filter): Accepted. withPermission(database:read) enforces auth.
- T-05-05 (Import TENANT_ID enforcement): Mitigated. Imported rows always get TENANT_ID stamped.
- T-05-06 (Spoofing via JWT tenantId): Mitigated. TENANT_ID constant used, not JWT-derived value.

## Self-Check: PASSED

- Files modified: 194 (188 batch + 5 special cases + 1 build fix)
- Commits: 1ce68ca, 9e30423, db8173c
- `grep -r "auth.tenantId" src/app/api/v1/` = 0 matches (verified)
- TypeScript errors in API routes = 0 (verified)
