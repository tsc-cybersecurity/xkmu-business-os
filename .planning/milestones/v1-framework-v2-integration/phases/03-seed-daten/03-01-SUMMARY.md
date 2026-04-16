---
phase: 03-seed-daten
plan: "01"
subsystem: seed-data
tags: [deliverables, seed, idempotent, catalog]
dependency_graph:
  requires: []
  provides: [deliverable-catalog-seed]
  affects: [seed-check, deliverable-modules-table, deliverables-table]
tech_stack:
  added: []
  patterns: [idempotent-seed, service-based-insert, drizzle-select-before-insert]
key_files:
  created:
    - src/lib/db/seeds/deliverable-catalog.seed.ts
  modified:
    - src/lib/db/seed-check.ts
decisions:
  - "Seeded 16 modules (not 15) and 70 deliverables (not 63) — JSON source has more entries than plan estimated; all A1-A5, B1-B5, C1-C3, D1-D3 modules included"
  - "category column in deliverableModules receives categoryCode (A/B/C/D), not category label — matches schema definition"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-13"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 03 Plan 01: Deliverable-Catalog Seed Summary

Idempotenter Seed fuer 16 Deliverable-Module (A1-A5, B1-B5, C1-C3, D1-D3) und 70 Deliverables aus xKMU_Deliverable_Katalog_v1, integriert in seed-check.ts nach seedManagementFramework.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Deliverable-Catalog-Seed-Datei erstellen | 1b4e785 | src/lib/db/seeds/deliverable-catalog.seed.ts (created) |
| 2 | Seed-Check um Deliverable-Catalog-Seed erweitern | 1419bca | src/lib/db/seed-check.ts (modified) |

## Implementation Details

### Seed File: deliverable-catalog.seed.ts

Exports `seedDeliverableCatalog(tenantId: string)` following the exact pattern from `management-framework.seed.ts`.

**MODULES constant:** 16 module objects with nested deliverables arrays.

**Idempotency strategy:**
- Module level: `db.select().from(deliverableModules).where(and(eq(tenantId), eq(code)))` — skip if found
- Deliverable level: `DeliverableService.list(tenantId, { moduleId })` — skip entire module if any deliverables exist

**Field mapping (JSON -> DB):**

| JSON field (module) | DB column (deliverableModules) |
|---------------------|-------------------------------|
| `id` | `code` |
| `name` | `name` |
| `category_code` | `category` (schema stores letter A/B/C/D here) |
| `ziel` | `ziel` |
| `preis` | `preis` |

| JSON field (deliverable) | DB column (deliverables) |
|--------------------------|--------------------------|
| `name` | `name` |
| `description` | `description` |
| `format` | `format` |
| `umfang` | `umfang` |
| `trigger` | `trigger` |
| module.category | `category` (e.g. 'KI-Beratung') |
| module.category_code | `categoryCode` (e.g. 'A') |
| (fixed) | `status` = 'active' |
| (fixed) | `version` = '1.0.0' |

### Seed-Check Integration

- Import added at line 12 after `seedManagementFramework` import
- Call added at step 15, after `await seedManagementFramework(tenantId)`, before `logger.info('Seed check completed!')`

## Module Coverage

| Category | Modules | Deliverables |
|----------|---------|--------------|
| A — KI-Beratung | A1, A2, A3, A4, A5 | 7+7+5+4+4 = 27 |
| B — IT-Beratung | B1, B2, B3, B4, B5 | 4+4+4+5+4 = 21 |
| C — Cybersecurity | C1, C2, C3 | 4+4+4 = 12 |
| D — Schnittstellen-Module | D1, D2, D3 | 4+3+3 = 10 |
| **Total** | **16** | **70** |

## Deviations from Plan

### [Deviation 1 — Data Discrepancy] Module and deliverable counts differ from plan

- **Found during:** Task 1 (reading source JSON)
- **Issue:** Plan stated "15 modules and 63 deliverables" but actual JSON source (`temp/xKMU_Deliverable_Katalog_v1 (1).json`) contains 16 modules (A1-A5, B1-B5, C1-C3, D1-D3) with 70 deliverables for those IDs. The plan appears to have had a counting error — "A1-A5, B1-B5, C1-C3, D1-D3" is 5+5+3+3 = 16 modules, not 15. The JSON is also larger (19 total modules, 85 total deliverables including C4, C5, C6 which were out of scope per the plan's module list).
- **Fix:** Seeded all 16 modules with all 70 deliverables from the plan-specified ID range. No data was excluded.
- **Impact:** API endpoint `/api/v1/deliverables/modules` will return 16 (not 15), and `/api/v1/deliverables` will return 70 (not 63). The `must_haves.truths` in the plan are outdated — actual data is the source of truth.

## Known Stubs

None — seed contains complete, real data from the JSON catalog.

## Self-Check: PASSED

- [x] `src/lib/db/seeds/deliverable-catalog.seed.ts` exists (36,702 bytes)
- [x] `export async function seedDeliverableCatalog` present at line 676
- [x] 16 module code entries confirmed
- [x] 70 deliverable trigger entries confirmed
- [x] `seedDeliverableCatalog` imported in seed-check.ts at line 12
- [x] `await seedDeliverableCatalog(tenantId)` called at line 872
- [x] Commits 1b4e785 and 1419bca verified in git log
- [x] `npx tsc --noEmit` — zero errors in seed files (pre-existing test errors unrelated)
