# Feature Research

**Domain:** Next.js Multi-Tenant Security Hardening
**Researched:** 2026-03-30
**Confidence:** HIGH (verified against official Next.js docs and CVE disclosures; community patterns MEDIUM)

---

## Feature Landscape

### Table Stakes (Must Have — Security Risk If Missing)

These are non-negotiable for a production multi-tenant business application. Their absence is an active security vulnerability, not merely a gap in quality.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS) | OWASP Top 10 baseline; browsers rely on these to block XSS, clickjacking, MIME sniffing | LOW | Add in `next.config.ts` `headers()` function; nonce-based CSP requires middleware |
| Fix wildcard CORS (`Access-Control-Allow-Origin: *`) | Current config exposes API key auth to any origin; with `Allow-Credentials: true` this is a browser-spec violation and security hole | LOW | Replace with explicit allowlist: `boss.xkmu.de` |
| Remove hardcoded default credentials | Credentials in source/git history are leaked secrets; prod deployments without env vars run with known password | LOW | Require `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` env vars; fail seed if absent |
| Fix SQL injection in database import (`sql.raw()`) | Raw SQL execution from uploaded files is a critical injection vector even with whitelist regex | MEDIUM | Reconstruct parameterized `INSERT` from parsed values; replace string-interpolated `DELETE` with parameterized query |
| Fix Docker Compose default secrets | `${VAR:-default}` pattern deploys with known JWT_SECRET and Redis password if env not set | LOW | Remove all default values for security-critical vars; fail container startup if unset |
| Auth consolidation (14 duplicate `getAuthContext` implementations) | Inconsistent auth creates security gaps; bug fixes must be manually replicated 14 times | MEDIUM | Migrate all 14 routes to shared `getAuthContext` + `withPermission()` wrapper |
| HTML sanitization with `isomorphic-dompurify` | `dangerouslySetInnerHTML` without sanitization enables XSS; email template preview renders raw DB HTML | LOW | Replace custom `escapeHtml()` with `isomorphic-dompurify` on all `dangerouslySetInnerHTML` sites |
| API key permission scoping | Full-access API keys violate least-privilege; any leaked key has unrestricted access to all modules | MEDIUM | Add scope columns to API key table; check scopes in `withPermission()` for `role === 'api'` |
| Next.js Middleware (`middleware.ts`) | Without centralized auth middleware, every route is a potential gap; also prerequisite for patching CVE-2025-29927 | HIGH | Centralize auth check for `/api/v1/*` and `/intern/*`; strips `x-middleware-subrequest` from external requests |
| Input validation on all mutation endpoints | Unvalidated input is the root of injection, type confusion, and business-logic bypass | LOW | Enforce `validateAndParse(schema, body)` with Zod on all POST/PUT/PATCH routes uniformly |

### Differentiators (Competitive Advantage / Quality Improvements)

These improve reliability, observability, and maintainability beyond the security baseline. Missing them is acceptable at launch but creates debt.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Redis-backed rate limiting | In-memory limiter is per-instance; horizontal scaling bypasses it; Redis already in `docker-compose` | MEDIUM | Use `INCR`/`EXPIRE` pattern with existing Redis; apply per-tenant and per-IP; auth endpoints get stricter limits |
| Unit tests for auth/tenant/email/API-key services | Regressions in these critical services are silent without tests; currently 0 of 4 tested | MEDIUM | Add Jest/Vitest tests following existing patterns in `src/__tests__/unit/services/`; target 80% coverage on auth-critical services |
| Integration tests for core API flows | 4 integration tests for 215 routes means API contract breakage goes undetected | MEDIUM | Prioritize: login flow, CRUD on CRM entities, permission enforcement, tenant isolation |
| Eliminate silent error swallowing in AI services | Empty catch blocks make AI failures invisible; debugging becomes guesswork | LOW | Add `logger.warn()` or `logger.error()` in all catch blocks; even recoverable errors should leave a trace |
| Replace `console.error` with `logger.error` in newer routes | Inconsistent logging means structured log analysis misses errors from grundschutz/ir-playbook routes | LOW | Replace 12 `console.error` calls with `logger.error(message, error, { module: '...' })` |
| Eliminate critical `as any` casts (CMS block renderer) | 20+ `as any` in one file defeats TypeScript; runtime errors possible from incorrect type assumptions | HIGH | Define discriminated union types for CMS block content shapes; high complexity due to block variety |
| Fix N+1 query patterns | Sequential awaits in loops add one DB round-trip per item; slow for large lists | MEDIUM | Use batch INSERT/UPDATE with `CASE WHEN`; `Promise.all()` where ordering doesn't matter |
| Fix `eslint-disable react-hooks/exhaustive-deps` suppressions | Stale closures in `useEffect` cause subtle bugs that are hard to reproduce | LOW-MEDIUM | Fix 6 dependency arrays or refactor to `useCallback`; each case requires individual analysis |
| Split large page components (600-1100+ lines) | Mega-components are hard to test, review, and re-render inefficiently on any state change | HIGH | Extract sub-components and custom data-fetching hooks; cockpit.tsx (1158 lines) is highest priority |

