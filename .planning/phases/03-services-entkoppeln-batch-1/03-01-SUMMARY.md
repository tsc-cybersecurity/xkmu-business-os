---
phase: "03"
plan: "01"
subsystem: crm-services
tags: [tenant-removal, soft-removal, crm, services]
dependency_graph:
  requires: [02-01]
  provides: [crm-services-decoupled]
  affects: [lead.service, company.service, person.service, opportunity.service, product.service, lead-pipeline.service]
tech_stack:
  patterns: [soft-removal, TENANT_ID-constant, _tenantId-unused-marker]
key_files:
  modified:
    - src/lib/services/lead.service.ts
    - src/lib/services/company.service.ts
    - src/lib/services/person.service.ts
    - src/lib/services/opportunity.service.ts
    - src/lib/services/product.service.ts
    - src/lib/services/lead-pipeline.service.ts
decisions:
  - "Included lead-pipeline.service.ts in CRM block (tightly coupled to lead/company/person)"
  - "generateSlug in ProductService now checks slug uniqueness globally (no tenant filter) — correct for single-tenant"
  - "list() queries now have no mandatory WHERE clause when no filters applied — all rows returned"
metrics:
  duration: "~15 min"
  completed: "2026-04-13"
  tasks_completed: 6
  files_modified: 6
---

# Phase 03 Plan 01: CRM-Block Service Decoupling Summary

**One-liner:** Soft-removed all `eq(X.tenantId, tenantId)` WHERE filters from 6 CRM services, replacing INSERT values with `TENANT_ID` constant and marking params as `_tenantId`.

## Tasks Completed

| Task | Service | Commit | Changes |
|------|---------|--------|---------|
| 1 | lead.service.ts | 28cc1e7 | 7 methods refactored, list() count query fixed |
| 2 | company.service.ts | 1106c71 | 6 methods refactored, search/checkDuplicate simplified |
| 3 | person.service.ts | 3f6d809 | 6 methods refactored, setPrimaryContact simplified |
| 4 | opportunity.service.ts | c62f648 | 6 methods refactored, createMany placeId lookup simplified |
| 5 | product.service.ts | 0c5c97c | 7 methods refactored, generateSlug global uniqueness |
| 6 | lead-pipeline.service.ts | 38cf6e9 | 5 methods refactored, findOrCreate queries simplified |

## What Was Done

Applied soft-removal pattern uniformly across all 6 CRM services:

1. Added `import { TENANT_ID } from '@/lib/constants/tenant'`
2. Renamed `tenantId: string` parameters to `_tenantId: string` (marks as intentionally unused)
3. Removed all `eq(X.tenantId, tenantId)` clauses from WHERE conditions
4. Replaced `values({ tenantId, ... })` with `values({ tenantId: TENANT_ID, ... })` in INSERT statements
5. Cleaned up `conditions` arrays — removed mandatory `eq(X.tenantId, tenantId)` as the initial element, resulting in truly filter-free queries when no other filters apply

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] list() count query had mismatched filters**
- **Found during:** Task 1 (lead.service.ts)
- **Issue:** The count query in `list()` used inline `eq(leads.tenantId, tenantId)` with optional status — removing only the tenantId part left a cleaner rewrite needed
- **Fix:** Extracted count conditions into a separate `countConditions` array, built `countWhere` independently from the main `whereClause`
- **Files modified:** src/lib/services/lead.service.ts
- **Commit:** 28cc1e7

**2. [Rule 1 - Bug] lead-pipeline findOrCreateCompany had AND tenantId in WHERE**
- **Found during:** Task 6 (lead-pipeline.service.ts)
- **Issue:** `and(eq(companies.tenantId, tenantId), eq(companies.name, NO_COMPANY_NAME))` — removing tenantId left the `and()` with a single arg, so simplified to direct `eq(companies.name, ...)`
- **Fix:** Replaced `and(eq(...tenantId...), eq(...name...))` with bare `eq(...name...)` 
- **Files modified:** src/lib/services/lead-pipeline.service.ts
- **Commit:** 38cf6e9

## Known Stubs

None — all service methods return real data from DB queries.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. This is pure query simplification.

## Self-Check: PASSED

Files exist:
- src/lib/services/lead.service.ts — FOUND
- src/lib/services/company.service.ts — FOUND
- src/lib/services/person.service.ts — FOUND
- src/lib/services/opportunity.service.ts — FOUND
- src/lib/services/product.service.ts — FOUND
- src/lib/services/lead-pipeline.service.ts — FOUND

Commits exist:
- 28cc1e7 — FOUND (LeadService)
- 1106c71 — FOUND (CompanyService)
- 3f6d809 — FOUND (PersonService)
- c62f648 — FOUND (OpportunityService)
- 0c5c97c — FOUND (ProductService)
- 38cf6e9 — FOUND (LeadPipelineService)

Verification: `grep -r "eq(leads.tenantId\|eq(companies.tenantId\|eq(persons.tenantId\|eq(opportunities.tenantId\|eq(products.tenantId"` across all 6 files returns no matches.
