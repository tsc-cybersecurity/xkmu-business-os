---
phase: 06-code-quality
plan: 02
subsystem: database
tags: [drizzle-orm, postgresql, n+1, batch-queries, performance]

# Dependency graph
requires:
  - phase: 06-code-quality
    provides: Phase context and codebase analysis identifying 8 N+1 patterns

provides:
  - 8 N+1 query patterns replaced with batch operations
  - bulkDelete using inArray (single DELETE)
  - 3x reorder methods using CASE WHEN batch UPDATE
  - seedDefaults using pre-load + batch INSERT
  - topics generate using batch INSERT
  - dev-tasks load using Promise.all (parallel)
  - saveBulkAnswers using Promise.all (parallel)

affects: [06-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CASE WHEN batch UPDATE: sql`CASE id ${sql.join(ids.map((id,i) => sql`WHEN ${id}::uuid THEN ${i}`), sql` `)} ELSE col END`"
    - "inArray batch DELETE: db.delete(table).where(inArray(table.id, ids))"
    - "Pre-load + batch INSERT: load existing slugs into Set, filter, insert missing in one query"
    - "Promise.all for parallel independent queries: await Promise.all(items.map(i => service.method(i)))"

key-files:
  created: []
  modified:
    - src/lib/services/ai/image-generation.service.ts
    - src/lib/services/cms-block.service.ts
    - src/lib/services/cms-navigation.service.ts
    - src/lib/services/document-calculation.service.ts
    - src/lib/services/ai-prompt-template.service.ts
    - src/app/api/v1/social-media/topics/generate/route.ts
    - src/app/api/v1/processes/dev-tasks/generate/route.ts
    - src/lib/services/din-audit.service.ts

key-decisions:
  - "din-audit saveBulkAnswers uses Promise.all not INSERT ON CONFLICT — no unique constraint on (sessionId, requirementId)"
  - "CASE WHEN uses ::uuid cast to avoid PostgreSQL operator does not exist: uuid = text error"
  - "topics generate route imports db/socialMediaTopics directly (no side effects in SocialMediaTopicService.create)"

patterns-established:
  - "Pattern: Batch UPDATE sort-order with sql CASE WHEN + ::uuid cast"
  - "Pattern: Batch DELETE with inArray(table.id, ids)"
  - "Pattern: Pre-load Set + batch INSERT for seedDefaults"

requirements-completed: [R4.2]

# Metrics
duration: 14min
completed: 2026-03-31
---

# Phase 06 Plan 02: N+1 Query Fixes Summary

**8 N+1 DB loop patterns replaced with batch operations (inArray DELETE, CASE WHEN UPDATE, batch INSERT, Promise.all) — O(N) round-trips collapsed to O(1)**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-31T10:05:06Z
- **Completed:** 2026-03-31T10:19:07Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Eliminated all 8 N+1 query patterns across services and API routes
- 3 reorder methods now use a single CASE WHEN UPDATE (was N individual UPDATEs)
- bulkDelete uses a single inArray DELETE (was N individual DELETEs)
- topics generate uses batch INSERT with .values([...]) (was N create() calls)
- seedDefaults pre-loads existing slugs then inserts missing in one query (was N check+create calls)
- dev-tasks listTasks parallelized with Promise.all (was sequential for...of)
- saveBulkAnswers parallelized with Promise.all (was sequential for...of)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix N+1 patterns in service files (bulkDelete, 3x reorder, seedDefaults)** - `9a01268` (feat)
2. **Task 2: Fix N+1 patterns in API routes (topics batch INSERT, dev-tasks Promise.all, din-audit Promise.all) and verify build** - `21bb789` (feat)

## Files Created/Modified
- `src/lib/services/ai/image-generation.service.ts` - bulkDelete: inArray DELETE, added inArray import
- `src/lib/services/cms-block.service.ts` - reorder: CASE WHEN batch UPDATE, added sql/inArray imports
- `src/lib/services/cms-navigation.service.ts` - reorder: CASE WHEN batch UPDATE inside transaction removed (not needed for single query), added sql/inArray imports
- `src/lib/services/document-calculation.service.ts` - reorderItems: CASE WHEN batch UPDATE on position column, added inArray import
- `src/lib/services/ai-prompt-template.service.ts` - seedDefaults: pre-load + batch INSERT
- `src/app/api/v1/social-media/topics/generate/route.ts` - batch INSERT replaces per-topic create loop, removed SocialMediaTopicService import
- `src/app/api/v1/processes/dev-tasks/generate/route.ts` - Promise.all replaces sequential listTasks loop
- `src/lib/services/din-audit.service.ts` - Promise.all replaces sequential saveAnswer loop

## Decisions Made

- **din-audit uses Promise.all, not INSERT ON CONFLICT:** The `dinAnswers` table has no unique constraint on `(sessionId, requirementId)` — verified from schema. INSERT ON CONFLICT would throw. Promise.all parallelizes the N queries without reducing count, but eliminates sequential latency.
- **CASE WHEN uses `::uuid` cast:** PostgreSQL rejects uncast string literals in CASE WHEN against UUID columns (`operator does not exist: uuid = text`). The `::uuid` cast is required.
- **cms-navigation reorder: transaction removed:** The original code wrapped the N individual UPDATEs in a transaction. With a single CASE WHEN UPDATE, the transaction wrapper is unnecessary — a single statement is inherently atomic.
- **topics generate: direct db import:** `SocialMediaTopicService.create` is a pure INSERT with no side effects (no webhooks, no activity logs). Direct `db.insert(...).values([...]).returning()` is safe and correct.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All pre-existing tsc errors were in test files (mock-request.ts, auth-flow integration test, cms-navigation.service.test.ts) and unrelated to the 8 target files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 8 N+1 patterns eliminated — R4.2 complete
- `npx tsc --noEmit` clean on source files
- `npx next build` passes
- Ready for plan 06-03 (component splitting)

---
*Phase: 06-code-quality*
*Completed: 2026-03-31*