### Anti-Features (Explicitly Do Not Build)

Features that seem related or would be requested, but should be excluded from this milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Session refresh / token rotation | Security best practice; JWT with 7-day lifetime is too long | Out of scope for this milestone — requires stateful session store or refresh-token infrastructure; high risk of breaking existing auth flows | Defer to dedicated auth milestone; reduce JWT lifetime as a low-risk interim improvement |
| E2E tests (Playwright/Cypress) | Full user flow coverage is the gold standard | Too large for a hardening milestone; server components require special tooling (nextcov); ROI is lower than unit/integration tests in this phase | Add after unit+integration coverage is established |
| Schema file split (`schema.ts` 2551 lines) | Maintainability improvement | Low risk, high effort, no security impact; any split risks migration file ordering issues and merge conflicts during the split itself | Defer; add domain-specific files incrementally in future feature milestones |
| New modules or features | Stakeholders may request "while you're in there" additions | Violates the single responsibility of this milestone; security work requires clean diffs for review | Log as backlog; schedule after hardening is complete |
| Multi-factor authentication (MFA) | Security enhancement | Infrastructure not in scope; requires separate auth flow changes and UI; TOTP or passkey support is a large independent feature | Separate milestone |
| Real-time session revocation | Addresses stolen JWT concern | Requires server-side session store migration; changes fundamental JWT architecture; too large for this milestone | Covered partially by Docker container restart (re-issues all JWTs); full solution is a future milestone |
| Automated dependency updates (Dependabot/Renovate) | Supply chain security | Requires CI pipeline setup not currently present; package-lock.json consistency is the near-term fix | Use `npm ci` in Docker builds; manual audit now; automation later |

---

## Feature Dependencies

```
[Fix SQL injection (parameterized queries)]
    (no upstream dependency — fix in isolation)

[HTML Sanitization (isomorphic-dompurify)]
    (no upstream dependency — install library, wrap dangerouslySetInnerHTML sites)

[Auth Consolidation (14 routes)]
    └──required before──> [Next.js Middleware]
       (centralized middleware only works if individual routes no longer duplicate auth logic)

[Next.js Middleware]
    └──enables──> [Security Headers via Middleware (nonce-based CSP)]
    └──enables──> [CSRF validation in middleware]
    └──required for──> [CVE-2025-29927 protection] (strips x-middleware-subrequest)

[API Key Permission Scoping]
    └──requires──> [Auth Consolidation] (scopes must be checked by shared withPermission(), not 14 copies)

[Redis Rate Limiting]
    └──requires──> [Next.js Middleware] (rate limiter applied at middleware level for uniform coverage)
    └──requires──> [Redis connection already configured in docker-compose] (already met)

[Unit Tests for Auth Services]
    └──easier after──> [Auth Consolidation] (testing 1 implementation is far cheaper than 14)

[Integration Tests for API flows]
    └──easier after──> [Auth Consolidation] (predictable auth makes mocking reliable)

[Fix `as any` casts in CMS renderer]
    └──conflicts with──> [Split large page components] (same file; do one before the other to avoid merge conflicts)
```

### Dependency Notes

- **Auth Consolidation is a prerequisite for API Key Scoping:** Scopes need to be checked in `withPermission()`. If 14 routes bypass that, scopes are bypassed on 14 routes too.
- **Next.js Middleware builds on Auth Consolidation:** Adding middleware-level auth while individual routes still have their own auth copies creates a confusing double-auth layer.
- **Redis Rate Limiting requires Middleware:** Applying rate limiting uniformly requires a single chokepoint; without middleware, each of 215 routes needs its own rate-limit call.
- **`as any` elimination conflicts with component splitting:** Both touch the same large CMS file. Sequence them: type cleanup first, then extract sub-components with clean types.

---

## MVP Definition

This is a hardening milestone, not a greenfield product. "MVP" here means the minimum set that eliminates active security vulnerabilities.

### Phase 1 — Critical Security Fixes (Must Ship)

These address active vulnerabilities. Everything else is quality improvement.

- [ ] Security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options) — browsers are blind without them
- [ ] Fix wildcard CORS — API key auth is currently exposed to all origins
- [ ] Remove hardcoded default credentials — known password in git history
- [ ] Fix SQL injection in database import — `sql.raw()` with user-supplied content
- [ ] Fix Docker Compose default secrets — known JWT_SECRET in production if env not set
- [ ] HTML sanitization with `isomorphic-dompurify` — XSS via `dangerouslySetInnerHTML`
- [ ] Auth consolidation (14 duplicate implementations) — prerequisite for everything below
- [ ] API key permission scoping — full-access keys violate least privilege
- [ ] Next.js Middleware with centralized auth — closes CVE-2025-29927 attack surface; prerequisite for rate limiting

