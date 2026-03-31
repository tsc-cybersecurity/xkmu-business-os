# Phase 3: XSS & API Protection - Research

**Researched:** 2026-03-30
**Domain:** HTML Sanitization, CSRF Protection, API-Key Scoping (Next.js 16 / multi-tenant)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R1.4 | HTML Sanitizer — `isomorphic-dompurify` for Markdown-Renderer, Email-Templates, CMS-Output. All `dangerouslySetInnerHTML` calls must sanitize input. SSR-compatible. | Codebase audit complete: 4 `dangerouslySetInnerHTML` call sites found; 3 need sanitization, 1 is safe JSON-LD. `isomorphic-dompurify` confirmed as correct package. |
| R2.4 | CSRF-Schutz — `@edge-csrf/nextjs` in `proxy.ts`. All mutating REST routes (POST/PUT/DELETE) protected. API-Key requests excluded (Machine-to-Machine). CSRF token available in frontend. | `proxy.ts` structure fully read. API key bypass pattern confirmed in code. Integration approach documented with code examples. |
| R2.3 | API-Key Scoping — Schema migration (`permissions` column to `module:action` format), `scope:'*'` for existing keys, Admin-UI, `withPermission()` enforcement. Migration order: Schema → UI → Enforcement. | Schema column already exists as `jsonb permissions`. Current format is `['read','write']` — needs migration to `module:action` format. Admin UI exists but lacks scope selector. `withPermission()` bypass at line 25–27 confirmed. |
</phase_requirements>

---

## Summary

Phase 3 closes three related attack surfaces: stored XSS via unsanitized HTML output, CSRF attacks against REST mutation endpoints, and over-privileged API keys that bypass all permission checks.

The HTML sanitization work is purely additive: create a thin `sanitize.ts` wrapper around `isomorphic-dompurify`, then update 3 `dangerouslySetInnerHTML` call sites. The fourth site (`layout.tsx:76`, JSON-LD structured data) renders developer-controlled JSON serialized by `JSON.stringify` and does not need sanitization. The markdown parser already calls `escapeHtml()` on text content but produces raw HTML that could contain XSS vectors if edge cases in the custom parser are triggered; the sanitizer layer is defense-in-depth on top of that.

