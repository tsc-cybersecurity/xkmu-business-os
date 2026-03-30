# Stack Research

**Domain:** Next.js Multi-Tenant Security Hardening
**Researched:** 2026-03-30
**Confidence:** HIGH (verified against Next.js 16.2.1 official docs, npm registry, and Drizzle ORM docs)

## Recommended Stack

### Security Headers

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js native `headers()` in `next.config.ts` | built-in (Next.js 16) | Static security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | No external dependency, zero overhead, official Next.js pattern. Headers are applied at framework level before any app code runs. |
| Next.js `middleware.ts` (proxy) with nonce generation | built-in (Next.js 16) | Dynamic CSP with per-request nonce injection | Official Next.js approach (docs updated 2026-03-25). Nonce-based CSP is mandatory when app uses inline scripts or third-party scripts, which this app does (Tailwind, React runtime). |

**Rationale for not using `@next-safe/middleware`:** Last published 4 years ago (v0.10.0), unmaintained. Next.js 16 has native CSP nonce support that supersedes it.

**Rationale for not using `next-secure-headers`:** Adds another dependency for functionality that is 100% native in Next.js `next.config.ts` headers(). Use native API.

**CSP strategy decision for this project:** Use `next.config.ts` `headers()` with `unsafe-inline` for static headers, plus a `middleware.ts` that generates nonces for dynamic pages. The app already has an all-dynamic rendering model (multi-tenant, auth-gated), so nonce overhead is negligible. This avoids PPR incompatibility issues.

---

### HTML Sanitization

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `isomorphic-dompurify` | ^3.6.0 | Sanitize HTML before `dangerouslySetInnerHTML` on both server (SSR) and client | The only production-tested wrapper for DOMPurify that works in Node.js SSR without configuration gymnastics. 2M+ weekly downloads. Active maintenance (v3.6.0 published days ago as of research date). |

**Why not `dompurify` directly:** `dompurify` requires a DOM environment. In Next.js App Router server components and route handlers (Node.js), there is no browser DOM. Using it directly throws at build or runtime. `isomorphic-dompurify` handles this by using `jsdom` on the server side.

**Known issue:** `isomorphic-dompurify` v3+ uses jsdom v28+ which can cause `ERR_REQUIRE_ESM` in CommonJS environments. Workaround: add `"overrides": { "jsdom": "25.0.1" }` to `package.json` if the error appears. The current v3.6.0 upgraded to jsdom v29 to fix performance degradation.

**Why not `sanitize-html`:** More permissive by default, requires more configuration to be safe. DOMPurify has better XSS coverage and a stricter default allowlist.

---

### CSRF Protection

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js built-in Server Actions protection | built-in (Next.js 16) | Origin/Host header validation for Server Actions | Next.js Server Actions automatically compare `Origin` to `Host`/`X-Forwarded-Host`. Mismatches abort the request. Uses POST-only, which with `SameSite: lax` cookies blocks most CSRF. |
| `@edge-csrf/nextjs` | ^2.5.x | CSRF token for REST API routes (non-Server-Actions) | For the 215 `/api/v1/` REST routes that are not Server Actions, standard CSRF token protection is needed. `@edge-csrf/nextjs` implements the signed double-submit cookie pattern and runs in Next.js middleware (edge runtime compatible). |

**Important:** The existing app uses `/api/v1/` REST routes as primary mutation surface, not Server Actions. Server Action built-in CSRF protection therefore does NOT cover most of the attack surface. `@edge-csrf/nextjs` is required for the REST API layer.

**Note on `sameSite: lax`:** The existing session cookie already uses `sameSite: lax` (confirmed in `src/lib/auth/session.ts:30-33`). This provides baseline protection against cross-origin POST. The `@edge-csrf/nextjs` token adds defense-in-depth, required for full coverage.

