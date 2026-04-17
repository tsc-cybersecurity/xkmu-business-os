---
phase: "05"
plan: "01"
subsystem: api-routes
tags: [tenant-removal, single-tenant, api, refactor]
dependency_graph:
  requires: [03-services-entkoppeln-batch-1, 04-services-entkoppeln-batch-2]
  provides: [tenant-free-api-routes]
  affects: [all-api-v1-routes]
tech_stack:
  patterns: [TENANT_ID constant, import from lib/constants/tenant]
key_files:
  modified:
    - src/lib/constants/tenant.ts (source of TENANT_ID)
    - src/app/api/v1/**/*.ts (193 route files)
    - src/app/api/v1/admin/database/tables/[tableName]/route.ts (special handling)
decisions:
  - Replace auth.tenantId with TENANT_ID constant in all API routes
  - admin/database/tables route: remove TENANT_TABLES_SET filtering (all data visible in single-tenant)
metrics:
  duration: "~10 minutes"
  completed: "2026-04-13"
  tasks: 2
  files_changed: 193
---

# Phase 05 Plan 01: API Routes — Replace auth.tenantId with TENANT_ID

**One-liner:** Replaced `auth.tenantId` with the `TENANT_ID` constant across all 193 API v1 route files, removing per-request tenant filtering in favour of the single hardcoded tenant.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Replace auth.tenantId in 192 route files + add TENANT_ID import | 83fef34 | 192 route files |
| 2 | admin/database/tables: remove TENANT_TABLES_SET filtering logic | 83fef34 | 1 route file |

## What Changed

### Pattern Applied (192 files)

Before:
```ts
import { withPermission } from '@/lib/auth/require-permission'

return withPermission(request, 'leads', 'read', async (auth) => {
  const result = await LeadService.list(auth.tenantId, { ... })
})
```

After:
```ts
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

return withPermission(request, 'leads', 'read', async (auth) => {
  const result = await LeadService.list(TENANT_ID, { ... })
})
```

- `auth.userId`, `auth.role` and all other `auth.*` fields are preserved
- `withPermission` wrapper is retained (still needed for auth/permission checks)
- 74 route files had no `auth.tenantId` usage and were unchanged

### admin/database/tables Special Handling

Removed `TENANT_TABLES_SET` and `GLOBAL_WITH_TENANT_ID` conditional logic from GET, PUT, DELETE handlers. All tables are now queried without tenant filter — appropriate for single-tenant mode where an admin sees all data. Also removed `hasTenantId` from the GET response payload.

Removed imports: `TENANT_TABLES_SET`, `GLOBAL_WITH_TENANT_ID`  
Retained imports: `isValidTable`, `OWNER_ONLY_TABLES`

## Stats

- Files scanned: 267 route.ts files total
- Files updated: 193 (192 standard + 1 admin/database special)
- Files unchanged (no auth.tenantId): 74
- Errors: 0

## Deviations from Plan

None — plan executed exactly as described.

## Self-Check: PASSED

- [x] Zero remaining `auth.tenantId` references in src/app/api/v1
- [x] Zero remaining `TENANT_TABLES_SET` references in src/app/api/v1
- [x] Commit 83fef34 exists: 193 files changed, 661 insertions, 512 deletions
- [x] TENANT_ID import added to all modified files
- [x] auth.userId, auth.role still used where needed (not accidentally replaced)