The CSRF work integrates `@edge-csrf/nextjs` into the existing `proxy.ts` file (the project's Next.js middleware). The proxy already handles CORS, session verification, and API-key pass-through — CSRF middleware slots in after the API-key check. API-key requests (`X-Api-Key` header present) must be excluded because M2M callers cannot participate in the double-submit cookie pattern.

The API-key scoping work has a critical migration risk: the `api_keys` table already has a `permissions` `jsonb` column seeded with `['read','write']` for every key. The current `withPermission()` bypasses all scope checks at lines 25–27 for `role === 'api'`. The migration must change the column semantics to `module:action` pairs, migrate all existing rows to `['*']` (backward compatibility), add scope validation UI, and only then activate enforcement in `withPermission()`. Enforcement before migration = complete API breakage for all existing integrations.

**Primary recommendation:** Execute all three plans in the order listed (03-01 HTML Sanitizer, 03-02 API-Key Scoping, 03-03 CSRF) to match increasing risk. HTML sanitization is lowest risk and fully additive. API-key scoping is medium risk (migration order is critical). CSRF is highest coordination risk (requires frontend token injection).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `isomorphic-dompurify` | 3.7.1 | Sanitize HTML on both Node.js (SSR) and browser before `dangerouslySetInnerHTML` | Only production-tested DOMPurify wrapper that works in Next.js server components and route handlers without browser DOM. 2M+ weekly downloads. |
| `@edge-csrf/nextjs` | 2.5.3-cloudflare-rc1 | CSRF token (signed double-submit cookie) for REST API routes in Next.js middleware | Specifically designed for Next.js middleware/edge runtime. The `rc` suffix refers to Cloudflare Pages compatibility, not general stability. Only maintained CSRF library for Next.js edge. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dompurify` | (auto-installed peer dep) | Underlying DOMPurify engine | Installed automatically with `isomorphic-dompurify` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `isomorphic-dompurify` | `sanitize-html` | `sanitize-html` allows richer HTML subset but requires more config to be safe; worse XSS coverage than DOMPurify |
| `@edge-csrf/nextjs` | Manual double-submit cookie | Zero dependencies but requires deep understanding of the pattern; error-prone |
| `@edge-csrf/nextjs` | `csrf-csrf` | `csrf-csrf` targets Express/Node HTTP, needs shimming for Next.js App Router edge runtime |

**Installation:**
```bash
npm install isomorphic-dompurify @edge-csrf/nextjs
npm install --save-dev @types/dompurify
```

**Known issue with `isomorphic-dompurify` v3.x:** Uses jsdom v28+ which can trigger `ERR_REQUIRE_ESM` in CommonJS environments. Workaround if it occurs: add to `package.json`:
```json
"overrides": { "jsdom": "25.0.1" }
```
This was a v3.5 issue; v3.7.1 (current) upgraded to jsdom v29 to address performance, but the ERR_REQUIRE_ESM risk remains in edge cases.

---

## Architecture Patterns

### Recommended File Structure for Phase 3

```
src/
├── lib/
│   └── utils/
│       └── sanitize.ts           # NEW: isomorphic-dompurify wrapper
├── app/
│   └── _components/
│       └── markdown-renderer.tsx # MODIFY: import sanitize
├── app/
│   └── intern/(dashboard)/settings/
│       └── email-templates/page.tsx  # MODIFY: line 238
├── proxy.ts                      # MODIFY: add @edge-csrf/nextjs
└── lib/
    ├── db/
    │   └── schema.ts             # MODIFY: permissions column type comment
    ├── services/
    │   └── api-key.service.ts    # MODIFY: add updatePermissions method
    └── auth/
        └── require-permission.ts # MODIFY: add scope check for role === 'api'
drizzle/
└── migrations/
    └── 0031_api_key_scoping.sql  # NEW: migrate permissions to module:action format
```

### Pattern 1: HTML Sanitizer Wrapper

Create a single `src/lib/utils/sanitize.ts` module. All `dangerouslySetInnerHTML` calls import from this one location. This ensures configuration is centralized (ALLOWED_TAGS, ALLOWED_ATTR) and future changes apply everywhere.

```typescript
// src/lib/utils/sanitize.ts
// Source: isomorphic-dompurify official README + STACK.md research
import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML string for safe use in dangerouslySetInnerHTML.
 * Runs on both server (Node.js/jsdom) and browser (native DOM).
 * Strips all script tags, event handlers, javascript: URIs.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Allow the HTML elements produced by renderMarkdown()
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'a', 'img', 'hr', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel', 'loading'],
    // Force target="_blank" links to have noopener
    ADD_ATTR: ['target'],
    FORCE_BODY: false,
  })
}

/**
 * Sanitize HTML for email body preview.
 * More permissive than markdown — allows table, thead, tbody, td, th.
 */
export function sanitizeEmailHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'h1', 'h2', 'h3', 'h4', 'a', 'ul', 'ol', 'li', 'hr', 'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'width', 'height',
                   'bgcolor', 'align', 'target', 'rel', 'loading'],
  })
}
```

### Pattern 2: dangerouslySetInnerHTML Call Sites — Exact Inventory

**4 call sites exist in the codebase. 3 need sanitization. 1 is safe.**

| File | Line | Current Code | Action |
|------|------|-------------|--------|
| `src/app/_components/markdown-renderer.tsx` | 14 | `{ __html: html }` where `html = renderMarkdown(content)` | Wrap: `{ __html: sanitizeHtml(html) }` |
| `src/app/_components/markdown-renderer.tsx` | 37 | `InlineMarkdown` — hand-rolled HTML from text + regex | Wrap: `{ __html: sanitizeHtml(html) }` |
| `src/app/intern/(dashboard)/settings/email-templates/page.tsx` | 238 | `{ __html: previewDialog?.bodyHtml \|\| '' }` — raw DB content | Wrap: `{ __html: sanitizeEmailHtml(previewDialog?.bodyHtml \|\| '') }` |
| `src/app/layout.tsx` | 76 | `{ __html: JSON.stringify(jsonLd) }` — structured data schema | **SKIP** — `JSON.stringify` output cannot execute JS; no user input; DOMPurify would corrupt JSON-LD |

**Important note about `InlineMarkdown`:** The inline renderer (line 37) already calls `escapeHtml()` at the start and then applies regex transforms. The DOMPurify pass is defense-in-depth for any regex edge case. The existing `escapeHtml()` call should stay in place — sanitize on top, do not replace.

### Pattern 3: CSRF Integration in proxy.ts

`@edge-csrf/nextjs` provides a `createCsrfMiddleware` factory. It must wrap the existing `proxy` function logic, not replace it.

The integration pattern (based on `@edge-csrf/nextjs` v2 official README):

```typescript
// src/proxy.ts (modified)
import { createCsrfMiddleware } from '@edge-csrf/nextjs'

