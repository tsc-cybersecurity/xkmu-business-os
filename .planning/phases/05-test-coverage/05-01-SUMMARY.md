---
phase: 05-test-coverage
plan: 01
subsystem: testing
tags: [testing, unit-tests, tenant, email, api-key, auth]
dependency_graph:
  requires: []
  provides: [unit-tests-tenant, unit-tests-email, unit-tests-api-key, unit-tests-auth-api-key]
  affects: [test-coverage]
tech_stack:
  added: []
  patterns: [vitest, vi.mock, setupDbMock, dynamic-import-after-mock]
key_files:
  created:
    - src/__tests__/unit/services/tenant.service.test.ts
    - src/__tests__/unit/services/email.service.test.ts
    - src/__tests__/unit/services/api-key.service.test.ts
    - src/__tests__/unit/auth/api-key.test.ts
  modified:
    - src/__tests__/helpers/mock-db.ts
decisions:
  - Added $dynamic() to mock-db chain methods to support Drizzle $dynamic() in TenantService
  - Used double-cast (as unknown as T) for nodemailer mock return type in email tests
metrics:
  duration: 6 minutes
  completed: 2026-03-31
  tasks_completed: 4
  files_created: 4
  files_modified: 1
---

# Phase 5 Plan 01: Unit Tests for Critical Services Summary

**One-liner:** Unit tests for TenantService (13), EmailService (11), ApiKeyService (9), auth/api-key module (16) — 49 tests total covering CRUD, error paths, and auth validation.

## What Was Built

Four new test files covering the four security-critical services identified in Phase 5 requirements (R3.3):

1. **TenantService** — create, getById, getBySlug, update, delete, list (pagination), slugExists (including update-exclude case)
2. **EmailService** — getConfig (null/gmail/smtp), isConfigured, send (no config / success / DB activity log / error), verifyConfig
3. **ApiKeyService** — create (key generation, default/explicit permissions), getById, list, delete, updateLastUsed
4. **auth/api-key module** — generateApiKey (format/prefix/uniqueness), hashApiKey, verifyApiKey, validateApiKey (invalid prefix / not found / wrong key / valid / lastUsedAt update), getApiKeyFromRequest, hasPermission

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TenantService unit tests (13 tests) | 91bdf84 | src/__tests__/unit/services/tenant.service.test.ts, src/__tests__/helpers/mock-db.ts |
| 2 | EmailService unit tests (11 tests) | 0b05724, e9b7604 | src/__tests__/unit/services/email.service.test.ts |
| 3 | ApiKeyService unit tests (9 tests) | 773574d | src/__tests__/unit/services/api-key.service.test.ts |
| 4 | auth/api-key module unit tests (16 tests) | 87d01eb | src/__tests__/unit/auth/api-key.test.ts |

## Test Results

```
Test Files: 4 passed (4)
Tests:      49 passed (49)
```

All 49 tests pass. TypeScript check (`tsc --noEmit`) passes with zero new errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added $dynamic() to mock-db chain**
- **Found during:** Task 1
- **Issue:** `TenantService.list()` and `slugExists()` use Drizzle `.$dynamic()` for conditional query building, which was not in the mock chain
- **Fix:** Added `'$dynamic'` to the `chainMethods` array in `src/__tests__/helpers/mock-db.ts`
- **Files modified:** `src/__tests__/helpers/mock-db.ts`
- **Commit:** 91bdf84

**2. [Rule 1 - Bug] Fixed TypeScript cast in email.service.test.ts**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `makeTransporter() as ReturnType<typeof nodemailer.createTransport>` failed strict TypeScript — partial mock object doesn't satisfy full Transporter interface
- **Fix:** Changed to double-cast `as unknown as ReturnType<...>` — standard TypeScript pattern for partial mock objects
- **Files modified:** `src/__tests__/unit/services/email.service.test.ts`
- **Commit:** e9b7604

## Known Stubs

None. All tests use real implementations with mocked external dependencies (DB, nodemailer, bcryptjs).

## Self-Check: PASSED
