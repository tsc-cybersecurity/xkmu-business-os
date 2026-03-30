# Pitfalls Research

**Domain:** Next.js Multi-Tenant Security Hardening (Brownfield)
**Researched:** 2026-03-30
**Confidence:** HIGH — grounded in known codebase issues (CONCERNS.md), confirmed CVE disclosures, and current Next.js documentation

---

## Critical Pitfalls

### Pitfall 1: Middleware as the Only Auth Guard (CVE-2025-29927 Class of Bug)

**What goes wrong:**
A Next.js `middleware.ts` is added and treated as the definitive security boundary. Route handlers and API routes drop their own auth checks under the assumption that middleware already handled it. This was exactly the vulnerability pattern exploited in CVE-2025-29927 (CVSS 9.1, March 2025): an attacker sends `x-middleware-subrequest` header and the middleware is bypassed entirely, reaching unprotected route handlers directly.

**Why it happens:**
The refactoring goal is to _consolidate_ auth. Developers consolidate into middleware and then clean up "redundant" per-route auth checks as a second step — or forget to add per-route checks when writing new routes post-middleware.

**How to avoid:**
Middleware is for routing decisions, redirects, and request decoration (attaching tenant context to headers). Every API route handler must still call `withPermission()` or equivalent. The rule: middleware is a first pass, not the only pass. This project already has `withPermission()` on most routes — the pattern must be _preserved_ during migration, not removed.

**Warning signs:**
- Any API route that calls `request.headers.get('x-tenant-id')` or similar without also calling `withPermission()` — meaning it trusts middleware-set headers without re-validating the session
- New routes written after middleware is introduced that skip `withPermission()` because "middleware handles auth"
- Test failures that only appear when `x-middleware-subrequest` header is present in requests

**Phase to address:**
Middleware introduction phase. The middleware must be explicitly scoped to request decoration and redirects only. Auth must be documented as middleware + route-handler dual responsibility.

---

### Pitfall 2: Breaking the 14-Route Auth Migration with Inconsistent Rollout

**What goes wrong:**
The migration of 14 routes using local `getAuthContext()` to the shared `withPermission()` wrapper is done partially — some routes are migrated, some are not. During the transition window, the routes that still use the local implementations have different permission logic than those using the shared auth. This creates inconsistency that is hard to detect: each route _seems_ to work, but they enforce slightly different rules.

**Why it happens:**
Large-scale refactors are often done incrementally. A PR migrates 5 of 14 routes. The next sprint migrates 4 more. The final 5 sit for weeks or months. Each partial state looks "mostly done" in code review.

**How to avoid:**
Migrate all 14 routes in a single atomic PR. Use a grep/search to confirm zero remaining local `getAuthContext` definitions after the PR. Write a test that calls each migrated endpoint with an invalid session and verifies a 401 — this catches routes that lost their auth check during migration.

**Warning signs:**
- `grep -r "async function getAuthContext" src/app/api/` returns any results after migration
- API route files import from anywhere other than `@/lib/auth/auth-context` or `@/lib/auth/require-permission`
- Some routes accept requests that others reject for the same credentials

**Phase to address:**
Auth consolidation phase. Define migration as complete only when grep returns zero results.

---

### Pitfall 3: SQL Injection Fix That Introduces Tenant Isolation Bypass

**What goes wrong:**
The `sql.raw()` fix in the database import route replaces raw SQL execution with parameterized queries. In doing so, the developer parameterizes the values but forgets to enforce that the `tenantId` in the imported data matches `auth.tenantId` from the session. The fix removes the injection vector but leaves a cross-tenant data write path.

**Why it happens:**
Fixing SQL injection focuses attention on the injection vector (unescaped values). The secondary concern — who owns the data being written — is not part of the injection fix mental model. The existing code already passes `tenantId` from the session for the DELETE but this pattern can be lost when rewriting the INSERT logic.

**How to avoid:**
After fixing the parameterized query, add an explicit test: import a SQL file as tenant A that contains rows with `tenant_id` set to tenant B's ID. Verify the import fails or that all rows are rewritten to tenant A's ID. The `tenantId` from `auth.tenantId` must override or validate anything in the imported SQL file.

**Warning signs:**
- The import route reads `tenantId` from the SQL file content rather than from `auth.tenantId`
- No test exercises the cross-tenant import scenario
- The parameterized INSERT still accepts `tenantId` as a user-supplied value from the file

