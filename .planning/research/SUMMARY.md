# Project Research Summary

**Project:** xKMU BusinessOS — Security Hardening
**Domain:** Next.js App Router Multi-Tenant SaaS Security Hardening (Brownfield)
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

xKMU BusinessOS is a production multi-tenant business management platform running on Next.js 16 App Router, PostgreSQL via Drizzle ORM, and Docker-only deployment. The security hardening work required here is not greenfield architecture — it is brownfield remediation of 8 confirmed vulnerability classes in a live application. The recommended approach follows a strict dependency order: consolidate authentication first (14 duplicate `getAuthContext` copies), then build all other security layers on top of that single correct foundation. All fixes use the existing stack and native Next.js primitives wherever possible; only 4 new dependencies are required (`isomorphic-dompurify`, `ioredis`, `@edge-csrf/nextjs`, `server-only`).

The critical risks in this project are not complexity of implementation — most individual fixes are LOW-MEDIUM complexity — but sequencing and verification. Three classes of "looks done but isn't" failures dominate: partial auth migration leaving some routes unprotected, a CORS fix that introduces origin reflection (worse than the wildcard it replaces), and a CSP that works in development but breaks the production Docker build. Every phase must include explicit verification steps before it is declared complete. The PITFALLS research identifies 10 specific "looks done but isn't" checkpoints that each phase must pass.

The hardening milestone has a clear three-phase structure. Phase 1 eliminates active security vulnerabilities (9 items, all P1). Phase 2 adds reliability and regression safety (5 items, P2). Phase 3 addresses technical debt and code quality that carries no security risk but accumulates maintenance cost. The total scope is well-bounded; the only items deferred out of this milestone entirely are those requiring new infrastructure (MFA, session revocation, E2E tests) or those that would introduce scope creep (new features, schema splits).

---

## Key Findings

### Recommended Stack

The project's existing stack (Next.js 16, Drizzle ORM, PostgreSQL, Redis already in Docker Compose, Vitest already configured) covers the vast majority of requirements without new dependencies. The only justified additions are: `isomorphic-dompurify` for SSR-safe HTML sanitization (the standard `dompurify` package throws in Node.js server components), `ioredis` to connect to the already-present Redis instance for process-agnostic rate limiting, `@edge-csrf/nextjs` for CSRF token protection on the 215 REST API routes (Server Actions have built-in protection but the app's primary mutation surface is REST), and `server-only` to prevent accidental client-side import of auth and database modules.

Explicitly avoided: `@next-safe/middleware` (unmaintained, 4 years since last publish), `helmet` (Express-only, breaks Next.js standalone Docker output), `@upstash/ratelimit` (requires Upstash SaaS, violates Docker-only constraint), and any direct use of `dompurify` without the isomorphic wrapper.

**Core technologies:**
- `isomorphic-dompurify@^3.6.0`: HTML sanitization for both server components and client — only production-tested DOMPurify wrapper for Next.js SSR
- `ioredis@^5.10.1`: Redis client for rate limiting migration — superior reconnection logic, BullMQ-compatible, 12.8M weekly downloads
- `@edge-csrf/nextjs@^2.5.x`: CSRF token protection for `/api/v1/*` REST routes — edge-runtime compatible, signed double-submit cookie pattern
- `server-only@^0.0.1`: Build-time guard against client-side import of server modules
- Native Next.js `headers()` in `next.config.ts`: Security headers (X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy) — no external dependency
- Native `middleware.ts`: CSP nonce injection, fast auth rejection, CVE-2025-29927 defense — no external dependency
- Drizzle query builder (already in use): Parameterized queries — `sql.raw()` must be eliminated; it is the confirmed SQL injection vector

### Expected Features

Research identified 9 table-stakes security fixes that constitute active vulnerabilities if unaddressed, plus 5 reliability improvements and 4 code-quality improvements. This is a hardening milestone, not a feature milestone; "MVP" means the minimum that eliminates active security vulnerabilities.

**Must have (table stakes — active vulnerabilities):**
- Security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options) — OWASP Top 10 baseline
- Fix wildcard CORS (`Access-Control-Allow-Origin: *` with credentials) — browser-spec violation, API auth exposure
- Remove hardcoded default credentials in seed files — known password in git history
- Fix SQL injection in database import route (`sql.raw()` with user-supplied content) — OWASP A03
- Fix Docker Compose default secrets (`${VAR:-default}` pattern for JWT_SECRET) — known secret in production
- HTML sanitization with `isomorphic-dompurify` on all `dangerouslySetInnerHTML` call sites — XSS vector
- Auth consolidation (14 duplicate `getAuthContext` implementations) — prerequisite for everything below
- API key permission scoping (full-access bypass removed from `withPermission()`) — OWASP API5
- Next.js `middleware.ts` with centralized auth fast-path — CVE-2025-29927 defense, rate limiting prerequisite