**Why not `csrf-csrf`:** `@edge-csrf/nextjs` is specifically designed for Next.js middleware/edge runtime. `csrf-csrf` targets Express/Node HTTP — additional shimming needed for Next.js App Router.

---

### Rate Limiting (Redis)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ioredis` | ^5.10.1 | Redis client for rate limiting, caching | Project already has Redis in Docker Compose (`REDIS_URL` configured). `ioredis` v5.10.1 is actively maintained (released March 2026). Robust reconnection, pipelining, and full Redis command support. 12.8M weekly downloads. |

**Implementation pattern:** Replace the in-memory `Map` in `src/lib/utils/rate-limit.ts` with Redis `INCR`/`EXPIRE` commands via `ioredis`. Pattern:
```typescript
const key = `rate:${identifier}:${windowStart}`
const count = await redis.incr(key)
if (count === 1) await redis.expire(key, windowSeconds)
if (count > limit) throw new RateLimitError()
```

**Why not `@upstash/ratelimit`:** Upstash is a managed serverless Redis service. This project uses a self-hosted Docker Redis instance and must remain Docker-only (project constraint). `@upstash/ratelimit` is HTTP-based and requires Upstash infrastructure.

**Why not `node-redis` (the `redis` npm package):** Both clients work. `ioredis` has superior reconnection logic, cluster support, and is used by BullMQ (the dominant Node.js queue library). If BullMQ is ever added for background jobs, `ioredis` is already the right client. `node-redis` is technically the official Redis client, but `ioredis` has deeper ecosystem adoption in the Next.js/Node.js world and 12.8M weekly downloads vs 8.2M for `redis`.

---

### SQL Injection Prevention

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Drizzle ORM query builder (already in use) | ^0.45.1 | All standard CRUD — parameterized automatically | Drizzle's query builder automatically maps dynamic values to `$1` placeholders and passes them as a separate array to the database driver. No additional library needed for standard queries. |
| Drizzle `sql` template tag (already available) | built-in | Raw SQL with parameterization when query builder is insufficient | `sql\`SELECT * FROM users WHERE id = ${id}\`` is automatically parameterized. Safe for dynamic values. |

**The actual problem:** `sql.raw()` is in use for the DB import route (`src/app/api/v1/import/database/route.ts:212`). `sql.raw()` explicitly bypasses parameterization — user-supplied values are concatenated directly into the query string. This is the SQL injection vector.

**Fix approach (no new library needed):**
1. Replace `sql.raw()` DELETE with `db.delete(table).where(eq(table.tenantId, tenantId))` — use Drizzle query builder.
2. For the INSERT case: parse SQL file values into structured data, reconstruct as parameterized Drizzle inserts. Never execute raw user-supplied SQL strings.
3. String interpolation in DELETE (`route.ts:188`) must be replaced with parameterized `eq()` predicate.

**Confidence:** HIGH — verified against Drizzle ORM official docs (`orm.drizzle.team/docs/sql`).

---

### Testing Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vitest (already in use) | ^4.1.0 | Unit and integration test runner | Already installed, already configured, 19 tests passing. No migration needed. Fast, ESM-native, excellent TypeScript support. Official Next.js recommendation. |
| `@vitest/coverage-v8` (already in use) | ^4.1.0 | Coverage reporting | Already installed. V8 coverage is native Node.js, no instrumentation overhead. |
| MSW (`msw`) | ^2.x | Mock external HTTP calls in tests (AI providers, Firecrawl, SMTP) | AI services make HTTP calls to external providers. MSW intercepts at the network layer — no need to mock every `fetch` call individually. Works with Vitest in Node.js via `server.listen()`. Standard for testing Next.js services that call external APIs. |
| `@testing-library/react` | ^16.x | Test React components | For the few UI components needing security-relevant tests (e.g., email template renderer). Vitest-compatible. |

**Testing strategy for security hardening:**

