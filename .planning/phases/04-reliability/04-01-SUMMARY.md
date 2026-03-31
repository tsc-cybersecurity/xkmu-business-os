---
phase: 04-reliability
plan: "01"
subsystem: rate-limiting
tags: [redis, rate-limiting, reliability, ioredis, fail-open]
dependency_graph:
  requires: []
  provides: [redis-rate-limiter]
  affects: [auth-login, auth-register, ai-completion]
tech_stack:
  added: [ioredis@5.10.1]
  patterns: [singleton-factory, fail-open, fixed-window-incr-expire]
key_files:
  created:
    - src/lib/utils/redis-client.ts
    - src/__tests__/unit/utils/rate-limit.test.ts
  modified:
    - src/lib/utils/rate-limit.ts
    - src/app/api/v1/auth/login/route.ts
    - src/app/api/v1/auth/register/route.ts
    - src/app/api/v1/ai/completion/route.ts
    - package.json
    - package-lock.json
decisions:
  - "getRedisClient() factory pattern (not module-level Redis instance) prevents Next.js build-time instantiation"
  - "expire() called only when count===1 to avoid resetting TTL on every hit"
  - "Fail-open design: null Redis client and incr() throws both return null (allow request)"
metrics:
  duration_minutes: 8
  tasks_completed: 3
  files_created: 2
  files_modified: 6
  completed_date: "2026-03-31"
requirements_addressed: [R3.1]
---

# Phase 04 Plan 01: Redis Rate Limiter Migration Summary

## One-liner

Redis-backed fixed-window rate limiter using ioredis INCR/EXPIRE with fail-open design, replacing the in-memory Map.

## What Was Built

Migrated the in-memory rate limiter to a Redis-backed implementation using ioredis. Rate limit state now survives container restarts and is shared across replicas. When Redis is unavailable, requests are allowed through (fail-open) with a `logger.warn` for observability.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TDD RED — failing tests | 706b5f1 | src/__tests__/unit/utils/rate-limit.test.ts |
| 2 | ioredis install + redis-client + rate-limit migration + 3 callers | 8d214a4 | redis-client.ts, rate-limit.ts, login, register, ai-completion, package.json |
| 3 | Build verification | (no commit — verification only) | — |

## Key Decisions

1. **Factory function pattern for Redis client** — `getRedisClient()` defers instantiation to first call, preventing Next.js build-time Redis connection errors. Never export a Redis instance at module level.

2. **expire() only on count===1** — Set TTL with `windowSeconds + 1` buffer only on the first hit in a window. Subsequent hits do not reset the TTL, preventing sliding-window behavior that would defeat fixed-window semantics.

3. **Fail-open for both null client and Redis errors** — Both `getRedisClient() === null` (no REDIS_URL) and `redis.incr()` throwing result in `return null` (allow request). This ensures rate limiting never blocks legitimate traffic due to Redis unavailability.

4. **Window bucket key includes `Math.floor(Date.now() / windowMs)`** — Different time windows produce different Redis keys, allowing automatic key rotation without explicit cleanup.

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| `grep -rn "rateLimit(" src/app/` shows only `await rateLimit(` | PASS — zero bare calls |
| 6 tests pass in rate-limit.test.ts | PASS |
| `npx next build` completes without errors | PASS |
| `redis-client.ts` exists and exports `getRedisClient` | PASS |
| `rate-limit.ts` is async (returns `Promise<Response \| null>`) | PASS |
| `rate-limit.ts` contains no `new Map` or `setInterval` | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — all code is fully wired. The fail-open path correctly handles the no-Redis case.

## Self-Check: PASSED

Files verified:
- `src/lib/utils/redis-client.ts` — exists
- `src/lib/utils/rate-limit.ts` — exists, async, no Map/setInterval
- `src/__tests__/unit/utils/rate-limit.test.ts` — exists, 6 tests pass
- `src/app/api/v1/auth/login/route.ts` — uses `await rateLimit`
- `src/app/api/v1/auth/register/route.ts` — uses `await rateLimit`
- `src/app/api/v1/ai/completion/route.ts` — uses `await rateLimit`

Commits verified:
- 706b5f1 — TDD RED test file
- 8d214a4 — implementation + callers