const csrfMiddleware = createCsrfMiddleware({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    name: 'csrf_token',
    sameSite: 'lax',
  },
})

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ... existing CVE-2025-29927 defense (requestHeaders.delete) ...
  // ... existing redirects ...
  // ... existing public path check ...

  // API-Key requests: skip CSRF (Machine-to-Machine, no session cookie)
  if (pathname.startsWith('/api/v1/')) {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      return NextResponse.next()  // existing behavior preserved
    }
  }

  // Apply CSRF protection to all session-based mutation routes
  // createCsrfMiddleware returns a NextResponse (403 if token invalid)
  // or null/undefined (pass through) if valid/GET
  const csrfResponse = await csrfMiddleware(request)
  if (csrfResponse) {
    return csrfResponse  // 403 on CSRF failure
  }

  // ... rest of existing proxy logic (session check, CORS headers) ...
}
```

**Critical:** The API-key early-return MUST come before the CSRF check. The order in the current `proxy.ts` already has the API-key check before session validation — CSRF middleware slots in between.

**Frontend CSRF token access:** `@edge-csrf/nextjs` sets the token in a cookie. The frontend reads it via `document.cookie` or a helper. Standard pattern:

```typescript
// Utility: src/lib/utils/csrf.ts
export function getCsrfToken(): string {
  const match = document.cookie.match(/csrf_token=([^;]+)/)
  return match ? match[1] : ''
}

// Usage in fetch calls:
const response = await fetch('/api/v1/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken(),
  },
  body: JSON.stringify(data),
})
```

The header name `X-CSRF-Token` is already listed in `Access-Control-Allow-Headers` in `proxy.ts:89` — no CORS change needed.

### Pattern 4: API-Key Scoping — The Only Safe Migration Order

**Step 1: Schema Migration (Drizzle)**

The `api_keys.permissions` column currently stores `['read', 'write']` (JSONB array of strings). The new format is `['module:action', 'module:action']` with `['*']` meaning full access.

Drizzle migration SQL:
```sql
-- drizzle/migrations/0031_api_key_scoping.sql
-- Migrate existing permissions from ['read','write'] to ['*'] (full access backward compat)
UPDATE api_keys
SET permissions = '["*"]'::jsonb
WHERE permissions IS NULL
   OR permissions = '["read","write"]'::jsonb
   OR permissions = '["read"]'::jsonb
   OR permissions = '["write"]'::jsonb;

-- For any other legacy format, also default to full access
UPDATE api_keys
SET permissions = '["*"]'::jsonb
WHERE NOT (permissions @> '"*"'::jsonb)
  AND NOT (permissions::text LIKE '%:%');
```

The Drizzle schema definition does not need to change — `jsonb('permissions')` stays. The TypeScript type does change: add a comment documenting the new expected format.

**Step 2: Admin UI Changes**

The existing `api-keys/page.tsx` displays permissions as badges but has no way to set them. The create dialog only accepts `name`. The `createApiKeySchema` in `api-keys/route.ts` already accepts `permissions?: z.array(z.string()).optional()`.

Add to the create dialog: a multi-select or checkbox group for scope selection. Available scopes should come from the `Module` + `Action` types already defined at `src/lib/types/permissions.ts`.

Also add an "Edit scopes" action on existing keys (new PATCH endpoint or use PUT on the `[id]` route).

**Step 3: withPermission() Enforcement**

Only after Step 1 (all existing keys have `['*']`) and Step 2 (UI allows scope management) should enforcement be added:

```typescript
// src/lib/auth/require-permission.ts
// Current lines 24-27 (the bypass):
if (auth.role === 'api') {
  return handler(auth)  // <-- THIS IS THE BYPASS
}