**Should have (reliability):**
- Redis-backed rate limiting (replace in-memory `Map`) — in-memory fails silently at scale and across restarts
- Unit tests for auth, tenant, email, API key services — currently 0 of 4 covered
- Integration tests for login, CRUD, permission, and tenant-isolation flows — 4 tests for 215 routes is insufficient
- Fix silent error swallowing in AI services (empty catch blocks) — debugging AI failures is currently impossible
- Replace `console.error` with `logger.error` in 12 newer routes — structured log analysis misses these errors

**Defer (Phase 3 / v2+):**
- Eliminate `as any` casts in CMS block renderer (20+ casts, high effort, no security impact)
- Fix N+1 query patterns (performance, not security)
- Fix `eslint-disable react-hooks/exhaustive-deps` suppressions
- Split large page components (cockpit.tsx at 1158 lines)
- Session refresh / token rotation (requires new auth infrastructure)
- MFA, E2E tests, schema file split — explicitly out of scope for this milestone

### Architecture Approach

The target architecture is a two-layer defense model: `middleware.ts` provides fast rejection and request decoration (security headers, strip CVE-2025-29927 attack header, redirect unauthenticated users), while every API route independently enforces full auth via `withPermission()`. The canonical `getAuthContext()` in `src/lib/auth/auth-context.ts` is the single source of truth for "who is this request" — all 14 local copies must be eliminated. API key permissions migrate from a full-access bypass to module-scoped checks (`leads:read`, `companies:write`, `*:*`) checked against the same `(module, action)` parameters that RBAC uses. Rate limiting moves from a per-process in-memory `Map` to Redis `INCR/EXPIRE` with a Lua script for atomicity, using the Redis instance already present in `docker-compose.local.yml`.

**Major components:**
1. `middleware.ts` (new) — pre-route security: strip `x-middleware-subrequest`, redirect unauthenticated `/intern/*`, attach security headers, enforce CORS allowlist
2. `src/lib/auth/auth-context.ts` (consolidated) — single `getAuthContext()` producing `AuthContext { tenantId, userId, role, roleId, keyPermissions }`
3. `withPermission()` (extended) — RBAC check + API key scope check; rate limiter call; single chokepoint for all 215 API routes
4. `src/lib/utils/sanitize.ts` (new) — `isomorphic-dompurify` wrapper; all `dangerouslySetInnerHTML` call sites import this
5. `src/lib/utils/rate-limit.ts` (rewritten) — Redis INCR/EXPIRE via ioredis singleton; replaces in-memory Map
6. `next.config.ts` (updated) — static security headers, explicit CORS allowlist, Docker secrets validation
7. Database layer — `sql.raw()` eliminated; all queries parameterized; `tenantId` on every WHERE clause

### Critical Pitfalls

1. **Middleware deployed as the only auth guard** — CVE-2025-29927 proved middleware can be bypassed. Prevention: `withPermission()` remains mandatory in every route handler regardless of middleware state. Verification: send `x-middleware-subrequest` header to 5 representative routes and confirm 401.

2. **Partial auth migration (14 routes done in batches)** — Routes migrated at different times create inconsistent auth behavior. Prevention: migrate all 14 routes in a single atomic PR. Verification: `grep -rn "async function getAuthContext" src/app/api/` must return zero results.

3. **CORS fix introduces origin reflection** — Replacing `*` with code that reads and echoes the `Origin` header is functionally worse (allows credentials from any origin). Prevention: use an explicit allowlist from `process.env.ALLOWED_ORIGINS`. Verification: send `Origin: https://evil.com` and confirm the response does not echo it back.

4. **CSP breaks production build** — Next.js development and production handle inline scripts differently. A CSP that passes in dev fails in production Docker. Prevention: use `Content-Security-Policy-Report-Only` first, test in a production Docker build, then switch to enforcement. Verification: zero CSP violations in browser console on the production build.

5. **API key scoping breaks existing integrations without warning** — Adding scope enforcement before migrating existing key records drops all API keys to zero access. Prevention: schema migration first (add scope column), assign `scope: '*'` to existing keys, then enforce. Verification: existing API keys (n8n workflows) still return 200 after the migration.

6. **SQL injection fix introduces tenant isolation bypass** — Fixing parameterization but reading `tenantId` from the imported file content (rather than `auth.tenantId`) converts an injection bug into a cross-tenant write bug. Prevention: `auth.tenantId` overrides any tenant reference in the imported SQL file. Verification: integration test imports a file with a foreign tenant's ID and verifies rejection.

---

## Implications for Roadmap

Based on research, the feature dependency graph and pitfall-to-phase mapping suggest four phases. Three phases align with FEATURES.md's P1/P2/P3 structure; a fourth phase is added to separate auth consolidation as an explicit prerequisite gate.