### Phase 2 — Reliability Improvements (Should Ship in Same Milestone)

- [ ] Redis-backed rate limiting — in-memory limiter silently fails at scale
- [ ] Unit tests for auth/tenant/email/API-key services — regressions in critical services are currently invisible
- [ ] Integration tests for login, CRUD, permission, and tenant-isolation flows
- [ ] Fix silent error swallowing in AI services — debugging AI failures is currently impossible
- [ ] Replace `console.error` with `logger.error` in newer routes

### Phase 3 — Code Quality (Defer If Time-Constrained)

- [ ] Eliminate critical `as any` casts in CMS renderer — technical debt, not security
- [ ] Fix N+1 query patterns — performance, not security
- [ ] Fix `eslint-disable` suppressions — maintenance quality
- [ ] Split large page components — maintainability, not security

---

## Feature Prioritization Matrix

| Feature | Security Value | Implementation Cost | Priority |
|---------|----------------|---------------------|----------|
| Security headers | HIGH | LOW | P1 |
| Fix wildcard CORS | HIGH | LOW | P1 |
| Remove hardcoded credentials | HIGH | LOW | P1 |
| Fix SQL injection | HIGH | MEDIUM | P1 |
| Fix Docker Compose secrets | HIGH | LOW | P1 |
| HTML sanitization | HIGH | LOW | P1 |
| Auth consolidation (14 routes) | HIGH | MEDIUM | P1 |
| API key permission scoping | HIGH | MEDIUM | P1 |
| Next.js Middleware | HIGH | HIGH | P1 |
| Redis rate limiting | MEDIUM | MEDIUM | P2 |
| Unit tests (auth/tenant/email/api-key) | HIGH (regression safety) | MEDIUM | P2 |
| Integration tests (core flows) | HIGH (regression safety) | MEDIUM | P2 |
| Fix silent AI error swallowing | LOW | LOW | P2 |
| Replace `console.error` with `logger` | LOW | LOW | P2 |
| Eliminate `as any` in CMS renderer | LOW | HIGH | P3 |
| Fix N+1 query patterns | MEDIUM (perf) | MEDIUM | P3 |
| Fix `eslint-disable` suppressions | LOW | LOW | P3 |
| Split large page components | LOW | HIGH | P3 |

**Priority key:**
- P1: Active security risk — must ship in Phase 1
- P2: Reliability and regression safety — ship in Phase 2
- P3: Quality improvement — ship in Phase 3 or defer

---

## Security Standard Benchmarks

Rather than competitors, this domain maps to recognized security standards. The table stakes above align with:

| Standard | Requirement | This App's Current Gap |
|----------|-------------|------------------------|
| OWASP Top 10 A03: Injection | Parameterized queries everywhere | `sql.raw()` in database import route |
| OWASP Top 10 A05: Security Misconfiguration | Security headers, no wildcard CORS | No CSP/X-Frame-Options, wildcard CORS |
| OWASP Top 10 A07: Auth Failures | Centralized, consistent auth | 14 duplicate `getAuthContext` implementations |
| OWASP API Security Top 10 API4: Unrestricted Resource Consumption | Rate limiting on all endpoints | In-memory rate limiter only; bypassed at scale |
| OWASP API Security Top 10 API5: Broken Function Level Auth | Granular API scopes | API keys bypass all permission checks |
| CVE-2025-29927 (Next.js) | Strip `x-middleware-subrequest` from external requests | No `middleware.ts` exists |
| BSI Grundschutz OPS.1.1.3 | No hardcoded credentials in source | Default admin credentials in seed files |

---

## Sources

- [Next.js Security Best Practices: Complete 2026 Guide — Authgear](https://www.authgear.com/post/nextjs-security-best-practices)
- [CVE-2025-29927: Next.js Middleware Authorization Bypass — ProjectDiscovery](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [Postmortem on Next.js Middleware bypass — Vercel](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)
- [Guides: Content Security Policy — Next.js official docs](https://nextjs.org/docs/app/guides/content-security-policy)
- [How to Think About Security in Next.js — Next.js official blog](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [isomorphic-dompurify — npm](https://www.npmjs.com/package/isomorphic-dompurify)
- [Drizzle ORM Magic sql operator — official docs](https://orm.drizzle.team/docs/sql)
- [OWASP API Security Top 10 — API Security 2025 analysis](https://thehgtech.com/guides/api-security-best-practices.html)
- [Complete Next.js security guide 2025 — TurboStarter](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)
- [Rate Limiting Next.js API Routes using Upstash Redis — Upstash Blog](https://upstash.com/blog/nextjs-ratelimiting)
- [next-test-api-route-handler — npm](https://www.npmjs.com/package/next-test-api-route-handler)

---

*Feature research for: Next.js Multi-Tenant Security Hardening (xKMU BusinessOS)*
*Researched: 2026-03-30*