// Replace with:
if (auth.role === 'api') {
  const scopes = auth.apiKeyPermissions as string[] | undefined ?? ['*']
  const hasWildcard = scopes.includes('*')
  const hasSpecific = scopes.includes(`${module}:${action}`)
  if (!hasWildcard && !hasSpecific) {
    return apiForbidden(`API-Key hat keine Berechtigung für ${module}:${action}`)
  }
  return handler(auth)
}
```

**For this to work:** `AuthContext` must include `apiKeyPermissions`. Check `src/lib/auth/auth-context.ts` to verify the API key's `permissions` column is loaded and available in the auth context when `role === 'api'`. If it is not currently included, it must be added when reading the API key from the DB.

### Anti-Patterns to Avoid

- **Sanitizing JSON-LD:** `layout.tsx:76` uses `dangerouslySetInnerHTML` for structured data JSON. DOMPurify would corrupt the JSON. This is developer-controlled data via `JSON.stringify` — no user input, no sanitization needed.
- **Using `dompurify` directly:** Import only from `isomorphic-dompurify`. Direct `dompurify` import throws `ReferenceError: window is not defined` in Next.js server components.
- **CSRF before API-key check:** Adding the CSRF middleware before the API-key early-return would force n8n workflows and all external integrations to send a CSRF token, breaking them silently.
- **Enforcing scopes before schema migration:** Adding the scope check to `withPermission()` before all existing rows have been migrated to `['*']` results in every existing API-key call returning 403.
- **Setting `ALLOWED_TAGS: []`:** Empty allowlist strips all HTML including `<p>`, `<strong>` etc., breaking all markdown rendering. Use a targeted allowlist matching what `renderMarkdown()` actually produces.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom regex-based HTML cleaner | `isomorphic-dompurify` | Regex-based HTML sanitizers miss dozens of XSS vectors: SVG abuse, CSS injection, mXSS, DOM clobbering. DOMPurify has a comprehensive test suite maintained by security researchers. |
| CSRF token | Manual `crypto.randomUUID()` cookie + header comparison | `@edge-csrf/nextjs` | Signed double-submit pattern requires HMAC-signing the token. Without signing, an attacker can set their own cookie (subdomain cookie injection). The library handles signing, expiry, and rotation correctly. |
| HTML parser for scope validation | Custom `permissions.includes()` string matching | Use the existing `Module` + `Action` TypeScript union types | Type safety prevents typos in scope strings. The types are already defined and used by `withPermission()`. |

---

## Common Pitfalls

### Pitfall 1: CSRF Breaks All API-Key Integrations (Critical)

**What goes wrong:** `@edge-csrf/nextjs` is added to `proxy.ts` without excluding API-key requests. Every n8n workflow, external script, and M2M integration starts returning 403. These callers have no session cookie and cannot obtain a CSRF token.

**Why it happens:** The CSRF middleware is added as a blanket guard before the API-key check, or the API-key exclusion is placed after the CSRF check.

**How to avoid:** The API-key early-return (`request.headers.get('x-api-key')`) in `proxy.ts` lines 105–111 must remain before the CSRF middleware call. The exclusion must be structural (in the code path), not conditional inside the CSRF check.

**Warning signs:** After deploying CSRF, n8n workflows return 403. Check: does any request with `X-Api-Key` header hit the CSRF middleware?

### Pitfall 2: API-Key Scoping Breaks Existing Keys

**What goes wrong:** `withPermission()` is modified to check `apiKeyPermissions` before all existing rows have `['*']` in their `permissions` column. Rows with `['read','write']` or NULL permissions are treated as zero-access.

**Why it happens:** Developer adds enforcement in the same commit as the migration, or the migration runs after the code is deployed.

**How to avoid:** Deploy in strict order: (1) run SQL migration → verify all rows have `['*']`, (2) deploy UI changes, (3) deploy enforcement. Use a feature flag (`API_KEY_SCOPE_ENFORCEMENT=true` env var) to decouple deployment from activation.

**Warning signs:** After deploying, existing API key requests return 403. Rollback: revert the enforcement branch of `withPermission()` or set the feature flag to false.

### Pitfall 3: DOMPurify Strips Markdown Output Entirely

**What goes wrong:** `sanitizeHtml()` is called with an empty or overly restrictive `ALLOWED_TAGS` list. The markdown renderer produces `<p>`, `<strong>`, `<ul>` etc., all of which are stripped, leaving empty strings.

**Why it happens:** Copy-pasting a "safe" DOMPurify config from a tutorial that targets plain-text fields, not rich HTML.

**How to avoid:** The `ALLOWED_TAGS` list in `sanitize.ts` must match exactly what `renderMarkdown()` produces. Cross-reference with `src/lib/utils/markdown.ts` — the complete tag set produced is: `pre`, `code`, `h1`-`h4`, `hr`, `ul`, `ol`, `li`, `img`, `p`, `br`, `a`, `strong`, `em`.

**Warning signs:** Markdown content renders as blank in the UI after adding sanitization.

### Pitfall 4: InlineMarkdown Double-Escaping

**What goes wrong:** `InlineMarkdown` (markdown-renderer.tsx:23) calls `escapeHtml()` first, then applies regex transforms. If `sanitizeHtml()` is called on the output AND `escapeHtml()` was already run, the `&amp;` entities might be double-processed by DOMPurify.

**Why it happens:** DOMPurify processes the HTML as a DOM tree and re-serializes it. In most cases this is fine, but if the input already has HTML entities, the round-trip can produce double-encoded entities in some edge cases.

**How to avoid:** The existing flow in `InlineMarkdown` is: raw text → `escapeHtml()` → regex for bold/italic/links → `dangerouslySetInnerHTML`. Call `sanitizeHtml()` at the very end (after regex transforms), not before. This is the natural place — same as in `MarkdownRenderer`.

### Pitfall 5: AuthContext Missing apiKeyPermissions

**What goes wrong:** `require-permission.ts` is modified to read `auth.apiKeyPermissions`, but the `AuthContext` type and the `getAuthContext()` function in `auth-context.ts` do not include this field. TypeScript catches the type error, but if `as unknown` casts are used, it becomes a runtime `undefined` which is treated as no scopes → 403 for all API key requests.

**Why it happens:** The schema change and enforcement change are done as separate PRs without coordinating the `AuthContext` type update.

**How to avoid:** Before modifying `withPermission()`, audit `src/lib/auth/auth-context.ts` to confirm whether `permissions` from the API key DB row is loaded into the auth context. If not, add it to `AuthContext` and the API key resolution path before writing the enforcement logic.

---

## Code Examples

### isomorphic-dompurify SSR Compatibility Check

```typescript
// Verified: isomorphic-dompurify works in Next.js server context
// Source: isomorphic-dompurify README (npm registry)
import DOMPurify from 'isomorphic-dompurify'