### Phase 1: Foundation — Auth Consolidation + Quick Security Wins

**Rationale:** Auth consolidation is the prerequisite for API key scoping, meaningful tests, and predictable middleware behavior. It must come first. The "quick wins" (CORS fix, hardcoded credentials, Docker secrets, SQL injection fix) have no dependencies and can be done in the same phase to eliminate all the LOW-complexity vulnerabilities early.

**Delivers:** A single canonical auth function; zero LOCAL `getAuthContext` copies; elimination of hardcoded credentials and SQL injection vectors.

**Addresses from FEATURES.md:** Auth consolidation (14 routes), fix wildcard CORS, remove hardcoded credentials, fix SQL injection, fix Docker Compose secrets.

**Avoids from PITFALLS.md:** Partial migration pitfall (all 14 routes in one atomic PR); SQL injection tenant bypass (cross-tenant import test before close); CORS origin reflection (allowlist pattern, not reflection).

**Research flag:** Standard patterns — well-documented Drizzle parameterization and Next.js CORS configuration. No additional research needed.

---

### Phase 2: Security Layer — Middleware, Headers, Sanitization, API Key Scoping

**Rationale:** Middleware can only be added cleanly after auth consolidation is complete (otherwise middleware + 14 local auth copies create confusing double-auth). Security headers and HTML sanitization are independent but logically grouped with the middleware addition. API key scoping depends on `withPermission()` being the single chokepoint (established in Phase 1).

**Delivers:** `middleware.ts` with CVE-2025-29927 defense; all security response headers; `isomorphic-dompurify` on all `dangerouslySetInnerHTML` sites; API keys with module-scoped permissions replacing the full-access bypass.

**Addresses from FEATURES.md:** Next.js middleware (centralized auth fast-path), security headers (CSP, X-Frame-Options, HSTS), HTML sanitization, API key permission scoping.

**Uses from STACK.md:** Native Next.js `middleware.ts`, native `next.config.ts` `headers()`, `isomorphic-dompurify`, `server-only`.

**Avoids from PITFALLS.md:** Middleware-only auth pitfall (per-route `withPermission()` preserved); CSP production breakage (report-only first, test in Docker build); API key integration breakage (schema + `scope: '*'` migration before enforcement).

**Research flag:** Needs phase research for CSP nonce strategy — the interaction between Next.js App Router hydration scripts and strict CSP enforcement has edge cases specific to the app's AI provider integrations and markdown rendering.

---

### Phase 3: Reliability — Redis Rate Limiting + Test Coverage + Logging

**Rationale:** Rate limiting requires both middleware (Phase 2) and the confirmed Redis connection. Tests are most cost-effective after auth consolidation (1 implementation to test, not 14). Logging fixes are bundled here as low-complexity cleanup that reduces debugging debt.

**Delivers:** Redis-backed rate limiting replacing the per-process in-memory Map; unit tests for auth/tenant/email/API-key services (target 80% coverage); integration tests for login, CRUD, permission, tenant-isolation flows; structured logging in all routes.

**Addresses from FEATURES.md:** Redis-backed rate limiting, unit tests for critical services, integration tests for core API flows, fix silent AI error swallowing, replace `console.error` with `logger.error`.

**Uses from STACK.md:** `ioredis@^5.10.1` (Redis INCR/EXPIRE pattern), `msw@^2.x` (mock AI provider HTTP calls in tests), `@testing-library/react` (component-level security tests), Vitest (already configured, 19 tests passing).

**Avoids from PITFALLS.md:** Tests that mock away security logic (integration tests with real test DB for tenant-isolation paths, not just unit tests with full DB mocks); rate limiter not wired up (load test verification).

**Research flag:** Standard patterns — Redis INCR/EXPIRE rate limiting is well-documented in Redis official docs. Vitest integration test patterns already established in the codebase (`src/__tests__/integration/`). No additional research needed.

---

### Phase 4: Code Quality — Type Safety, Performance, Component Architecture

**Rationale:** Code quality work carries no security risk and no blocking dependencies. It is deferred until after all P1/P2 security and reliability work is confirmed stable in production. Bundled here to avoid scope creep into earlier phases.

**Delivers:** Elimination of critical `as any` casts in CMS block renderer; N+1 query fixes for DIN audit save and sort order updates; `eslint-disable react-hooks/exhaustive-deps` suppressions resolved; large page component extraction (cockpit.tsx priority).

**Addresses from FEATURES.md:** All P3 items — `as any` elimination, N+1 queries, ESLint suppressions, component splitting.

**Avoids from PITFALLS.md:** `as any` fix and component split conflict in the same file — sequence type cleanup before component extraction to avoid merge conflicts.

**Research flag:** The discriminated union type design for CMS block content shapes is non-trivial. If the CMS renderer has 20+ block types, research into TypeScript discriminated union patterns for plugin-style renderers may be warranted before implementing.

