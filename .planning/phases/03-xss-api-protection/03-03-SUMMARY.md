---
phase: 03-xss-api-protection
plan: "03"
subsystem: proxy-middleware
tags: [csrf, security, middleware, proxy]
tech_stack:
  added: []
  removed:
    - "@edge-csrf/nextjs (incompatible with Next.js 16)"
  patterns:
    - "Custom Double-Submit Cookie CSRF (no external dependency)"
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
  - "Replaced @edge-csrf/nextjs with custom implementation — peer dep only supports Next.js 13-15"
  - "CSRF middleware runs AFTER API-key early-return so M2M/n8n integrations are unaffected"
  - "sameSite: lax chosen — compatible with same-origin POST from browser navigation"
metrics:
  duration: "~15 min"
  completed_date: "2026-03-31"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 5
status: complete
---

# Phase 03 Plan 03: CSRF Protection Summary

**One-liner:** Custom Double-Submit Cookie CSRF in proxy.ts after API-key early-return, with getCsrfToken() utility for frontend.

## Status: COMPLETE

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | CSRF middleware + getCsrfToken utility | eab58a8, afcfc19 | src/proxy.ts, src/lib/utils/csrf.ts, src/__tests__/unit/proxy.test.ts |
| 2 | Production verification (checkpoint) | — | Manual tests on bos.dev.xkmu.de |

## What Was Built

### src/proxy.ts (modified)
- Custom CSRF using `crypto.getRandomValues()` + Double-Submit Cookie Pattern
- `csrfCheck()` validates matching cookie + header for POST/PUT/DELETE/PATCH
- `generateCsrfToken()` creates 32-byte random hex token
- Cookie `csrf_token` set on first authenticated response (httpOnly: false for frontend)
- Inserted after API-key early-return, before session check

### src/lib/utils/csrf.ts (created)
- Exports `getCsrfToken()` — reads `csrf_token` cookie for frontend fetch headers

### src/__tests__/unit/proxy.test.ts (created)
- 5 tests: API-key bypass, POST without token → 403, POST with token → pass, mismatched tokens → 403, GET not blocked

## Production Verification Results

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| POST without CSRF token | 403 | 403 "CSRF-Token fehlt oder ungueltig" | PASS |
| GET request | 200 | 200 | PASS |
| API-Key POST (no CSRF) | Not 403 | 401 (auth check, not CSRF) | PASS |
| App pages load | 200 | 200 | PASS |

## Deviations

- `@edge-csrf/nextjs` replaced with custom implementation — peer dependency requires Next.js ^13-15, incompatible with Next.js 16

## Self-Check: PASSED