// On server: DOMPurify uses jsdom
// On client: DOMPurify uses browser DOM
// API is identical in both environments
const clean = DOMPurify.sanitize('<img src=x onerror=alert(1)>')
// clean === '<img src="x">'  (onerror stripped)
```

### @edge-csrf/nextjs Minimal Integration

```typescript
// Source: @edge-csrf/nextjs v2 README (npm registry)
import { createCsrfMiddleware } from '@edge-csrf/nextjs'

const csrfProtect = createCsrfMiddleware({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
  },
})

// In middleware/proxy:
const response = await csrfProtect(request)
if (response) return response  // 403 on invalid token, undefined on valid/GET
```

### API Key Scope Check Pattern

```typescript
// src/lib/auth/require-permission.ts — enforcement block
// Replaces the current lines 24-27 bypass
if (auth.role === 'api') {
  const scopes: string[] = (auth.apiKeyPermissions as string[] | null) ?? ['*']
  if (!scopes.includes('*') && !scopes.includes(`${module}:${action}`)) {
    return apiForbidden(`API-Schlussel hat keine Berechtigung fur ${module}:${action}`)
  }
  return handler(auth)
}
```

### Drizzle Migration Pattern (for reference)

The project uses custom SQL migration files in `drizzle/migrations/`. Migrations are run via a script that applies SQL files. The next migration file should be `0031_*.sql`:

```sql
-- Backward-compatible migration: all existing keys get wildcard scope
UPDATE api_keys
SET permissions = '["*"]'::jsonb
WHERE permissions IS NULL
   OR (permissions != '["*"]'::jsonb AND permissions::text NOT LIKE '%:%');
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `dompurify` (browser-only) | `isomorphic-dompurify` (SSR + browser) | 2019 (v1.0) | Required for Next.js App Router server components |
| Express `csurf` middleware | `@edge-csrf/nextjs` | 2022 | `csurf` deprecated; edge runtime requires edge-compatible CSRF |
| API keys as binary on/off | API keys with `module:action` scopes | Industry standard since ~2018 (GitHub, Stripe, etc.) | Reduces blast radius of key leak |

