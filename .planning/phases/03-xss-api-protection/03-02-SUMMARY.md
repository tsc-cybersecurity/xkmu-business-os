---
phase: 03-xss-api-protection
plan: 02
subsystem: auth
tags: [api-keys, scoping, permissions, withPermission, auth-context, tdd, admin-ui]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: withPermission() on all routes — scope enforcement layered on top
  - phase: 02-security-layer
    provides: proxy.ts CVE defense — API keys still go through withPermission() route-level checks
provides:
  - drizzle/migrations/0031_api_key_scoping.sql: All existing api_keys rows updated to ['*']
  - AuthContext.apiKeyPermissions: string[] | null threaded from validateApiKey() through getAuthContext()
  - withPermission() scope check: replaces unconditional API-key bypass with ['*'] || module:action check
  - Admin UI: scope selector (Vollzugriff + per-module read/write checkboxes) in API key creation dialog
  - 6 unit tests for scope enforcement behaviors
affects:
  - 03-03-csrf (withPermission() is the gate; API keys exempt from CSRF — already handled by role check)
  - 04-rate-limiting (require-permission.ts is the auth gate that rate limiter wraps)
  - all 215 API routes (withPermission() is called on every protected route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "apiKeyPermissions: string[] | null in AuthContext — null for session users, permissions array for API keys"
    - "Scope check in withPermission(): auth.apiKeyPermissions ?? ['*'] — null defaults to full access (safe fallback)"
    - "Scope format: 'module:action' string or '*' for wildcard — e.g. 'leads:read', 'companies:write'"
    - "SQL migration WHERE clause: leaves rows already using module:action format untouched"

key-files:
  created:
    - drizzle/migrations/0031_api_key_scoping.sql
    - src/__tests__/unit/auth/require-permission.test.ts
  modified:
    - src/lib/auth/auth-context.ts
    - src/lib/types/auth.types.ts
    - src/lib/auth/require-permission.ts
    - src/app/intern/(dashboard)/settings/api-keys/page.tsx
    - src/__tests__/helpers/fixtures.ts
    - src/__tests__/integration/api/import-database.route.test.ts

key-decisions:
  - "Scope check uses auth.apiKeyPermissions ?? ['*'] — null (session users) and missing permissions both default to full access, preventing lockout"
  - "SQL migration WHERE clause is idempotent: rows already having ['*'] or module:action scopes are left untouched"
  - "Admin UI scope uses 'module:write' as a single scope covering create/update/delete — simpler than 3 separate checkboxes"
  - "TDD approach: RED test confirmed unconditional bypass was in place before implementing scope check"

patterns-established:
  - "Pattern: API scope in withPermission() — single responsibility, no scope logic in individual routes"
  - "Pattern: apiKeyPermissions threaded from DB through validateApiKey() → getAuthContext() → withPermission()"

requirements-completed: [R2.3]

# Metrics
duration: 12min
completed: 2026-03-31
---

# Phase 03 Plan 02: API-Key Scoping Summary

**SQL migration + AuthContext field + withPermission() scope enforcement replacing unconditional bypass + Admin UI scope selector with per-module read/write checkboxes + 6 TDD unit tests**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-31T07:41:29Z
- **Completed:** 2026-03-31T07:53:22Z
- **Tasks:** 3
- **Files modified:** 8 (5 src files + 2 test files + 1 migration)

## Accomplishments

- Created `drizzle/migrations/0031_api_key_scoping.sql`: idempotent UPDATE setting all existing api_keys rows to `['*']` for backward compatibility
- Added `apiKeyPermissions: string[] | null` to `AuthContext` interface in `auth-context.ts`
- Updated `getAuthContext()`: session auth returns `apiKeyPermissions: null`, API-key auth returns `payload.permissions`
- Updated `auth.types.ts` AuthContext for consistency
- Replaced unconditional API-key bypass in `require-permission.ts` with scope check: `auth.apiKeyPermissions ?? ['*']`
- Scope check: passes if `scopes.includes('*')` OR `scopes.includes('module:action')`, returns 403 otherwise
- Added `Checkbox` + `MODULES`/`MODULE_LABELS` imports to API keys page
- Implemented scope selector: "Vollzugriff" checkbox (default: checked) disables per-module grid when active
- Per-module grid: 30 modules × read/write = 60 checkboxes in scrollable container
- Permission badges in list: green "Vollzugriff" badge for `['*']`, scope strings (up to 3 + "+N weitere") otherwise
- Sends `permissions: selectedScopes` in POST body when creating API key
- Fixed test fixtures (`fixtures.ts`, `import-database.route.test.ts`) to include `apiKeyPermissions: null`
- 6 TDD unit tests: RED confirmed bypass existed, GREEN confirmed scope enforcement works

## Task Commits

Each task was committed atomically:

1. **Task 1: SQL migration + thread apiKeyPermissions through AuthContext** - `566b788` (feat)
2. **Task 2: withPermission() scope enforcement + TDD tests** - `7cb728a` (feat)
3. **Task 3: Admin UI scope selector** - `f261fd3` (feat)

## Files Created/Modified

- `drizzle/migrations/0031_api_key_scoping.sql` — Idempotent UPDATE: all legacy api_keys rows get `['*']`
- `src/lib/auth/auth-context.ts` — Added `apiKeyPermissions: string[] | null` to interface and both auth branches in getAuthContext()
- `src/lib/types/auth.types.ts` — Added optional `apiKeyPermissions?: string[] | null` to AuthContext type
- `src/lib/auth/require-permission.ts` — Replaced unconditional `return handler(auth)` bypass with scope check
- `src/app/intern/(dashboard)/settings/api-keys/page.tsx` — Added scope selector UI, improved permission badge display
- `src/__tests__/unit/auth/require-permission.test.ts` — 6 TDD tests for scope behaviors (new file)
- `src/__tests__/helpers/fixtures.ts` — Added `apiKeyPermissions: null` to authFixture()
- `src/__tests__/integration/api/import-database.route.test.ts` — Added `apiKeyPermissions: null` to TEST_AUTH

## Decisions Made

- **Scope check with `?? ['*']` fallback:** `auth.apiKeyPermissions` is `null` for session users and for API keys with no explicit permissions. Defaulting to `['*']` ensures session users and legacy keys without permissions are never accidentally locked out.
- **Idempotent SQL migration:** The WHERE clause (`permissions != '["*"]' AND NOT LIKE '%:%'`) leaves rows that already have `['*']` or already use module:action format untouched — safe to re-run.
- **Admin UI 'write' scope:** Using `module:write` as a single checkbox covering create/update/delete, rather than three separate CRUD checkboxes, keeps the UI manageable for 30+ modules.
- **TDD confirmed bypass:** Running RED phase confirmed the old `if (auth.role === 'api') { return handler(auth) }` was in place — the scope test for `['leads:read']` failing `companies:read` correctly failed before the fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Updated test fixtures to include apiKeyPermissions**
- **Found during:** Task 1 TypeScript check
- **Issue:** `authFixture()` in fixtures.ts and `TEST_AUTH` in import-database.route.test.ts were missing the new required `apiKeyPermissions` field, causing TypeScript errors
- **Fix:** Added `apiKeyPermissions: null` to both
- **Files modified:** `src/__tests__/helpers/fixtures.ts`, `src/__tests__/integration/api/import-database.route.test.ts`
- **Commit:** `566b788`

### Pre-existing issues (out of scope, not fixed)

- `src/__tests__/helpers/mock-request.ts` line 16: `AbortSignal | null` not assignable to `AbortSignal | undefined` — pre-existing TypeScript error
- `src/__tests__/unit/services/cms-navigation.service.test.ts` line 36: DB type cast — pre-existing
- `src/__tests__/unit/services/user.service.test.ts` lines 122-123: `result.user` possibly undefined — pre-existing

These were logged but not fixed (out of scope per deviation rules).

## Known Stubs

None. All scope enforcement is wired end-to-end:
- SQL migration sets DB values
- validateApiKey() reads from DB
- getAuthContext() forwards to AuthContext
- withPermission() enforces at route level

## Self-Check: PASSED

- [x] `drizzle/migrations/0031_api_key_scoping.sql` exists
- [x] `src/__tests__/unit/auth/require-permission.test.ts` exists (6 tests)
- [x] Commit `566b788` exists (Task 1)
- [x] Commit `7cb728a` exists (Task 2)
- [x] Commit `f261fd3` exists (Task 3)
- [x] `npx next build` compiled successfully
- [x] All 6 scope tests pass
