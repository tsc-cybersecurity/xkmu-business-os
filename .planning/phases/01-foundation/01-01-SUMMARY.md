---
phase: 01-foundation
plan: 01
subsystem: auth
tags: [auth, withPermission, getAuthContext, migration, integration-tests]

# Dependency graph
requires: []
provides:
  - "Canonical withPermission() used on all 14 previously-duplicated routes"
  - "Zero local getAuthContext() definitions in src/app/api/"
  - "Integration test coverage: 14 auth-401 tests in auth-migration.route.test.ts"
affects: [01-02, 01-03, future-auth-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All API routes use withPermission(request, module, action, handler) — no exceptions"
    - "Auth tests use vi.doMock('@/lib/auth/require-permission') pattern, not session/api-key mocks"

key-files:
  created:
    - src/__tests__/integration/api/auth-migration.route.test.ts
  modified:
    - src/app/api/v1/companies/[id]/research/route.ts
    - src/app/api/v1/email/send/route.ts
    - src/app/api/v1/export/database/route.ts
    - src/app/api/v1/import/database/route.ts
    - src/app/api/v1/leads/[id]/research/route.ts
    - src/app/api/v1/leads/[id]/outreach/route.ts
    - src/app/api/v1/persons/[id]/research/route.ts
    - src/app/api/v1/companies/[id]/crawl/route.ts
    - src/app/api/v1/companies/[id]/analyze-document/route.ts
    - src/app/api/v1/companies/[id]/persons/route.ts
    - src/app/api/v1/companies/[id]/research/[researchId]/apply/route.ts
    - src/app/api/v1/companies/[id]/research/[researchId]/reject/route.ts
    - src/app/api/v1/ideas/[id]/convert/route.ts
    - src/app/api/v1/ai-prompt-templates/seed/route.ts
    - src/__tests__/integration/api/export-database.route.test.ts

key-decisions:
  - "All 14 routes migrated atomically in a single PR — no partial migration state"
  - "Redundant manual admin check in ai-prompt-templates/seed removed (withPermission RBAC handles it)"
  - "export-database streaming response (ReadableStream + NextResponse) preserved unchanged inside withPermission callback"
  - "export-database.route.test.ts updated to use withPermission mock pattern instead of session/api-key mocks"

patterns-established:
  - "API route auth pattern: withPermission(request, module, action, async (auth) => { ... })"
  - "Auth test pattern: vi.doMock('@/lib/auth/require-permission', () => ({ withPermission: vi.fn()... }))"

requirements-completed: [R2.1]

# Metrics
duration: 14min
completed: 2026-03-31
---

# Phase 01 Plan 01: Auth Consolidation Summary

**Eliminated 14 duplicate local getAuthContext() implementations by migrating all routes to canonical withPermission() wrapper, with 14 new integration tests proving 401 on unauthenticated access.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-31T04:47:59Z
- **Completed:** 2026-03-31T05:02:53Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 16

## Accomplishments

- Zero occurrences of `async function getAuthContext` remain in `src/app/api/`
- All 14 migrated routes now use `withPermission(request, module, action, handler)` from the canonical auth layer
- 14 integration tests in `auth-migration.route.test.ts` verify each route returns 401 without authentication
- Streaming export response (`ReadableStream` + `new NextResponse(stream, ...)`) preserved correctly
- Database module RBAC (admin-only gate for export/import) enforced via existing `DEFAULT_ROLE_PERMISSIONS`
- Build succeeds: `npx next build` compiled successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Write 401-test scaffold (RED)** - `948aae3` (test)
2. **Task 2: Migrate all 14 routes (GREEN + test fix)** - `da385cc` (feat)

## Files Created/Modified

- `src/__tests__/integration/api/auth-migration.route.test.ts` — 14 auth-401 integration tests
- `src/app/api/v1/companies/[id]/research/route.ts` — POST+GET migrated to withPermission (companies/update)
- `src/app/api/v1/email/send/route.ts` — POST+GET migrated to withPermission (activities/create)
- `src/app/api/v1/export/database/route.ts` — GET migrated, streaming response preserved (database/read)
- `src/app/api/v1/import/database/route.ts` — POST migrated with try/catch preserved (database/create)
- `src/app/api/v1/leads/[id]/research/route.ts` — POST+GET migrated (leads/update)
- `src/app/api/v1/leads/[id]/outreach/route.ts` — POST migrated (leads/update)
- `src/app/api/v1/persons/[id]/research/route.ts` — POST+GET migrated (persons/update)
- `src/app/api/v1/companies/[id]/crawl/route.ts` — POST+GET migrated (companies/update)
- `src/app/api/v1/companies/[id]/analyze-document/route.ts` — POST migrated (companies/update)
- `src/app/api/v1/companies/[id]/persons/route.ts` — GET migrated (companies/read)
- `src/app/api/v1/companies/[id]/research/[researchId]/apply/route.ts` — POST migrated (companies/update)
- `src/app/api/v1/companies/[id]/research/[researchId]/reject/route.ts` — POST migrated (companies/update)
- `src/app/api/v1/ideas/[id]/convert/route.ts` — POST migrated (ideas/update)
- `src/app/api/v1/ai-prompt-templates/seed/route.ts` — POST migrated, manual admin check removed (ai_prompts/create)
- `src/__tests__/integration/api/export-database.route.test.ts` — Updated to withPermission mock pattern

## Decisions Made

- All 14 routes migrated atomically in one PR — no partial migration state allowed per plan spec
- The manual `if (auth.role !== 'owner' && auth.role !== 'admin')` guard in `ai-prompt-templates/seed` was removed because `withPermission(req, 'ai_prompts', 'create', ...)` already handles RBAC via the legacy fallback in `require-permission.ts`
- Streaming response in `export/database` preserved inside the `withPermission` callback — `new NextResponse(stream, headers)` returned directly, not wrapped in `apiSuccess()`
- `export-database.route.test.ts` updated to mock `withPermission` rather than session/api-key internals, aligning with canonical test pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated export-database.route.test.ts to use withPermission mock pattern**
- **Found during:** Task 2 (migration complete, full test suite run)
- **Issue:** Existing `export-database.route.test.ts` mocked `@/lib/auth/session` and `@/lib/auth/api-key` directly. After migration to `withPermission`, these mocks no longer intercept the auth path, causing 8 tests to fail.
- **Fix:** Rewrote the test file to use `mockAuthContext()` and `mockAuthForbidden()` helper pattern (same as all other route tests), removing direct session/api-key mocks.
- **Files modified:** `src/__tests__/integration/api/export-database.route.test.ts`
- **Verification:** All 8 export-database tests pass after the fix
- **Committed in:** `da385cc` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - existing test broken by migration)
**Impact on plan:** Auto-fix was necessary for test correctness. No scope creep.

## Issues Encountered

- Pre-existing test failures in `src/__tests__/unit/validation/lead.validation.test.ts` (2 tests failing on `score` default value) — confirmed pre-existing by stashing our changes and running the test. Deferred to separate task.

## Next Phase Readiness

- Auth consolidation complete — ready for Plan 01-02 (SQL injection fix in import/database)
- Zero `getAuthContext` duplicates remain. Any new route MUST use `withPermission()`.
- Pre-existing `lead.validation.test.ts` failures should be investigated (out of scope for this plan)

---
*Phase: 01-foundation*
*Completed: 2026-03-31*

## Self-Check: PASSED

- FOUND: `.planning/phases/01-foundation/01-01-SUMMARY.md`
- FOUND: `src/__tests__/integration/api/auth-migration.route.test.ts`
- FOUND: commit `948aae3` (RED test scaffold)
- FOUND: commit `da385cc` (14-route migration)
- FOUND: commit `1ef43f0` (plan metadata)
- PASS: zero `async function getAuthContext` in `src/app/api/`