1. **Auth service unit tests** — mock the `jose` JWT library, test token validation edge cases (expired, tampered, missing tenantId).
2. **API route integration tests** — use Vitest's `vi.mock()` to mock Drizzle db calls. Test that `withPermission()` blocks unauthorized access, that API key bypass is gone after fix, that rate limiting triggers correctly.
3. **Rate limiter unit tests** — mock `ioredis` with `vi.mock()`, test the sliding window logic in isolation.
4. **HTML sanitization tests** — unit test that `isomorphic-dompurify` strips `<script>`, `onerror=`, `javascript:` vectors from markdown renderer output.

**Why not Jest:** Vitest is already installed and configured. Jest migration is unnecessary churn. Vitest 4.x is feature-complete for all required test types.

**Why not Supertest for API routes:** Next.js App Router route handlers are not plain Node `http.IncomingMessage` handlers. Supertest works with Express. For Next.js routes, mock the Drizzle db layer directly in Vitest and test the handler function — simpler and more aligned with how the codebase is already tested (see `src/__tests__/integration/api/`).

---

### CORS Hardening

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js native `headers()` in `next.config.ts` | built-in | Replace wildcard CORS with explicit allowed origins | The current `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` is the existing bug (CONCERNS.md). Fix is to replace with explicit origin list in `next.config.ts`. No library needed — this is configuration, not code. |

**Fix approach:** Replace the wildcard in `next.config.ts:32` with:
```typescript
'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'https://boss.xkmu.de'
```
Remove `Access-Control-Allow-Credentials: true` or scope it only to the known origin.

---

### Supporting Libraries Summary

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `server-only` | ^0.0.1 | Mark modules as server-only, build error if imported client-side | Add to all auth, db, and service modules to prevent accidental client-side import |
| `isomorphic-dompurify` | ^3.6.0 | HTML sanitization | Any `dangerouslySetInnerHTML` call; email template preview renderer |
| `ioredis` | ^5.10.1 | Redis client | Rate limiting migration from in-memory Map |
| `@edge-csrf/nextjs` | ^2.5.x | CSRF token protection | Next.js middleware for all `/api/v1/` mutation routes |
| `msw` | ^2.x | HTTP mock for tests | Test files that exercise AI provider calls, Firecrawl, SMTP |

---

## Installation

```bash
# Security libraries
npm install isomorphic-dompurify ioredis @edge-csrf/nextjs server-only

# Test utilities (dev only)
npm install -D msw @testing-library/react
```