**Phase to address:**
SQL injection fix phase. Add the cross-tenant test before closing the fix.

---

### Pitfall 4: Content-Security-Policy That Breaks the App in Production

**What goes wrong:**
CSP headers are added in `next.config.ts` and tested locally in development. The app appears to work. On deployment to production (Docker/Nginx), inline scripts from Next.js hydration, the shadcn/ui icon library, or third-party sources are blocked by CSP. The production app shows a blank screen or broken UI. Rolling back headers requires a deployment cycle.

**Why it happens:**
Next.js in development uses `'unsafe-eval'` (required for React's development tooling) and the development build handles hydration differently than production. A CSP that works in dev fails in production when strict `script-src` directives block Next.js's inline scripts.

Three specific risks for this codebase:
- Next.js App Router injects inline scripts for hydration that require either `'unsafe-inline'` or a nonce-based approach
- The `dangerouslySetInnerHTML` markdown renderer will need `script-src` that allows the rendered content's origins
- Any `connect-src` restrictions will break the AI provider calls (Gemini, OpenAI, OpenRouter, etc.)

**How to avoid:**
Use report-only mode first: `Content-Security-Policy-Report-Only` header before enforcing. Run the production Docker build and exercise all major features. Only then switch to enforcing CSP. For Next.js App Router, a nonce-based CSP via middleware is the documented approach — but given the CVE-2025-29927 lesson, the nonce must be generated in middleware and also validated at the route level if used for auth purposes.

**Warning signs:**
- Browser console shows CSP violations in production but not locally
- The app renders correctly in development but shows blank sections after deployment
- `connect-src` blocks AI provider API calls (which are made from route handlers server-side, not from the browser — so `connect-src` restrictions actually don't apply to server-side fetches, but developers often add them anyway causing confusion)

**Phase to address:**
Security headers phase. Test in a production Docker build before declaring complete.

---

### Pitfall 5: CORS Fix Introduces Origin Reflection Vulnerability

**What goes wrong:**
The current `Access-Control-Allow-Origin: *` is replaced by code that reads the `Origin` request header and echoes it back as the allowed origin — "origin reflection." This is a common pattern seen in tutorials and is functionally worse than the wildcard: any origin is still permitted, but now the browser also allows credentials, bypassing the browser's own protection against `*` + credentials.

**Why it happens:**
Developers Google "replace CORS wildcard" and find examples that reflect the origin. It looks like a fix because the static `*` is gone and the response is "dynamic."

**How to avoid:**
Use an explicit allowlist from environment variables:
```typescript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://boss.xkmu.de').split(',')
const origin = request.headers.get('origin')
const allowedOrigin = ALLOWED_ORIGINS.includes(origin ?? '') ? origin : ALLOWED_ORIGINS[0]
```
For this project, the only browser-facing origin is `boss.xkmu.de`. API key requests come from server-to-server calls and do not send Origin headers.

**Warning signs:**
- The CORS handler reads `request.headers.get('origin')` and returns that value directly as `Access-Control-Allow-Origin`
- No ALLOWED_ORIGINS environment variable exists in `docker-compose.local.yml`
- The fix was found via a tutorial rather than the Next.js documentation

**Phase to address:**
CORS fix phase. Verify by sending a request with `Origin: https://evil.com` — the response should not echo it back.

---

### Pitfall 6: API Key Permission Scoping Breaks Existing Integrations Without Warning

**What goes wrong:**
The fix to add scope checking to `withPermission()` when `role === 'api'` causes all existing API keys (which have no explicit scopes stored) to start returning 403 for every request. Any existing integrations (n8n workflows, external scripts) break silently.

**Why it happens:**
The current `withPermission()` short-circuits for API keys (grants everything). Adding a scope check with no migration plan for existing keys means zero-scoped keys get zero access — the exact opposite of the current behavior.

**How to avoid:**
Implement a migration strategy before enforcing scopes: either treat keys with no stored scopes as "full access" (backward compatible), or add a migration that assigns `scope: '*'` to all existing keys, or add a `legacyFullAccess: true` flag with a deprecation timeline. The database schema for API keys must be updated to include scopes before any enforcement logic is added. Change order: (1) schema migration, (2) admin UI to set scopes, (3) enforcement logic, (4) communication to users.

**Warning signs:**
- No migration was run to add scope data to existing API key rows before enforcement was added
- The `withPermission()` change was deployed without verifying existing API key records have scope data
- n8n workflows or external API consumers start returning errors after deployment

**Phase to address:**
API key scoping phase. This must be the last step after schema + UI are deployed, not the first.

---

### Pitfall 7: Test Coverage That Mocks Away What It Should Test

**What goes wrong:**
New unit tests are written for `auth-context.ts`, `api-key.service.ts`, and `tenant.service.ts`. They achieve 100% coverage in the test runner. But every test mocks the Drizzle `db` object so aggressively that the tests verify the test setup, not the service logic. For example: the tenant isolation test mocks `db.select()` to return a fixed result, so the actual `and(eq(table.tenantId, tenantId), ...)` Drizzle clause is never exercised.

**Why it happens:**
Pure unit tests with full DB mocking are faster to write and run reliably. The coverage metric goes up. But the most important logic — that every query actually includes the tenant filter — lives in the Drizzle query builder call that got mocked out.

**How to avoid:**
For security-critical services (tenant isolation, auth), integration tests with a real test database catch what unit tests miss. The project already has 4 integration tests using this pattern. For new critical-path tests, use the existing integration test infrastructure rather than full mocking. Unit tests with mocks are appropriate for business logic (field transformations, validation), not for verifying that security filters are applied to queries.

**Warning signs:**
- Every test in a service test file uses `jest.mock('@/lib/db', ...)` for the entire db module
- The test for `getById(tenantId, id)` does not assert that the query called `eq(table.tenantId, tenantId)`
- Coverage is 100% but no test would catch a developer accidentally removing the `tenantId` condition from a query

**Phase to address:**
Test coverage phase. Define integration tests for critical auth and tenant services as a non-optional deliverable.

---

### Pitfall 8: Hardcoded Credentials Removal Breaks Seeding Without a Recovery Path

**What goes wrong:**
The hardcoded fallbacks in `seed-check.ts` and `seed.ts` are removed. The docker-compose does not have `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` set. The next deployment to a new environment runs the seed and fails with an unhelpful error. Or worse: the seed silently skips creating the admin user, and the application starts with no admin account.

**Why it happens:**
Removing hardcoded credentials is security work. Setting up environment variables is operations/DevOps work. These are done by different people or at different times, and the dependency between them is not communicated.

**How to avoid:**
Before removing hardcoded fallbacks, add the environment variables to `docker-compose.local.yml` (as required variables with no defaults). Add startup validation that fails loudly if `SEED_ADMIN_EMAIL` is missing. Document the required variables in the project README or a deployment checklist. Change order: (1) add env vars to docker-compose, (2) add validation, (3) remove hardcoded fallbacks.

**Warning signs:**
- `docker-compose.local.yml` does not have `SEED_ADMIN_EMAIL` set before the hardcoded fallbacks are removed
- The seed function silently continues if env vars are missing rather than throwing an error
- No staging environment deployment was tested after removing the fallbacks

**Phase to address:**
Credential hardening phase. Deploy and validate in Docker before merging.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Mock all DB calls in security tests | Fast tests, CI green | Tests don't catch missing tenant filters — a security regression ships | Never for tenant-isolation tests; OK for pure business logic |
| Add middleware auth and leave per-route auth for "later cleanup" | Middleware is merged quickly | Routes without per-route auth are vulnerable to middleware bypass (CVE-2025-29927 pattern) | Never |
| Set CSP to `'unsafe-inline'` to fix breakage | App works immediately | XSS mitigation is entirely disabled; CSP provides no protection | Only in a time-boxed report-only rollout, not in enforcement |
| Reflect Origin header in CORS | Wildcard warning goes away | Functionally worse than wildcard — allows credential requests from any origin | Never |
| Migrate only some of the 14 local getAuthContext copies | PR is smaller, faster review | Inconsistent auth behavior; remaining copies accumulate forever | Never — do all 14 atomically |
| Skip Redis migration for rate limiter | No infrastructure change required | Rate limits bypass-able by hitting different container replicas | Acceptable if horizontal scaling is not planned; revisit if replicas are added |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Next.js middleware + JWT auth | Trust `x-middleware-subrequest` skip to be blocked by Nginx | Block the header at Nginx/reverse-proxy level AND keep per-route auth checks |
| DOMPurify for SSR | Import `dompurify` directly (only works in browser) | Use `isomorphic-dompurify` which works in both Node.js (SSR) and browser |
| Redis rate limiter | Connect with no retry/error fallback; if Redis is down, all requests fail | Fail open: if Redis is unavailable, allow the request and log a warning — don't make Redis a hard dependency for basic functionality |
| Docker secrets (JWT_SECRET, Redis password) | Use `${VAR:-default}` syntax in docker-compose | Use `${VAR:?error message}` which causes docker-compose to fail startup if the variable is not set |
| Drizzle `sql.raw()` replacement | Use `sql` tagged template with values interpolated as `${value}` (still unsafe) | Use `sql` tagged template where values are passed as parameters: `sql\`DELETE FROM table WHERE tenant_id = ${tenantId}\`` — Drizzle parameterizes template variables automatically |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| In-memory rate limiter (current) | Different rate limit windows per container replica; one replica exhausted while others are fresh | Migrate to Redis INCR/EXPIRE pattern using already-configured Redis | When running 2+ container replicas |
| N+1 in DIN audit save (per-answer loop) | Audit save takes seconds for 50+ questions; UI appears to hang | Batch INSERT with `db.insert().values([...])` single call | ~20+ answers, noticeable at ~50+ |
| N+1 in sort order updates (CMS, navigation) | Reordering 10+ items triggers 10+ sequential DB round-trips | Use `CASE WHEN` batch UPDATE or reorder client-side and save as array | Noticeable at 10+ items |
| Middleware running on all routes including static assets | Middleware adds latency to every `.jpg`, `.png`, `.svg` request | Add `config.matcher` to exclude `/_next/static`, `/favicon.ico`, and static file paths | Immediately on any static-asset-heavy page |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting only middleware for auth (no per-route checks) | CVSS 9.1 — any protected route accessible via header spoofing | Per-route `withPermission()` is mandatory regardless of middleware state |
| API keys with no scope enforcement | Any leaked API key grants full access to all 215 routes | Schema + scopes migration before enforcement; existing keys get `scope: '*'` during migration |
| `sameSite: lax` is not full CSRF protection | GET-based state mutations (if any exist) are CSRF-vulnerable; lax only protects cross-origin POSTs in most browsers | Audit for any state-changing GET handlers; ensure all mutations are POST/PUT/DELETE |
| Using `isomorphic-dompurify` without configuring `ALLOWED_TAGS` | DOMPurify with default config still allows `<img src=x onerror=...>` in some configurations | Configure DOMPurify with explicit `ALLOWED_TAGS` and `ALLOWED_ATTR` tailored to the markdown use case |
| Drizzle `sql` tagged template confused with `sql.raw()` | Developers see `sql\`...\`` and assume it's the same as `sql.raw()` — it is not; template variables are parameterized | Code review checklist: `sql.raw()` usage must be eliminated; `sql\`...\`` with interpolated variables is safe |
| Adding security headers only via `next.config.ts` but serving behind Nginx without header pass-through | Headers set in Next.js are stripped or overridden by Nginx default config | Verify headers reach the browser using `curl -I https://boss.xkmu.de` from outside the Docker network |

---

## "Looks Done But Isn't" Checklist

- [ ] **Middleware auth:** Middleware redirects unauthenticated requests — but route handlers still skip `withPermission()`. Verify: send a request with `x-middleware-subrequest` header to a protected route and confirm it returns 401.
- [ ] **CORS fix:** `Access-Control-Allow-Origin: *` is gone from next.config.ts — but the replacement reflects the Origin header. Verify: send `Origin: https://evil.com` and confirm the response does NOT echo it back.
- [ ] **SQL injection fix:** `sql.raw()` replaced with parameterized query — but the `tenantId` in the import still comes from the file content. Verify: import a file with a foreign tenant's ID and confirm rows are rejected or rewritten.
- [ ] **Security headers:** Headers are set in `next.config.ts` — but Nginx proxy strips them. Verify: `curl -I https://boss.xkmu.de` shows `X-Frame-Options` and `X-Content-Type-Options` in the response.
- [ ] **CSP added:** CSP header is set — but tested only in development. Verify: run the production Docker build, open the browser console on the dashboard, confirm zero CSP violations.
- [ ] **Hardcoded credentials removed:** Fallback strings deleted from seed files — but `SEED_ADMIN_EMAIL` is not in docker-compose. Verify: run `docker-compose up` on a clean environment with no `.env` file and confirm seed succeeds.
- [ ] **DOMPurify added:** `isomorphic-dompurify` is imported — but not applied to the email template preview (`dangerouslySetInnerHTML` in `email-templates/page.tsx:238`). Verify: search for all `dangerouslySetInnerHTML` usages and confirm each one passes through DOMPurify.
- [ ] **Test coverage improved:** New tests are written — but all use full DB mocks. Verify: at least one integration test per security-critical service exercises the actual query against a test database.
- [ ] **API key scoping:** `withPermission()` now checks scopes — but existing API key records have no `scope` column populated. Verify: existing API keys still function after the migration.
- [ ] **Auth consolidation:** All 14 local `getAuthContext` copies replaced — but one or two were missed. Verify: `grep -rn "async function getAuthContext" src/app/api/` returns zero results.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Middleware deployed as sole auth guard, routes left unprotected | HIGH | Audit all 215 routes for `withPermission()` presence; add missing wrappers; redeploy; this is equivalent to the original auth consolidation work |
| CORS origin reflection deployed to production | LOW | Update CORS logic to use allowlist; single-line change; redeploy Docker container |
| CSP breaks production UI | LOW-MEDIUM | Switch to `Content-Security-Policy-Report-Only` immediately; fix violations; switch back to enforcement |
| API key scoping breaks existing integrations | MEDIUM | Temporarily revert scope enforcement (feature flag or env var); run migration to assign scopes to existing keys; re-enable enforcement |
| Hardcoded credential removal breaks fresh deployments | LOW | Add env vars to docker-compose; redeploy; or temporarily revert the seed files until env vars are set |
| Test suite passes but misses tenant isolation regression | HIGH | Regression is found in production; requires identifying which query is missing the tenantId filter, writing a failing test that proves it, fixing the query, and verifying cross-tenant data was not accessed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Middleware as sole auth guard | Middleware introduction | `x-middleware-subrequest` bypass test on 5+ representative routes |
| Partial auth migration (14 routes) | Auth consolidation | `grep -rn "async function getAuthContext" src/app/api/` returns zero |
| SQL injection fix introduces tenant bypass | SQL injection fix | Integration test: cross-tenant import attempt is rejected |
| CSP breaks production UI | Security headers | Production Docker build tested in browser before merge |
| CORS origin reflection | CORS fix | `Origin: https://evil.com` request does not receive echoed origin |
| API key scoping breaks integrations | API key scoping | Existing API keys tested against all route types after scoping migration |
| Credentials removal breaks seeding | Credential hardening | Fresh Docker environment deployment with no pre-existing env file |
| Tests mock away security logic | Test coverage | At least one integration test per security service; cross-tenant scenario tested |
| DOMPurify gaps | HTML sanitization | All `dangerouslySetInnerHTML` usages audited; email template preview tested with malicious input |
| Redis rate limiter not wired up | Rate limiter migration | Load test with 2 simultaneous requests per second from same IP; confirm blocking |

---

## Sources

- CVE-2025-29927 technical analysis: [ProjectDiscovery Blog](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- CVE-2025-29927 Vercel postmortem: [Vercel Blog](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)
- CVE-2025-29927 Datadog analysis: [Datadog Security Labs](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
- Next.js middleware architecture shift: [Build with Matija](https://www.buildwithmatija.com/blog/nextjs16-middleware-change)
- Next.js CSP documentation: [Next.js Docs](https://nextjs.org/docs/app/guides/content-security-policy)
- Next.js CSP production issues: [GitHub Discussion #80997](https://next.js.org/discussions/80997)
- CORS misconfiguration statistics: [DEV Community](https://dev.to/0012303/23-of-public-apis-have-cors-misconfigurations-heres-how-to-fix-yours-3m2)
- SQL injection in ORMs 2025: [Propel](https://www.propelcode.ai/blog/sql-injection-orm-vulnerabilities-modern-frameworks-2025)
- Multi-tenant security debt: [Gibraltar Solutions](https://gibraltarsolutions.com/blog/security-debt-in-multi-tenant-architecture/)
- Next.js security best practices: [Authgear](https://www.authgear.com/post/nextjs-security-best-practices)
- Known codebase issues: `.planning/codebase/CONCERNS.md` (2026-03-30)

---

*Pitfalls research for: Next.js Multi-Tenant Security Hardening (Brownfield)*
*Researched: 2026-03-30*