**Deprecated/outdated:**
- `csurf` / `csrf` npm packages: Both target Express/Connect. Not compatible with Next.js App Router edge runtime.
- `dompurify` (alone): Browser-only. Will throw in Next.js SSR.

---

## Open Questions

1. **AuthContext type for apiKeyPermissions**
   - What we know: `api_keys.permissions` column exists as `jsonb`. The `ApiKeyService` loads it.
   - What's unclear: Does `getAuthContext()` in `auth-context.ts` currently include `permissions` from the API key row in the returned `AuthContext`? If not, the enforcement step requires a type change first.
   - Recommendation: Read `src/lib/auth/auth-context.ts` at the start of Plan 03-02 task execution. If `permissions` is missing from `AuthContext`, add it as `apiKeyPermissions?: string[]` before writing the enforcement logic.

2. **CSRF token in frontend fetch calls**
   - What we know: `X-CSRF-Token` is already listed in `Access-Control-Allow-Headers` in `proxy.ts:89`. The cookie will be set automatically by `@edge-csrf/nextjs`.
   - What's unclear: How many of the ~215 API routes are called from the frontend? Do they all use a shared `fetch` wrapper or are they direct `fetch()` calls?
   - Recommendation: Check if there is a shared fetch utility in `src/lib/utils/`. If yes, add the CSRF header there. If no, create one or use a React Query/SWR wrapper. Manual update of 215 route callers is not feasible.

3. **Module type for api_keys in permissions module**
   - What we know: `withPermission()` uses `Module` and `Action` types from `src/lib/types/permissions.ts`. The API keys route uses `'api_keys'` as the module string.
   - What's unclear: Is `'api_keys'` in the `Module` union type? If scoped API keys need to manage other API keys, the scope format would be `api_keys:read`, `api_keys:create` etc.
   - Recommendation: Read `src/lib/types/permissions.ts` during Plan 03-02 to confirm the full Module enum list before designing the scope selector UI.

---

## Environment Availability

Step 2.6: SKIPPED for most items — this phase adds npm packages and modifies code/SQL, no new external services.

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|---------|
| `isomorphic-dompurify` (npm) | R1.4 HTML Sanitizer | Not yet installed | 3.7.1 (latest) | None — required |
| `@edge-csrf/nextjs` (npm) | R2.4 CSRF | Not yet installed | 2.5.3-cloudflare-rc1 (latest) | None — required |
| PostgreSQL (Docker) | R2.3 Schema migration | Assumed running (production DB) | — | — |
| Drizzle migrations infrastructure | R2.3 | Present — `drizzle/migrations/` has 31 files | — | — |

