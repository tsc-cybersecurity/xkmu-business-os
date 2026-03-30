# Architecture Research

**Domain:** Next.js App Router Multi-Tenant SaaS — Security Hardening
**Researched:** 2026-03-30
**Confidence:** HIGH (based on current codebase analysis + official Next.js docs)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Browser / External Client                     │
└───────────────────────────────┬──────────────────────────────────┘
                                │ HTTPS
┌───────────────────────────────▼──────────────────────────────────┐
│              Next.js Runtime (Docker, Node.js)                    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  middleware.ts  (Edge-compatible, runs before every route)   │ │
│  │  - Strip x-middleware-subrequest (CVE-2025-29927 defense)    │ │
│  │  - Block /intern/* if no session cookie present              │ │
│  │  - Attach CORS headers (replace next.config.ts wildcard)     │ │
│  │  - Attach security headers (CSP, X-Frame-Options, etc.)      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│  ┌───────────────────────▼─────────────────────────────────────┐ │
│  │                     API Layer  /api/v1/                      │ │
│  │  route.ts  ──►  withPermission(req, module, action, handler) │ │
│  │                     ┌──────────────────┐                     │ │
│  │                     │  getAuthContext() │  (SINGLE copy)     │ │
│  │                     │  - Session cookie │                     │ │
│  │                     │  - API Key header │                     │ │
│  │                     └──────────────────┘                     │ │
│  │                     ┌──────────────────┐                     │ │
│  │                     │  Permission check│                     │ │
│  │                     │  - RBAC roles    │                     │ │
│  │                     │  - API key scopes│  (NEW: per module)  │ │
│  │                     └──────────────────┘                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│  ┌───────────────────────▼─────────────────────────────────────┐ │
│  │                   Service Layer                              │ │
│  │  XxxService.method(tenantId, ...)                           │ │
│  │  - Always scoped to tenantId (row-level isolation)          │ │
│  │  - No auth logic here — pure business logic                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│  ┌───────────────────────▼─────────────────────────────────────┐ │
│  │               Database Layer  (PostgreSQL via Drizzle)       │ │
│  │  - tenantId on every query (enforced in service layer)      │ │
│  │  - Parameterized queries only (no sql.raw() with user input) │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Rate Limiting (Redis)                       │ │
│  │  Redis INCR/EXPIRE  ←  middleware.ts or withPermission()    │ │
│  │  (replaces in-memory Map — works across container restarts)  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current State | Target State |
|-----------|----------------|---------------|--------------|
| `middleware.ts` | Pre-route security: header stripping, CORS, fast auth rejection, security headers | MISSING | Add at project root |
| `getAuthContext()` | Single function: session cookie or API key → AuthContext | 15 copies (1 canonical + 14 duplicates) | 1 copy in `src/lib/auth/auth-context.ts` |
| `withPermission()` | Module+action guard for all API routes | Bypasses API keys entirely | Enforce API key scopes against module+action |
| API key scopes | Granular `read`/`write` per module or action | Coarse-grained blob in `permissions` JSON | Module-scoped: `leads:read`, `companies:write` |
| Rate limiter | Per-IP/per-key request throttling | In-memory `Map` (single process only) | Redis INCR/EXPIRE (process-agnostic) |
| Security headers | CSP, X-Frame-Options, HSTS, etc. | Not configured | `middleware.ts` response headers OR `next.config.ts` |
| HTML sanitizer | XSS prevention for `dangerouslySetInnerHTML` | Not present | `isomorphic-dompurify` at all render sites |
| CORS policy | Origin restriction for API routes | Wildcard `*` with credentials | Explicit allow-list per route group |
| Seed credentials | Default admin fallback values | Hardcoded strings in source | Require env vars, no fallback |

## Recommended Project Structure (Security Layer)

```
src/
├── middleware.ts               # NEW — root middleware (security + auth fast-path)
├── lib/
│   ├── auth/
│   │   ├── auth-context.ts     # EXISTING — single getAuthContext() (canonical)
│   │   ├── api-key.ts          # EXISTING — extend with module-scoped permission check
│   │   ├── require-permission.ts # EXISTING — remove 'api' bypass, check key scopes
│   │   ├── session.ts          # EXISTING — unchanged
│   │   └── permissions.ts      # EXISTING — unchanged
│   └── utils/
│       ├── rate-limit.ts       # EXISTING — rewrite to Redis INCR/EXPIRE
│       └── sanitize.ts         # NEW — isomorphic-dompurify wrapper
├── app/
│   └── api/v1/                 # 14 routes — migrate to shared getAuthContext()
│       └── ...route.ts
└── lib/db/
    └── seed-check.ts           # EXISTING — remove hardcoded credential fallbacks
```

### Structure Rationale

- **`middleware.ts` at root:** Next.js App Router requires `middleware.ts` at project root (not in `src/`). It runs before route handlers and server components for all matched paths. Use `matcher` config to scope to `/api/:path*` and `/intern/:path*`.
- **`src/lib/auth/` remains auth home:** All auth utilities stay here. The middleware imports from this layer but does not duplicate logic.
- **`src/lib/utils/sanitize.ts`:** Centralizes the DOMPurify setup (server-side `isomorphic-dompurify`, client-side `dompurify`). Components import this, not DOMPurify directly.
- **Rate limiter stays in `src/lib/utils/`:** Called from `withPermission()` or specific sensitive handlers, not from middleware (middleware must be edge-compatible; Redis ioredis is Node.js runtime only).

## Architectural Patterns

### Pattern 1: Defense in Depth (Two-Layer Auth)

**What:** Middleware provides fast rejection at the edge (no session cookie = redirect). Route handlers perform full auth+permission check before touching any data.

**When to use:** Always — middleware is not sufficient alone (CVE-2025-29927 proved middleware can be bypassed; patched in Next.js 15.2.3+, current project is on 16.1.6 so is safe, but defense-in-depth remains correct regardless).

**Trade-offs:** Adds one extra auth check per request (minimal overhead — session is already cached by Next.js cookie store). The redundancy is the point.

**Example:**
```typescript
// middleware.ts — fast path: reject if no cookie at all
export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('xkmu_session')
  if (!sessionCookie && request.nextUrl.pathname.startsWith('/intern')) {
    return NextResponse.redirect(new URL('/intern/login', request.url))
  }
  // Add security headers to all responses
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // ... other headers
  return response
}

// route.ts — full auth+permission check (still required even after middleware)
export async function GET(request: NextRequest) {
  return withPermission(request, 'leads', 'read', async (auth) => {
    // auth.tenantId is now safe to use
  })
}
```

### Pattern 2: API Key Module Scoping

**What:** API key permissions are a JSON array (currently `['read', 'write']`). Extend to module-scoped scopes and check them in `withPermission()` the same way RBAC is checked.

**When to use:** Applies whenever `auth.role === 'api'` — currently this bypasses all permission checks, which is the vulnerability.

**Trade-offs:** Requires a DB migration (add scope format to `permissions` column) and a UI change in the API key creation form. Existing keys with `['read', 'write']` need a migration strategy (treat as full-access legacy, or require re-creation).

**Example:**
```typescript
// In withPermission() — replace the 'api' bypass with scope check
if (auth.role === 'api') {
  // Check if api key permissions include this module+action
  // Scope format: 'leads:read', 'leads:write', '*:read', '*:*'
  const allowed = apiKeyScopeAllows(auth.keyPermissions, module, action)
  if (!allowed) return apiForbidden('API-Schluessel hat keine Berechtigung fuer diese Aktion')
  return handler(auth)
}

// AuthContext needs keyPermissions field added:
export interface AuthContext {
  tenantId: string
  userId: string | null
  role: string
  roleId: string | null
  keyPermissions: string[] | null  // NEW — only set when role === 'api'
}
```

### Pattern 3: Centralized Auth via Single `getAuthContext()`

**What:** Remove all 14 inline `getAuthContext` copies. Every API route uses `withPermission()` which calls the shared `getAuthContext()` from `src/lib/auth/auth-context.ts`.

**When to use:** For all 14 identified routes with local copies. The 3 routes with special admin-only requirements (`import/database`, `export/database`, `ai-prompt-templates/seed`) should use `withPermission(req, 'database', 'read', ...)` instead of rolling their own admin check.

**Trade-offs:** Mechanical refactor with low risk per file but 14 files to touch. Each route must be tested after migration to confirm auth behavior is preserved.

**Example:**
```typescript
// BEFORE (local copy in import/database/route.ts)
async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    const isAdmin = session.user.role === 'owner' || session.user.role === 'admin'
    if (!isAdmin) return { error: 'forbidden' as const }
    return { tenantId: session.user.tenantId }
  }
  // ... duplicated API key logic
}

// AFTER (uses withPermission + shared auth)
export async function POST(request: NextRequest) {
  return withPermission(request, 'database', 'create', async (auth) => {
    // auth is AuthContext — tenantId, role, etc. already verified
    // 'database' module is restricted to owner/admin in DEFAULT_ROLE_PERMISSIONS
  })
}
```

### Pattern 4: Redis Rate Limiting (INCR/EXPIRE)

**What:** Replace the in-memory `Map` in `rate-limit.ts` with a Redis-backed counter. Use `INCR` + `EXPIRE` inside a Lua script for atomicity. Key by `${prefix}:${ip}` or `${prefix}:apikey:${keyId}`.

**When to use:** For auth endpoints (login, register), AI-generation endpoints, and any endpoint exposed to API key access. Must run in Node.js runtime (not Edge runtime) since ioredis requires Node.

**Trade-offs:** Redis is already in docker-compose (`REDIS_URL` is configured). The only cost is connecting ioredis. The Lua script approach avoids TOCTOU race conditions between INCR and EXPIRE.

**Example:**
```typescript
// src/lib/utils/rate-limit.ts — Redis version
import { createClient } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

const RATE_LIMIT_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[2])
  end
  return current
`

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds = 60
): Promise<boolean> {
  const count = await redis.eval(
    RATE_LIMIT_SCRIPT, 1,
    key,               // KEYS[1]
    maxRequests,       // ARGV[1] (unused in script but passed for clarity)
    windowSeconds      // ARGV[2]
  ) as number
  return count <= maxRequests
}
```

### Pattern 5: Security Headers in `next.config.ts`

**What:** Add all security headers via the `headers()` function in `next.config.ts`. This is simpler than middleware for static header addition and does not add runtime cost.

**When to use:** For headers that never change per-request (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). For CSP with nonces (per-request), use middleware instead.

**Trade-offs:** `next.config.ts` headers are applied before middleware. For a nonce-based CSP (needed if any inline scripts exist), the nonce must be generated in middleware and attached to the response header. Given this app has inline scripts from AI providers and markdown rendering, start with a strict CSP without nonces and add `'unsafe-inline'` only where provably needed.

**Example:**
```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",  // tighten later with nonces
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "connect-src 'self' https:",
            "frame-ancestors 'none'",
          ].join('; ')
        },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        // Replace wildcard CORS with explicit origin
        { key: 'Access-Control-Allow-Origin', value: 'https://boss.xkmu.de' },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Api-Key' },
      ],
    },
  ]
}
```

## Data Flow

### Hardened Request Flow (Target State)

```
[Browser or External Client]
         │
         ▼ HTTPS request to /api/v1/leads  or  /intern/leads
[middleware.ts]
  - Strip x-middleware-subrequest header (defense-in-depth)
  - /intern/* — check for session cookie; redirect to login if absent
  - All routes — attach security headers (X-Frame-Options, CSP, etc.)
  - /api/* — CORS origin check (replace wildcard)
         │
         ▼ Request continues to route handler
[route.ts: withPermission(req, 'leads', 'read', handler)]
  - getAuthContext(req) — session cookie OR X-Api-Key header
  - If session: decode JWT, verify signature, check expiry
  - If API key: prefix lookup → bcrypt verify → return {tenantId, keyPermissions}
  - RBAC check (roleId → role_permissions table)
  - API key scope check (keyPermissions includes 'leads:read' or '*:*')
         │
         ▼ Auth passed
[Redis rate limiter] — check per-IP or per-keyId counter
         │
         ▼ Not rate-limited
[LeadService.list(auth.tenantId, filters)]
  - All queries include WHERE tenant_id = $tenantId
  - Parameterized queries only
         │
         ▼
[PostgreSQL] → rows → [apiSuccess(data)]
         │
         ▼
[Browser receives JSON response]
```

### Auth Context Data Flow

```
Request headers/cookies
         │
         ├── Cookie: xkmu_session=<JWT>
         │         └── jwtVerify() → Session payload
         │                └── { tenantId, userId, role, roleId }
         │
         └── X-Api-Key: xkmu_<hash>
                   └── prefix lookup → bcrypt compare
                              └── { tenantId, keyId, keyPermissions[] }

Both paths produce → AuthContext { tenantId, userId, role, roleId, keyPermissions }
AuthContext flows → withPermission() → handler() → Service.method(tenantId)
tenantId NEVER comes from client body/query params
```

### Component Communication Map

| From | To | How | Auth Required |
|------|----|-----|---------------|
| middleware.ts | Route handlers | NextResponse.next() with modified headers | No (runs before auth) |
| route.ts | `withPermission()` | Direct function call | Provides request, expects AuthContext |
| `withPermission()` | `getAuthContext()` | Direct function call | Produces AuthContext or null |
| `withPermission()` | `hasPermission()` (RBAC) | Direct function call | Needs roleId |
| `withPermission()` | `apiKeyScopeAllows()` | Direct function call (NEW) | Needs keyPermissions |
| `withPermission()` | Redis rate limiter | Async function call | Needs IP or keyId |
| Route handler | Service layer | Direct function call | Passes tenantId from AuthContext |
| Service layer | Drizzle ORM | Method calls | Always includes tenantId filter |
| Drizzle ORM | PostgreSQL | TCP connection pool | DB credentials from env |
| Client components | API routes | `fetch('/api/v1/...')` | Cookie sent automatically |
| External systems | API routes | `fetch()` with X-Api-Key header | API key in header |

## Suggested Build Order

The dependencies between security components determine the correct implementation sequence:

1. **`getAuthContext()` consolidation first** — Everything downstream depends on having a single, correct auth function. 14 route migrations become mechanical once this is confirmed correct. No DB changes required.

2. **`withPermission()` API key scope enforcement second** — Depends on `getAuthContext()` returning `keyPermissions`. Requires a DB migration to update the `api_keys.permissions` schema and a data migration for existing keys.

3. **Security headers + CORS fix third** — Pure config change in `next.config.ts`. No code dependencies. Can be done in parallel with step 1-2 but easier to reason about separately.

4. **`middleware.ts` fourth** — Depends on security headers being understood (avoid duplicating what `next.config.ts` already sets). Adds the fast-path auth rejection and the `x-middleware-subrequest` header stripping.

5. **Redis rate limiter fifth** — Depends on having Redis `REDIS_URL` env confirmed and ioredis installed. The interface matches the current `rateLimit()` function so call sites don't change.

6. **HTML sanitizer sixth** — Independent of auth changes. Install `isomorphic-dompurify`, create `src/lib/utils/sanitize.ts`, then update each `dangerouslySetInnerHTML` call site.

7. **SQL injection fix seventh** — Independent. Fix the `import/database` route to use parameterized queries for the DELETE and to re-construct parameterized INSERTs rather than executing raw strings.

8. **Seed credential hardening last** — Simple removal of fallback strings. Low risk, independent.

## Anti-Patterns

### Anti-Pattern 1: Middleware-Only Auth

**What people do:** Put all auth logic in `middleware.ts` and assume it is the security boundary.

**Why it's wrong:** CVE-2025-29927 (March 2025) demonstrated that the `x-middleware-subrequest` header could bypass middleware entirely. Even though Next.js 16.1.6 is patched, future vulnerabilities in the same area are possible. Also, middleware runs in the Edge runtime which cannot access the database directly — it can only do lightweight checks.

**Do this instead:** Middleware for fast rejection + security headers. `withPermission()` in every API route for full auth. Both layers must independently enforce auth.

### Anti-Pattern 2: Wildcard CORS with Credentials

**What people do:** Set `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true` together.

**Why it's wrong:** Browsers refuse to honor `Allow-Credentials: true` with a wildcard origin — it is explicitly forbidden by the CORS spec. This configuration signals incorrect intent and exposes API key-based auth (which does not use cookies) to cross-origin requests from any domain.

**Do this instead:** Set `Access-Control-Allow-Origin` to the explicit allowed origin (`https://boss.xkmu.de`). If the API needs to be accessible from additional origins (e.g., n8n workflows), maintain an explicit list and check the `Origin` header in middleware.

### Anti-Pattern 3: Role 'api' Bypasses All Permissions

**What people do:** Short-circuit permission checks for API keys because they represent "trusted integrations."

**Why it's wrong:** A leaked API key becomes a full-access credential for all 38 modules. Principle of least privilege requires that an API key created for reading leads cannot also delete users or export the entire database.

**Do this instead:** API key scopes checked against the same `(module, action)` parameters that RBAC uses. The `permissions` JSON column already exists on `api_keys` — extend the scope format to `module:action` strings.

### Anti-Pattern 4: 14 Copies of `getAuthContext`

**What people do:** Copy-paste auth logic into each route because it is "slightly different" for some routes.

**Why it's wrong:** Security bugs must be fixed in 14 places. The copies have already diverged — some check for admin role, some do not. A fix to the canonical function will not propagate to the copies.

**Do this instead:** Special per-route requirements (e.g., admin-only) belong in the `withPermission()` call with the appropriate `module`+`action` that is restricted to owner/admin in `DEFAULT_ROLE_PERMISSIONS`. The auth plumbing stays shared.

### Anti-Pattern 5: In-Memory Rate Limiting in Containerized Apps

**What people do:** Use a module-level `Map` as a rate limit store because it is simple and has zero dependencies.

**Why it's wrong:** Each Docker container restart clears the store. If two containers run simultaneously (future horizontal scaling), each has its own store — attackers bypass limits by hitting different containers.

**Do this instead:** Redis INCR/EXPIRE with a Lua script for atomicity. Redis is already in the compose file and is the correct data store for this pattern.

## Integration Points

### External Services

| Service | Integration Pattern | Security Notes |
|---------|---------------------|----------------|
| PostgreSQL | Drizzle ORM, connection pool via `postgres` driver | Always parameterized queries; `tenantId` on every WHERE |
| Redis | ioredis, Node.js runtime only (not Edge) | Used for rate limiting; key format `ratelimit:{prefix}:{ip}` |
| AI providers (6+) | HTTP calls from service layer | API keys in env vars; errors must not be silently swallowed |
| Firecrawl | HTTP calls from `firecrawl.service.ts` | External content returned must be sanitized before rendering |
| n8n | Webhook calls in/out; n8n may call `/api/v1/*` with API key | API key scope should be restricted to needed modules |
| SMTP (nodemailer) | Called from `email.service.ts` | Credentials from env vars; no hardcoded fallback |

### Internal Security Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| middleware.ts → API routes | Headers on NextResponse | Middleware cannot return data from DB; lightweight only |
| API routes → Service layer | Function calls | Service never receives `request` object; only typed params |
| Service layer → Database | Drizzle queries | `tenantId` is the isolation boundary; must be in every query |
| Route handlers → Rate limiter | Async function call | Rate limiter returns `boolean`; caller decides response |
| `withPermission()` → `getAuthContext()` | Function call | `getAuthContext()` is the single truth for "who is this" |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (1 container, ~10 tenants) | Current architecture adequate after hardening; Redis already present |
| 10-100 tenants | Redis rate limiting critical (in-memory breaks with restarts); no schema changes needed |
| 100-1000 tenants | Connection pool tuning; consider read replicas; rate limit by tenantId, not just IP |
| 1000+ tenants | Row-level security at DB level (PostgreSQL RLS) as backup to application-level tenantId; session store in Redis for revocation |

### Scaling Priorities

1. **First bottleneck:** In-memory rate limiter — fails on restart and across replicas. Fix with Redis (this milestone).
2. **Second bottleneck:** N+1 queries in service layer — each loop iteration adds a DB round-trip. Fix with batch inserts and `Promise.all()` (this milestone, lower priority than security).
3. **Third bottleneck (future):** Single PostgreSQL instance. Mitigated with connection pooling; read replicas when needed.

## Sources

- [Next.js Middleware Authorization Bypass CVE-2025-29927 — Vercel Postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) — MEDIUM confidence (official Vercel source)
- [CVE-2025-29927 Technical Analysis — ProjectDiscovery](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) — MEDIUM confidence
- [Next.js App Router Authentication Guide 2026 — WorkOS](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) — MEDIUM confidence
- [Next.js Content Security Policy Guide](https://nextjs.org/docs/app/guides/content-security-policy) — HIGH confidence (official docs)
- [Redis Rate Limiting — redis.io tutorials](https://redis.io/tutorials/howtos/ratelimiting/) — HIGH confidence (official Redis docs)
- [ioredis with Next.js 16 Node.js runtime — GitHub Discussion](https://github.com/vercel/next.js/discussions/91716) — MEDIUM confidence (community, current version confirmed)
- Current codebase analysis (`src/lib/auth/`, `next.config.ts`, `src/lib/utils/rate-limit.ts`) — HIGH confidence (direct source inspection)

---
*Architecture research for: Next.js Multi-Tenant Security Hardening*
*Researched: 2026-03-30*
