---
phase: 02-security-layer
plan: 01
subsystem: infra
tags: [cors, security-headers, csp, cve-2025-29927, next.config, proxy, middleware]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: withPermission() on all 14 routes (defense-in-depth anchor)
provides:
  - CORS wildcard removed from next.config.ts
  - Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP-Report-Only
  - ALLOWED_ORIGINS env var in docker-compose.local.yml with default https://boss.xkmu.de
  - CVE-2025-29927 defense in src/proxy.ts (x-middleware-subrequest strip)
  - CORS allowlist from ALLOWED_ORIGINS env var in proxy.ts (no wildcard, no origin reflection)
  - OPTIONS preflight handler returning 204 for allowed origins
  - Expanded matcher excluding static asset extensions
affects:
  - 03-csrf-protection (CORS baseline established, proxy.ts is extension point)
  - 04-rate-limiting (proxy.ts updated matcher pattern to follow)
  - docker-deployment (ALLOWED_ORIGINS env var must be set in .env on Hetzner server)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CORS enforcement in proxy.ts (not next.config.ts) — only proxy.ts can read request Origin headers"
    - "CSP in Content-Security-Policy-Report-Only mode — switch to enforcement after Docker build verification"
    - "CVE-2025-29927 defense: strip x-middleware-subrequest as first operation in proxy()"
    - "ALLOWED_ORIGINS from env var with :- default (not :?) — optional config, not a required secret"
    - "No origin reflection — Access-Control-Allow-Origin only set when isAllowedOrigin === true"

key-files:
  created: []
  modified:
    - next.config.ts
    - docker-compose.local.yml
    - src/proxy.ts

key-decisions:
  - "CORS handling moved from next.config.ts to proxy.ts: next.config.ts headers() cannot read request headers, so dynamic origin checks (allowlist) are only possible in proxy.ts"
  - "CSP starts in Report-Only mode (Content-Security-Policy-Report-Only) — switch to enforcement after Docker build verification shows zero violations"
  - "ALLOWED_ORIGINS uses :- default syntax (not :?) because it has a sensible production default (boss.xkmu.de) unlike required secrets like JWT_SECRET"
  - "OPTIONS preflight returns 204 (not 200) with correct CORS headers — only for allowed origins, never reflecting unknown origins"
  - "x-middleware-subrequest strip is defense-in-depth — withPermission() in all routes remains the real auth gate"

patterns-established:
  - "Pattern: No CORS in next.config.ts — all CORS logic lives in src/proxy.ts"
  - "Pattern: CSP Report-Only first, Docker build verification, then enforcement"
  - "Pattern: Allowlist check before any CORS header setting — never reflect unknown origins"

requirements-completed: [R1.2, R1.3, R2.2]

# Metrics
duration: 6min
completed: 2026-03-31
---

# Phase 02 Plan 01: CORS Hardening, Security Headers, and CVE-2025-29927 Defense Summary

**Wildcard CORS removed from next.config.ts; CORS allowlist + CVE-2025-29927 defense + OPTIONS preflight added to src/proxy.ts; 5 security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP-Report-Only) added**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-31T05:39:26Z
- **Completed:** 2026-03-31T05:45:25Z
- **Tasks:** 4
- **Files modified:** 3

## Accomplishments

- Removed wildcard `Access-Control-Allow-Origin: *` from `next.config.ts` (P0 security issue)
- Added 5 security headers to every response via `next.config.ts` headers() with environment-aware CSP
- Added CVE-2025-29927 defense to `src/proxy.ts`: strips `x-middleware-subrequest` header as first operation
- Implemented CORS allowlist from `ALLOWED_ORIGINS` env var in proxy.ts with no origin reflection
- Added OPTIONS preflight handler returning 204 with correct CORS headers for allowed origins
- Expanded proxy.ts matcher to exclude all static asset extensions (svg, png, jpg, woff, eot, etc.)
- Production build passes: `npx next build` exits 0 with "Compiled successfully"

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove CORS wildcard and add security headers to next.config.ts** - `470f673` (feat)
2. **Task 2: Add ALLOWED_ORIGINS to docker-compose.local.yml** - `b344bc2` (feat)
3. **Task 3: Add CVE-2025-29927 defense and CORS allowlist to src/proxy.ts** - `a1f59ba` (feat)
4. **Task 4: Verify build passes** - (no code changes, build verified on a1f59ba)

**Plan metadata:** (docs commit — created after this summary)

## Files Created/Modified

- `next.config.ts` - Removed CORS wildcard block; added isDev const, cspDirectives, and 5-header security block for all routes
- `docker-compose.local.yml` - Added `ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-https://boss.xkmu.de}` to app service environment
- `src/proxy.ts` - Added ALLOWED_ORIGINS const, CVE-2025-29927 defense (x-middleware-subrequest strip), OPTIONS preflight handler, CORS allowlist on responses, expanded matcher config

## Decisions Made

- **CORS in proxy.ts, not next.config.ts:** `next.config.ts` `headers()` cannot read request Origin headers, making dynamic allowlist checks impossible there. CORS enforcement belongs in `src/proxy.ts` only.
- **CSP Report-Only mode:** CSP added as `Content-Security-Policy-Report-Only` (not `Content-Security-Policy`). Switch to enforcement only after verifying zero violations in a Docker production build via browser console.
- **`:-` default for ALLOWED_ORIGINS:** Using `:-` syntax (not `:?`) because `ALLOWED_ORIGINS` has a sensible default (`https://boss.xkmu.de`). The `:?` pattern (fail-fast) is reserved for required secrets with no default (JWT_SECRET, REDIS_PASSWORD).
- **204 for OPTIONS preflight:** RFC 7230 / CORS spec recommends 204 No Content for OPTIONS preflight (not 200). Correctly returns 204 with CORS headers only for allowed origins.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Set ALLOWED_ORIGINS on Hetzner server if additional origins need CORS access:**

The `docker-compose.local.yml` uses `ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-https://boss.xkmu.de}`. The default covers the primary production domain. If `n8n.xkmu.de` or other origins need API access, add to `.env` on the server:

```
ALLOWED_ORIGINS=https://boss.xkmu.de,https://n8n.xkmu.de
```

## Next Phase Readiness

- CORS baseline established — `proxy.ts` is the extension point for Phase 3 (CSRF protection)
- `withPermission()` on all routes from Phase 1 remains the actual auth gate (defense-in-depth)
- CSP in Report-Only mode — after Docker deployment, check browser console for CSP violations before switching to enforcement mode
- No blockers for Phase 3

---
*Phase: 02-security-layer*
*Completed: 2026-03-31*
