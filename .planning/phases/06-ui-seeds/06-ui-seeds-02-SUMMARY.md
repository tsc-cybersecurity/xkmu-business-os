---
phase: 06-ui-seeds
plan: "02"
subsystem: seed-infrastructure
tags: [seed, tenant, refactor, soft-removal]
dependency_graph:
  requires: []
  provides: [SEED-01, SEED-02, SEED-03]
  affects: [seed-check.ts, management-framework.seed.ts, deliverable-catalog.seed.ts, sop-catalog.seed.ts]
tech_stack:
  added: []
  patterns: [TENANT_ID-constant, soft-removal (_tenantId prefix)]
key_files:
  modified:
    - src/lib/db/seed-check.ts
    - src/lib/db/seeds/management-framework.seed.ts
    - src/lib/db/seeds/deliverable-catalog.seed.ts
    - src/lib/db/seeds/sop-catalog.seed.ts
decisions:
  - "tenants import in seed-check.ts retained — still used for tenant existence check and creation"
  - "tenantId shorthand property replaced with explicit tenantId: TENANT_ID in insert values"
metrics:
  duration: "10 minutes"
  completed: "2026-04-13"
  tasks_completed: 2
  files_modified: 4
---

# Phase 06 Plan 02: Seed Consolidation — TENANT_ID Pattern Summary

**One-liner:** Removed multi-tenant loop from seed-check.ts and applied TENANT_ID constant pattern (soft-removal via _tenantId prefix) to all three seed service functions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | seed-check.ts — Tenant-Loop entfernen | 7a0ab53 | src/lib/db/seed-check.ts |
| 2 | Seed-Services auf TENANT_ID-Pattern umstellen | a7d6a2f | management-framework.seed.ts, deliverable-catalog.seed.ts, sop-catalog.seed.ts |

## What Was Done

### Task 1: seed-check.ts
- Added `import { TENANT_ID } from '@/lib/constants/tenant'`
- Replaced `const allTenants = await db.select(...).from(tenants)` + two `for (const t of allTenants)` loops with direct calls:
  - `await seedDeliverableCatalog(TENANT_ID)`
  - `await seedSopCatalog(TENANT_ID)`
- The `tenants` schema import was retained — it is still needed at lines 781 and 803 for tenant existence check and first-run creation.

### Task 2: Three Seed Services
Applied identical soft-removal pattern to all three seed files:
- **management-framework.seed.ts**: `tenantId` → `_tenantId` in signature; 25 TENANT_ID usages across EosService, OkrService, SopService calls and DB where-clause
- **deliverable-catalog.seed.ts**: `tenantId` → `_tenantId`; TENANT_ID used in DB where-clause, insert values, DeliverableService calls
- **sop-catalog.seed.ts**: `tenantId` → `_tenantId`; TENANT_ID used in DB where-clauses (deliverables + sopDocuments tables) and insert values

Column references like `eq(users.tenantId, ...)` were correctly kept as column names; only the value argument was changed to `TENANT_ID`.

### Task 3: seed.ts Standalone (SEED-03)
Verified unchanged. Slug `xkmu-digital-solutions` confirmed at line 20. No modification needed.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. Changes are purely refactoring internal to the seed scripts (controlled environment, no external exposure).

## Self-Check: PASSED

- src/lib/db/seed-check.ts — modified, committed 7a0ab53
- src/lib/db/seeds/management-framework.seed.ts — modified, committed a7d6a2f
- src/lib/db/seeds/deliverable-catalog.seed.ts — modified, committed a7d6a2f
- src/lib/db/seeds/sop-catalog.seed.ts — modified, committed a7d6a2f
- No allTenants loop in seed-check.ts: confirmed
- TENANT_ID imported in all three seed services: confirmed (25, 5, 5 matches)