---

### Phase Ordering Rationale

- **Auth first** because 8 of 9 P1 security features either depend on or benefit from a single, correct auth implementation. Fixing CORS, SQL injection, and credentials in parallel is safe; any middleware or API key work done before auth consolidation creates a double-auth layer that is hard to reason about.
- **Security headers and middleware second** because middleware requires understanding what headers `next.config.ts` already sets (to avoid duplication) — clarity gained after Phase 1.
- **Rate limiting third** because it requires both middleware (Phase 2) and the confirmed ioredis connection. Test coverage is also cheaper after consolidation: one auth implementation to mock, not fourteen.
- **Code quality last** because it has zero security dependency and zero runtime impact. Any ordering that puts code quality before security work is wrong.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (CSP nonce strategy):** The interaction between Next.js App Router inline hydration scripts, the existing markdown renderer, and strict CSP enforcement needs per-app analysis. The `unsafe-inline` fallback works but eliminates XSS protection; a nonce-based approach requires middleware-level nonce generation and passing nonces to all inline script sites.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Drizzle parameterization and Next.js CORS config are fully documented and codebase-specific (the exact routes are known).
- **Phase 3:** Redis INCR/EXPIRE pattern is well-documented. Vitest integration test infrastructure already exists and the patterns are established.
- **Phase 4:** TypeScript discriminated unions are well-documented, though the CMS renderer complexity may warrant a scoping pass before committing to the approach.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core recommendations verified against official Next.js 16.2.1 docs, Drizzle ORM docs, and npm registry. The `@edge-csrf/nextjs` version is MEDIUM (last published ~1 year ago, rc suffix). |
| Features | HIGH | Grounded in direct codebase analysis (CONCERNS.md), confirmed CVE disclosures, and OWASP standards. Community patterns MEDIUM. |
| Architecture | HIGH | Based on direct codebase inspection of `src/lib/auth/`, `next.config.ts`, `middleware.ts` (absent), rate limiter. Architecture research used official Next.js docs for edge cases. |
| Pitfalls | HIGH | Grounded in known codebase issues, CVE-2025-29927 official disclosures, and Vercel postmortem. The "looks done but isn't" checklist is directly derived from confirmed bugs in CONCERNS.md. |

**Overall confidence:** HIGH

### Gaps to Address

- **`@edge-csrf/nextjs` production maturity:** Last published approximately 1 year ago; the `2.5.3-cloudflare-rc1` version suffix warrants monitoring for a stable release. If no update appears, evaluate implementing the double-submit cookie pattern manually (well-understood pattern, ~50 lines).
- **CSP nonce vs. `unsafe-inline` decision:** Research recommends starting with `unsafe-inline` in report-only mode, then tightening. The exact set of Next.js App Router inline scripts that need nonces must be enumerated in the production Docker build before the enforcement CSP is written. This is a planning-time decision, not a research-time decision.
- **API key migration strategy for existing keys:** The research recommends treating existing keys as `scope: '*'` (full access, backward compatible) during the migration. This is the least-disruptive approach but requires a team decision: should existing integrations be required to re-create their keys with explicit scopes, or is the backward-compatible migration acceptable?
- **Redis availability as hard dependency for rate limiting:** The pitfalls research recommends failing open (allow requests if Redis is unavailable, log a warning). This is the correct reliability trade-off for rate limiting but is a deliberate design decision that should be documented in the implementation.

---

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.1 official docs — Content Security Policy guide (nextjs.org/docs/app/guides/content-security-policy, updated 2026-03-25)
- Next.js 16.2.1 official docs — Data Security guide (nextjs.org/docs/app/guides/data-security, updated 2026-03-25)
- Drizzle ORM official docs — `sql` operator (orm.drizzle.team/docs/sql) — confirms `sql.raw()` bypasses parameterization
- Redis official docs — Rate Limiting (redis.io/tutorials/howtos/ratelimiting/)
- CVE-2025-29927 Vercel postmortem (vercel.com/blog/postmortem-on-next-js-middleware-bypass)
- Direct codebase analysis — `src/lib/auth/`, `next.config.ts`, `src/lib/utils/rate-limit.ts`, `.planning/codebase/CONCERNS.md`

### Secondary (MEDIUM confidence)
- CVE-2025-29927 technical analysis — ProjectDiscovery Blog
- CVE-2025-29927 Datadog Security Labs analysis
- Next.js App Router Authentication Guide 2026 — WorkOS
- ioredis with Next.js 16 — GitHub Discussion #91716

### Tertiary (MEDIUM-LOW confidence)
- Next.js security best practices — Authgear (2026 guide, community source)
- OWASP API Security Top 10 2025 analysis — thehgtech.com
- CORS misconfiguration statistics — DEV Community
- SQL injection in ORMs 2025 — Propel

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