Note: `dompurify` is a peer dependency of `isomorphic-dompurify` and will be installed automatically.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `ioredis` | `redis` (node-redis) | When you explicitly want the official Redis Labs client and don't need BullMQ compatibility |
| `@edge-csrf/nextjs` | Manual double-submit cookie | When you want zero dependencies and understand the CSRF pattern deeply enough to implement correctly |
| `isomorphic-dompurify` | `sanitize-html` | When you need to allow a rich subset of HTML (e.g., email editors) and need fine-grained tag allowlists. DOMPurify is stricter by default |
| Native Next.js `headers()` | `helmet` | When running a custom Express/Node server — not applicable here (Next.js App Router, standalone output) |
| Vitest (existing) | Jest | Only if migrating to a non-Vite build system; not applicable |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@next-safe/middleware` | Last published 4 years ago, unmaintained. v0.10.0 is the final version. Next.js 16 has native CSP support. | Native `next.config.ts` `headers()` + `middleware.ts` nonce generation |
| `helmet` | Designed for Express custom servers. Does not integrate with Next.js App Router's response pipeline. Using it requires a custom server, which Next.js explicitly discourages and breaks standalone Docker output. | Native `next.config.ts` `headers()` |
| `next-secure-headers` | Adds a dependency for functionality that is fully available in Next.js natively. Last updated infrequently. | Native `next.config.ts` `headers()` |
| `@upstash/ratelimit` | Requires Upstash managed Redis SaaS. Violates project constraint of Docker-only deployment. | `ioredis` with `INCR/EXPIRE` against the existing Docker Redis instance |
| `dompurify` (alone, without isomorphic wrapper) | Requires browser DOM. Will throw `ReferenceError: window is not defined` in Next.js server components and API routes. | `isomorphic-dompurify` |
| `sql.raw()` with user input | Bypasses Drizzle parameterization entirely. Direct SQL injection vector. Already confirmed in CONCERNS.md. | Drizzle query builder methods or `sql` template tag (not `sql.raw()`) |
| `csrf` / `csurf` (Express libraries) | Built for Express/Connect middleware chain. Not compatible with Next.js App Router's edge runtime or route handler pattern. | `@edge-csrf/nextjs` |

---

## Stack Patterns by Context

**For security headers (no user session context needed):**
- Use `next.config.ts` `async headers()` for static headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS)
- Use `middleware.ts` for CSP nonce injection on page routes

**For CSP with third-party scripts (Tailwind CDN, any analytics):**
- Use nonce-based CSP in `middleware.ts`
- Avoid `unsafe-inline` — it neutralizes CSP against XSS

**For rate limiting:**
- One shared `ioredis` client instance (singleton pattern, reuse existing Redis connection from Docker Compose)
- Sliding window: `INCR` + conditional `EXPIRE` on first hit
- Key format: `rate:{ip|userId|apiKey}:{endpoint}:{windowBucket}`

**For HTML sanitization:**
- Server-side: `isomorphic-dompurify` in route handlers and server components
- Client-side: `isomorphic-dompurify` in React components using `dangerouslySetInnerHTML`
- Always sanitize before storing to DB AND before rendering from DB (defense in depth)

**For CSRF:**
- Server Actions: No extra library — Next.js 16 has built-in Origin/Host check
- REST API routes (`/api/v1/*`): `@edge-csrf/nextjs` middleware
- Exclude: GET routes, public endpoints, webhook endpoints that use HMAC signature verification instead

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `isomorphic-dompurify@3.6.0` | Node.js 20, Next.js 16 | If `ERR_REQUIRE_ESM` appears, add `"overrides": {"jsdom": "25.0.1"}` to `package.json` |
| `ioredis@5.10.1` | Node.js 20, TypeScript 5.9 | Full TypeScript types included. No `@types/ioredis` needed. |
| `@edge-csrf/nextjs@2.5.x` | Next.js 16 App Router, edge runtime | The `2.5.3-cloudflare-rc1` is the latest. Stable enough for production; the `rc` suffix refers to Cloudflare Pages compatibility testing, not general stability. |
| `msw@2.x` | Vitest 4.x, Node.js 20 | MSW v2 uses `fetch`-based interceptors. Requires `setupFilesAfterEach` server configuration in `vitest.config.ts`. |

---

## Sources

- Next.js 16.2.1 official docs — Content Security Policy guide (`nextjs.org/docs/app/guides/content-security-policy`, updated 2026-03-25) — HIGH confidence
- Next.js 16.2.1 official docs — Data Security guide (`nextjs.org/docs/app/guides/data-security`, updated 2026-03-25) — HIGH confidence — covers Server Actions CSRF protection
- Drizzle ORM official docs — `sql` operator (`orm.drizzle.team/docs/sql`) — HIGH confidence — confirms `sql.raw()` skips parameterization
- npm/WebSearch — `isomorphic-dompurify@3.6.0` — MEDIUM confidence (npm registry search results)
- npm/WebSearch — `ioredis@5.10.1` — HIGH confidence (multiple sources agree on version and maintenance status)
- npm/WebSearch — `@edge-csrf/nextjs@2.5.3` — MEDIUM confidence (npm search result, last published ~1 year ago)
- WebSearch — `@next-safe/middleware` deprecation — HIGH confidence (multiple sources confirm v0.10.0 is 4 years old, unmaintained)

---

*Stack research for: Next.js Multi-Tenant Security Hardening*
*Researched: 2026-03-30*