**Packages not yet installed:** Both `isomorphic-dompurify` and `@edge-csrf/nextjs` are confirmed absent from `package.json`. Both are in the `npm` registry with confirmed versions. Installation is a one-line command with no conflicts against existing dependencies.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R1.4 | `sanitizeHtml('<script>alert(1)</script>')` returns empty string | unit | `npx vitest run src/__tests__/unit/utils/sanitize.test.ts` | No — Wave 0 |
| R1.4 | `sanitizeHtml('<p><strong>bold</strong></p>')` preserves allowed tags | unit | `npx vitest run src/__tests__/unit/utils/sanitize.test.ts` | No — Wave 0 |
| R1.4 | `sanitizeHtml('<img src=x onerror=alert(1)>')` strips event handler | unit | `npx vitest run src/__tests__/unit/utils/sanitize.test.ts` | No — Wave 0 |
| R2.3 | API key with `['*']` scope passes `leads:read` permission check | unit | `npx vitest run src/__tests__/unit/auth/require-permission.test.ts` | No — Wave 0 |
| R2.3 | API key with `['leads:read']` scope fails `companies:read` check | unit | `npx vitest run src/__tests__/unit/auth/require-permission.test.ts` | No — Wave 0 |
| R2.3 | API key with `['leads:read']` scope passes `leads:read` check | unit | `npx vitest run src/__tests__/unit/auth/require-permission.test.ts` | No — Wave 0 |
| R2.4 | POST without CSRF token returns 403 | manual/integration | `curl -X POST /api/v1/leads -H 'Cookie: xkmu_session=...'` | No — manual |
| R2.4 | POST with valid CSRF token passes through | manual/integration | frontend dev test | No — manual |
| R2.4 | Request with X-Api-Key header bypasses CSRF | unit (proxy) | `npx vitest run src/__tests__/unit/proxy.test.ts` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green + `npx next build` succeeds before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/unit/utils/sanitize.test.ts` — covers R1.4 sanitization XSS vectors
- [ ] `src/__tests__/unit/auth/require-permission.test.ts` — covers R2.3 scope enforcement logic
- [ ] `src/__tests__/unit/proxy.test.ts` — covers R2.4 CSRF exclusion for API-key requests

---

## Project Constraints (from CLAUDE.md / project conventions)

Extracted from `CONVENTIONS.md` and `STATE.md` — directives the planner must verify:

- **API route pattern:** All routes use `withPermission(request, module, action, handler)`. The API-key scoping change must preserve this signature — only the internal logic of `withPermission()` changes.
- **Auth context:** `auth.tenantId` is the first argument to every service method. API-key scope checking does not change this pattern.
- **German UI:** Scope selector UI, error messages for scope failures, and any new labels must be in German.
- **Response format:** Use `apiForbidden()` (existing) for scope failures, not a custom response.
- **Logger:** Use `logger.error(message, error, { module })`, not `console.error`.
- **No Vercel:** Docker-only. No Vercel-specific CSRF approaches.
- **Build before push:** `npx next build` must succeed before any commit is pushed.
- **`@/` path alias:** All new imports use `@/lib/utils/sanitize`, not relative paths.
- **Service exports:** New methods on `ApiKeyService` follow the plain-object export pattern, not class syntax.
- **Validation schemas:** Any new input schema (e.g., for updating API key scopes) goes in `src/lib/utils/validation.ts`.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/auth/require-permission.ts` — live codebase — confirmed API-key bypass at lines 25–27
- `src/lib/db/schema.ts:190-204` — live codebase — confirmed `permissions jsonb` column with `['read','write']` default
- `src/proxy.ts` — live codebase — confirmed API-key check at lines 105–111, CORS headers, session flow
- `src/app/_components/markdown-renderer.tsx` — live codebase — 2 `dangerouslySetInnerHTML` calls
- `src/app/intern/(dashboard)/settings/email-templates/page.tsx:238` — live codebase — 1 unsanitized email preview
- `src/app/layout.tsx:76` — live codebase — JSON-LD via `dangerouslySetInnerHTML` (confirmed safe)
- `.planning/research/STACK.md` — project research — `isomorphic-dompurify` and `@edge-csrf/nextjs` recommendations with rationale
- `.planning/research/PITFALLS.md` — project research — Pitfall 6 (API key scoping order) fully documented
- npm registry — confirmed `isomorphic-dompurify@3.7.1` and `@edge-csrf/nextjs@2.5.3-cloudflare-rc1` as current versions

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` — codebase analysis — identified all 4 `dangerouslySetInnerHTML` sites
- `src/app/intern/(dashboard)/settings/api-keys/page.tsx` — confirmed admin UI exists, no scope selector present
- `src/lib/services/api-key.service.ts` — confirmed `permissions` is stored/loaded, default is `['read','write']`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages confirmed in npm registry, versions verified at research time
- Architecture: HIGH — based on reading actual source files (proxy.ts, require-permission.ts, schema.ts)
- Pitfalls: HIGH — derived from live code inspection, not hypothetical
- API-key schema: HIGH — column confirmed in schema.ts line 197, default confirmed in api-key.service.ts line 36

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain; `@edge-csrf/nextjs` version may see minor updates)
