---
phase: 03-xss-api-protection
plan: "03"
subsystem: proxy-middleware
tags: [csrf, security, middleware, proxy]
dependency_graph:
  requires:
    - 03-02
  provides:
    - CSRF protection for session-authenticated mutation routes
    - getCsrfToken() frontend utility
  affects:
    - src/proxy.ts
    - All POST/PUT/DELETE/PATCH API endpoints (session auth)
tech_stack:
  added:
    - "@edge-csrf/nextjs ^2.x"
  patterns:
    - "createCsrfMiddleware factory pattern (module-level singleton)"
    - "Early-return CSRF bypass for API-key requests"
key_files:
  created:
    - src/__tests__/unit/proxy.test.ts
    - src/lib/utils/csrf.ts
  modified:
    - src/proxy.ts
    - package.json
    - package-lock.json
decisions:
  - "CSRF middleware runs AFTER API-key early-return so M2M/n8n integrations are unaffected"
  - "csrfProtect singleton created at module level (not inside proxy function) for performance"
  - "sameSite: lax chosen — compatible with same-origin POST from browser navigation"
metrics:
  duration: "~4 min"
  completed_date: "2026-03-31"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 5
status: checkpoint
---

# Phase 03 Plan 03: CSRF Middleware Integration Summary

**One-liner:** @edge-csrf/nextjs integrated in proxy.ts after API-key early-return, with getCsrfToken() cookie-reader utility for frontend mutation calls.

## Status: CHECKPOINT — Awaiting Human Verification

Task 1 complete and committed. Task 2 is a `checkpoint:human-verify` gate.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install package, integrate CSRF in proxy.ts, create getCsrfToken utility | eab58a8 | src/proxy.ts, src/lib/utils/csrf.ts, src/__tests__/unit/proxy.test.ts |

## What Was Built

### src/proxy.ts (modified)
- Added `import { createCsrfMiddleware } from '@edge-csrf/nextjs'`
- Module-level singleton: `const csrfProtect = createCsrfMiddleware({ cookie: { secure: prod, name: 'csrf_token', sameSite: 'lax' } })`
- Inserted CSRF check after API-key early-return block, before session check:
  ```typescript
  const csrfResponse = await csrfProtect(request)
  if (csrfResponse) return csrfResponse  // 403 bei fehlendem/ungueltigem CSRF-Token
  ```

### src/lib/utils/csrf.ts (created)
- Exports `getCsrfToken()` — reads `csrf_token` cookie for use in frontend fetch headers

### src/__tests__/unit/proxy.test.ts (created)
- 3 tests covering: API-key bypass (no CSRF call), GET pass-through, POST returning 403
- All 3 tests pass (GREEN)

## Verification Completed (Automated)

- [x] `npx vitest run src/__tests__/unit/proxy.test.ts` — 3/3 tests pass
- [x] `grep -n "createCsrfMiddleware\|csrfProtect" src/proxy.ts` — both present (lines 4, 36, 124)
- [x] `grep -n "csrf_token\|getCsrfToken" src/lib/utils/csrf.ts` — getCsrfToken reads csrf_token cookie
- [x] `npx next build` — succeeds (no build errors)
- [ ] Human checkpoint (Task 2) — pending

## Awaiting: Task 2 Manual Verification

See PLAN.md Task 2 for the 5 manual checks.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PARTIAL (checkpoint)

Task 1 commit verified:
- `eab58a8` exists in git log
- `src/proxy.ts` contains `createCsrfMiddleware` and `csrfProtect`
- `src/lib/utils/csrf.ts` exists and exports `getCsrfToken`
- `src/__tests__/unit/proxy.test.ts` exists with 3 passing tests
