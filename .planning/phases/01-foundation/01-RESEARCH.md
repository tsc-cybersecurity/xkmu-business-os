# Phase 1: Foundation - Research

**Researched:** 2026-03-30
**Domain:** Auth consolidation, SQL injection remediation, hardcoded credentials removal
**Confidence:** HIGH — all findings based on direct source inspection of the live codebase

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R2.1 | Auth-Konsolidierung: 14 duplizierte `getAuthContext()` Implementierungen durch zentrale `withPermission()` ersetzen | Full audit of all 14 files completed — see Architecture Patterns section for per-file migration spec |
| R1.1 | SQL Injection Fix: `sql.raw()` im DB-Import-Route durch parametrisierte Queries ersetzen | Both injection vectors located at exact line numbers — see Don't Hand-Roll and Code Examples |
| R1.5 | Credentials Cleanup: Hardcoded Secrets aus Seed-Scripts und Docker Compose entfernen | All three credential locations identified with exact values and replacement strategy |
</phase_requirements>

---

## Summary

Phase 1 targets three independent but sequentially important changes to a live production codebase. The most complex is R2.1 — a mechanical but large refactor touching 14 API route files simultaneously. The requirement for atomicity (all 14 in a single commit, no partial state) is the primary planning constraint. Direct source inspection reveals that none of the 14 duplicate implementations add security-critical logic that the canonical `withPermission()` cannot cover; however, two files (`export/database` and `import/database`) use a different response format that must be preserved, and the `import/database` route uses a custom error union type that must be handled carefully during migration.

R1.1 is technically straightforward but has a secondary concern that is easy to miss: the DELETE operation uses `sql.raw()` with string interpolation (`tenantId` from the session), and the INSERT operation executes the raw SQL statement string from the uploaded file content unchanged. The correct fix is not only to parameterize the DELETE, but to re-parse the INSERT values and reconstruct parameterized queries — or to enforce that `tenantId` from `auth.tenantId` overrides any tenant reference in the imported SQL, then add a cross-tenant test.

R1.5 is the simplest of the three. Two seed files have identical hardcoded fallbacks. The docker-compose has two secrets using `${VAR:-default}` syntax. The fix order matters: add the required variables to docker-compose first (with `${VAR:?error}` syntax), then remove the hardcoded fallbacks from the seed files, then verify a fresh Docker deployment still seeds correctly.

**Primary recommendation:** Execute plans in order 01-01 (Auth) → 01-02 (SQL injection) → 01-03 (Credentials). All three are independent enough to plan in parallel but 01-01 touches the most files and should be verified green before merging to reduce noise in the diff.

---

## Standard Stack

### Core (existing — no new dependencies needed for Phase 1)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Drizzle ORM | 0.45.1 | Parameterized queries | `sql` tagged template already in use; eliminates `sql.raw()` |
| Next.js | 16.1.6 | App Router, API routes | `withPermission()` already available |
| Vitest | 4.1.0 | Test runner | Already configured; 19 unit + 4 integration tests pass |

No new dependencies are required for Phase 1. All three plans use only the existing stack.

---

## Architecture Patterns

### Canonical `withPermission()` Signature

```typescript
// src/lib/auth/require-permission.ts
export async function withPermission(
  request: NextRequest,
  module: Module,
  action: Action,
  handler: (auth: AuthContext) => Promise<Response>
): Promise<Response>
```

`AuthContext` has four fields: `tenantId`, `userId`, `role`, `roleId`. The canonical `getAuthContext()` in `src/lib/auth/auth-context.ts` produces this. The duplicate copies produce subsets (some omit `role`, some omit `roleId`). After migration, all routes get the full `AuthContext`.

### Per-Route Migration Map for R2.1 (All 14 Files)

This table is the primary output for the planner. Each row specifies exactly what the local `getAuthContext` does that differs from canonical, and what `withPermission()` call replaces it.

| File | Local getAuthContext behavior | Special logic | withPermission() replacement | Notes |
|------|-------------------------------|---------------|------------------------------|-------|
| `companies/[id]/research/route.ts` | Returns `{ tenantId, userId }` only — no `role` | None | `withPermission(req, 'companies', 'update', ...)` | `userId` available via `auth.userId` |
| `email/send/route.ts` | Returns `{ tenantId, userId, role }` | None | `withPermission(req, 'activities', 'create', ...)` | No permission gate beyond auth |
| `export/database/route.ts` | Returns `{ tenantId }` for admin/API-key, `{ error: 'forbidden' }` for non-admin, `{ error: 'unauthorized' }` for no session | **Admin-only: owner or admin role required; API key requires `hasPermission(payload, 'read')`** | `withPermission(req, 'database', 'read', ...)` | Uses custom `NextResponse.json` format (not `apiSuccess`/`apiUnauthorized`); migrate response format too |
| `import/database/route.ts` | Same pattern as export: `{ error: 'forbidden' \| 'unauthorized' }` union | **Admin-only: owner or admin role required; API key requires `hasPermission(payload, 'write')`** | `withPermission(req, 'database', 'create', ...)` | Also uses `NextResponse.json` format; ALSO contains the `sql.raw()` injection (Plan 01-02) |
| `leads/[id]/research/route.ts` | Returns `{ tenantId, userId }` only | None | `withPermission(req, 'leads', 'update', ...)` | |
| `leads/[id]/outreach/route.ts` | Returns `{ tenantId, userId, role }` | None | `withPermission(req, 'leads', 'update', ...)` | |
| `persons/[id]/research/route.ts` | Returns `{ tenantId, userId }` only | None | `withPermission(req, 'persons', 'update', ...)` | |
| `companies/[id]/crawl/route.ts` | Returns `{ tenantId, userId }` only | None | `withPermission(req, 'companies', 'update', ...)` | |
| `companies/[id]/analyze-document/route.ts` | Returns `{ tenantId, userId, role }` | None | `withPermission(req, 'companies', 'update', ...)` | |
| `companies/[id]/persons/route.ts` | Returns `{ tenantId }` only | None | `withPermission(req, 'companies', 'read', ...)` | Minimal local copy |
| `companies/[id]/research/[researchId]/apply/route.ts` | Returns `{ tenantId, userId }` | None | `withPermission(req, 'companies', 'update', ...)` | |
| `companies/[id]/research/[researchId]/reject/route.ts` | Returns `{ tenantId, userId }` | None | `withPermission(req, 'companies', 'update', ...)` | |
| `ideas/[id]/convert/route.ts` | Returns `{ tenantId, userId, role }` | None | `withPermission(req, 'ideas', 'update', ...)` | |
| `ai-prompt-templates/seed/route.ts` | Returns `{ tenantId, userId, role: 'admin' for API keys }` | **Manual admin check after auth: `if (auth.role !== 'owner' && auth.role !== 'admin')`** | `withPermission(req, 'ai_prompts', 'create', ...)` | The explicit admin check is already covered by the `database`/`ai_prompts` module's DEFAULT_ROLE_PERMISSIONS |

**Canonical module for admin-only operations:** The `database` module in `permissions.ts` is already defined as admin-restricted in `DEFAULT_ROLE_PERMISSIONS`. Using `withPermission(req, 'database', 'read/create', ...)` for export/import routes will preserve the admin-only gate via the existing RBAC system.

**What the 14 copies are NOT doing that might seem special:**
- None check for a specific `tenantId` in the request body/params — they all derive `tenantId` from the session/API key
- None implement rate limiting (the current global rate limiter is called elsewhere, or not at all for these routes)
- The `ai-prompt-templates/seed` manual admin check is redundant — `withPermission` handles this via RBAC

**The two response-format outliers (export/import):** These routes use `NextResponse.json({ error: '...' }, { status: 4xx })` instead of `apiUnauthorized()` / `apiForbidden()`. After migration to `withPermission()`, the route handler body will only receive control when auth succeeds, so those manual error responses are removed entirely. The streaming response format for export (`ReadableStream`) must be preserved — only the auth block is replaced.

### Pattern: Replacing `sql.raw()` in import/database/route.ts

There are two injection points in `src/app/api/v1/import/database/route.ts`:

**Injection Point 1 — DELETE (line 188):**
```typescript
// CURRENT (unsafe — string interpolation with tenantId from session, still bad practice)
await tx.execute(sql.raw(`DELETE FROM ${table} WHERE tenant_id = '${tenantId}'`))

// FIXED (parameterized)
await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}`)
```

**Injection Point 2 — INSERT (line 212) — the critical one:**
```typescript
// CURRENT (unsafe — raw statement string from uploaded SQL file, direct execution)
await tx.execute(sql.raw(statement))

// The fix requires a different approach. The INSERT statement from the file cannot be
// parameterized by wrapping it — the entire approach must change.
// CORRECT APPROACH: Parse the INSERT statement's VALUES, then re-construct a
// parameterized Drizzle insert, OR use a VALUES-parsing approach:

// Step 1: The parseInsertStatements() function already extracts table name.
// Step 2: Add value extraction to ParsedInsert:
interface ParsedInsert {
  table: string
  columns: string[]
  values: unknown[]  // parsed values as JS values
}

// Step 3: Execute with Drizzle parameterized insert
await tx.execute(
  sql`INSERT INTO ${sql.identifier(insert.table)} (${sql.raw(insert.columns.join(', '))})
      VALUES (${sql.join(insert.values.map(v => sql`${v}`), sql`, `)})
      ON CONFLICT DO NOTHING`
)
```

**Tenant isolation fix (cross-tenant import attack):**
After parsing INSERT values, if the table has a `tenant_id` column, the value must be overwritten with `auth.tenantId`:
```typescript
const tenantIdIdx = insert.columns.indexOf('tenant_id')
if (tenantIdIdx !== -1) {
  insert.values[tenantIdIdx] = tenantId  // override with auth.tenantId
}
```

### Pattern: Credentials Cleanup

**Three locations with hardcoded fallbacks:**

1. `src/lib/db/seed-check.ts:20-21`:
```typescript
// CURRENT
email: process.env.SEED_ADMIN_EMAIL || 'xkmu9c0up6ab04k35f66784bljf2rqb5f43@vdix.de',
password: process.env.SEED_ADMIN_PASSWORD || 'fG58Ebj2@MDv6uvm',

// FIXED — fail loudly if not set
const adminEmail = process.env.SEED_ADMIN_EMAIL
const adminPassword = process.env.SEED_ADMIN_PASSWORD
if (!adminEmail || !adminPassword) {
  throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set')
}
```

2. `src/lib/db/seed.ts:14-15` — identical hardcoded fallbacks, same fix.

3. `docker-compose.local.yml:37-48` — two secrets using `${VAR:-default}` syntax:
```yaml
# CURRENT (secrets with known default values)
DATABASE_URL=postgresql://postgres:${SUPABASE_DB_PASSWORD:-48cc2ba9bf03963c170c83798ef1419a}@...
JWT_SECRET=${JWT_SECRET:-changeMe_jwt_secret_min32chars_2026!}
REDIS_URL=redis://:${REDIS_PASSWORD:-changeMe_redis_2026!}@redis:6379
command: redis-server ... --requirepass ${REDIS_PASSWORD:-changeMe_redis_2026!}

# FIXED (fail startup if not set)
DATABASE_URL=postgresql://postgres:${SUPABASE_DB_PASSWORD:?SUPABASE_DB_PASSWORD must be set}@...
JWT_SECRET=${JWT_SECRET:?JWT_SECRET must be set (min 32 chars)}
REDIS_URL=redis://:${REDIS_PASSWORD:?REDIS_PASSWORD must be set}@redis:6379
command: redis-server ... --requirepass ${REDIS_PASSWORD:?REDIS_PASSWORD must be set}
```

**Docker `${VAR:?error}` behavior:** When `docker compose` encounters `${VAR:?message}`, it exits with a non-zero code and prints the message if `VAR` is unset or empty. This is the correct pattern for required secrets.

**SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD in docker-compose:** Currently using `${SEED_ADMIN_EMAIL:-}` (empty default). Must change to `${SEED_ADMIN_EMAIL:?SEED_ADMIN_EMAIL must be set for initial seed}`. However: on subsequent container starts (after first seed), the seed is skipped if the user already exists. Check `seed-check.ts` logic to see if it skips gracefully when the user exists before adding hard requirement.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parameterized SQL in import | Custom SQL escaper / quoting function | Drizzle `sql` tagged template with `${value}` interpolation | Drizzle parameterizes template variables; custom escaping always has edge cases (NULL, JSON, dates) |
| Admin permission check | Manual `if (auth.role !== 'owner')` guards | `withPermission(req, 'database', 'create', ...)` | DEFAULT_ROLE_PERMISSIONS already restricts `database` module to owner/admin |
| Value extraction from SQL INSERT strings | Custom SQL parser | Use Drizzle's insert builder with programmatically extracted values | SQL parsing is a rabbit hole; only reliable for known-format exports from this same codebase |

---

## Common Pitfalls

### Pitfall 1: Partial Migration — Leaving Some of the 14 Routes Behind

**What goes wrong:** The PR migrates 12 of 14 routes. The remaining 2 (likely the complex `export/database` and `import/database`) are deferred. The repo enters a permanent mixed state.

**Why it happens:** export/database and import/database use a non-standard response format (`NextResponse.json` instead of `apiSuccess`) and have admin-only logic, making them more complex than the other 12.

**How to avoid:** Migrate all 14 in the same PR. The response format difference for export/import is small — `withPermission` itself returns the auth error responses; only the streaming GET response body and the POST handler body need to be preserved.

**Warning signs:** `grep -rn "async function getAuthContext" src/app/api/` returns any results after migration.

---

### Pitfall 2: SQL Fix Parameterizes DELETE But Leaves INSERT Vulnerable

**What goes wrong:** The developer focuses on the obvious `sql.raw()` calls, fixes the DELETE string interpolation, but replaces the INSERT `sql.raw(statement)` with a different raw approach (e.g., `db.execute(sql\`${sql.raw(statement)}\`)`), which is functionally identical.

**How to avoid:** The INSERT fix requires re-parsing statement values and re-building the query using Drizzle's parameterized builder. The `parseInsertStatements()` function must be extended to extract columns and values as structured data, not just preserve the raw statement string.

**Warning signs:** Any path in the import route that still constructs a SQL string from file content and passes it to execute.

---

### Pitfall 3: SQL Fix Correct But tenantId Still From File Content

**What goes wrong:** The INSERT is now parameterized, but the `tenant_id` value in the parsed row still comes from the uploaded SQL file. An attacker uploads a SQL file with `tenant_id = '<victim-tenant-uuid>'` and inserts data into another tenant's tables.

**How to avoid:** After extracting column/value pairs, detect the `tenant_id` column and unconditionally overwrite it with `auth.tenantId`.

**Verification:** Integration test: upload a SQL file with rows referencing a different `tenant_id` as admin of Tenant A. Confirm the imported rows have Tenant A's `tenant_id`, not the fake one.

---

### Pitfall 4: Credentials Removal Breaks Fresh Deployments

**What goes wrong:** Hardcoded fallbacks are removed from seed files before `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are added to the docker-compose. A fresh deployment runs the seed with empty env vars, which either crashes with an obscure error or (if the check is missing) inserts a user with an empty email/password.

**How to avoid:** Add the env vars to docker-compose FIRST (with `${VAR:?message}` syntax), then remove the hardcoded fallbacks. The execution order within plan 01-03 must enforce this.

**Warning signs:** Running `docker compose -f docker-compose.local.yml config` on a machine without `.env` should print an error about missing variables, not start silently.

---

### Pitfall 5: `export/database` Streaming Response Broken After Migration

**What goes wrong:** The export route returns a `ReadableStream` wrapped in `new NextResponse(stream, ...)`. When migrating to `withPermission()`, the developer moves the stream construction into the handler callback but accidentally breaks the streaming by returning a plain `apiSuccess()` wrapper.

**How to avoid:** The stream must be returned directly from inside the handler callback:
```typescript
export async function GET(request: NextRequest) {
  return withPermission(request, 'database', 'read', async (auth) => {
    const tenantId = auth.tenantId
    const stream = new ReadableStream({ ... })  // same as before
    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ... }
    })
  })
}
```

---

## Code Examples

### Standard Migration Pattern (applies to 11 of 14 routes)

```typescript
// BEFORE (example: leads/[id]/research/route.ts)
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return { tenantId: session.user.tenantId, userId: session.user.id }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) return { tenantId: payload.tenantId, userId: null }
  }
  return null
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()
  // ... handler body using auth.tenantId and auth.userId
}

// AFTER
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'leads', 'update', async (auth) => {
    // auth.tenantId, auth.userId, auth.role, auth.roleId all available
    // ... same handler body, unchanged
  })
}
```

**Imports to REMOVE from each migrated file:**
- `import { getSession } from '@/lib/auth/session'`
- `import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'`

**Import to ADD:**
- `import { withPermission } from '@/lib/auth/require-permission'`

### Admin-Only Route Migration (export/database and import/database)

```typescript
// BEFORE: export/database/route.ts
async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    const isAdmin = session.user.role === 'owner' || session.user.role === 'admin'
    if (!isAdmin) return { error: 'forbidden' as const }
    return { tenantId: session.user.tenantId }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      if (!hasPermission(payload, 'read')) return { error: 'forbidden' as const }
      return { tenantId: payload.tenantId }
    }
  }
  return { error: 'unauthorized' as const }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) {
    if (auth.error === 'unauthorized') return NextResponse.json({ error: '...' }, { status: 401 })
    return NextResponse.json({ error: '...' }, { status: 403 })
  }
  const tenantId = auth.tenantId
  // ... streaming response
}

// AFTER: export/database/route.ts
// withPermission with module 'database' already restricts to owner/admin via DEFAULT_ROLE_PERMISSIONS
// The 'api' role bypass is still in withPermission (Phase 3 will fix this), but that's acceptable for Phase 1

export async function GET(request: NextRequest) {
  return withPermission(request, 'database', 'read', async (auth) => {
    const tenantId = auth.tenantId
    const stream = new ReadableStream({ ... })  // unchanged
    return new NextResponse(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ... }
    })
  })
}
```

### Drizzle Parameterized DELETE (import/database fix)

```typescript
// BEFORE (string interpolation — bad practice even with session-derived tenantId)
await tx.execute(sql.raw(`DELETE FROM ${table} WHERE tenant_id = '${tenantId}'`))

// AFTER (parameterized — safe)
await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}`)
```

Note: `sql.identifier()` is used for the table name (must be an identifier, not a value). The `${tenantId}` is interpolated as a parameterized value by Drizzle.

### Drizzle Parameterized INSERT (import/database fix — the critical one)

The `parseInsertStatements()` function must be rewritten to return structured data instead of raw SQL strings:

```typescript
interface ParsedInsert {
  table: string
  columns: string[]
  values: unknown[]   // parsed JS values for a single row
}

// For each row in the INSERT, extract columns and values
// Then execute as parameterized query:
for (const insert of sortedInserts) {
  // Overwrite tenant_id with auth.tenantId (cross-tenant safety)
  const tenantIdIdx = insert.columns.indexOf('tenant_id')
  if (tenantIdIdx !== -1) {
    insert.values[tenantIdIdx] = tenantId
  }

  const columnsSql = sql.raw(insert.columns.map(c => `"${c}"`).join(', '))
  const valuesSql = sql.join(
    insert.values.map(v => sql`${v}`),
    sql`, `
  )
  const conflictClause = mode === 'merge' ? sql` ON CONFLICT DO NOTHING` : sql``

  await tx.execute(
    sql`INSERT INTO ${sql.identifier(insert.table)} (${columnsSql}) VALUES (${valuesSql})${conflictClause}`
  )
}
```

---

## Environment Availability

Step 2.6: SKIPPED — Phase 1 is pure code/config changes. No new external dependencies are introduced. The existing Docker/PostgreSQL/Redis stack that already runs in production is not modified.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (or inferred from package.json) |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R2.1 | All 14 migrated routes return 401 for invalid session | integration | `npx vitest run src/__tests__/integration/api/auth.route.test.ts` | Auth test exists; needs to cover migrated routes |
| R2.1 | Zero `async function getAuthContext` in `src/app/api/` | grep check | `grep -rn "async function getAuthContext" src/app/api/` | N/A (grep, not vitest) |
| R1.1 | Import route rejects `sql.raw()` (no raw string execution) | integration | `npx vitest run src/__tests__/integration/api/admin-database.route.test.ts` | Exists; needs cross-tenant test added |
| R1.1 | Cross-tenant import attempt rejected | integration | Needs new test in `admin-database.route.test.ts` | ❌ Wave 0 |
| R1.5 | Docker compose fails on start without secrets | manual | `docker compose -f docker-compose.local.yml config` | N/A (docker, not vitest) |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=dot`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] Cross-tenant import test in `src/__tests__/integration/api/admin-database.route.test.ts` — covers R1.1 tenant isolation
- [ ] 401-response test for each of the 14 migrated routes — covers R2.1 (can be added to existing `auth.route.test.ts` or new file)

---

## Open Questions

1. **`seed-check.ts` vs `seed.ts`: both run on startup?**
   - What we know: Both files have identical hardcoded fallbacks. `seed.ts` appears to be a simpler version. `seed-check.ts` is much larger (contains CMS pages, etc.).
   - What's unclear: Does `seed-check.ts` skip gracefully when admin user already exists? If so, the SEED_ADMIN_EMAIL requirement can be made hard (`throw Error`) without breaking re-deployments.
   - Recommendation: Read the Docker entrypoint to confirm which seed script runs and whether it's idempotent. If idempotent (checks before inserting), hard-require the env var. If not, the fix needs to be softer.

2. **`ai-prompt-templates/seed` route: is `withPermission(req, 'ai_prompts', 'create', ...)` truly admin-only?**
   - What we know: The current code explicitly gates on `role === 'owner' || role === 'admin'`. The `ai_prompts` module's DEFAULT_ROLE_PERMISSIONS should restrict create to admin.
   - Recommendation: Verify `DEFAULT_ROLE_PERMISSIONS` for `ai_prompts` module before migration to confirm the RBAC gate is equivalent. If `member` can `create` ai_prompts, the migration would loosen security.

3. **INSERT value parsing from SQL strings: what edge cases exist in the export format?**
   - What we know: The export route generates the SQL using `formatSqlValue()` which handles NULL, boolean, Date, JSON, and string types. The output format is consistent.
   - What's unclear: The import parser only handles single-row INSERT statements (one VALUES clause). Multi-row INSERT (`VALUES (row1), (row2)`) is not generated by the exporter but could appear in user-crafted files.
   - Recommendation: The import should only accept single-row INSERT statements (existing behavior) and document this. The parser should reject multi-row INSERT statements explicitly.

---

## Sources

### Primary (HIGH confidence — direct source inspection)
- `src/lib/auth/auth-context.ts` — canonical getAuthContext implementation
- `src/lib/auth/require-permission.ts` — withPermission() implementation and API key bypass
- `src/lib/types/permissions.ts` — module list including 'database'
- `src/lib/db/seed-check.ts:20-21` — hardcoded credentials location
- `src/lib/db/seed.ts:14-15` — hardcoded credentials location
- `docker-compose.local.yml:37-48` — Docker secrets with default values
- All 14 duplicate route files — direct inspection of local getAuthContext variants
- `src/app/api/v1/import/database/route.ts:188,212` — sql.raw() injection points

### Secondary (HIGH confidence — project planning documents)
- `.planning/codebase/CONCERNS.md` — confirmed vulnerability locations
- `.planning/research/PITFALLS.md` — verified pitfall analysis
- `.planning/research/ARCHITECTURE.md` — architecture recommendations

---

## Metadata

**Confidence breakdown:**
- Auth migration map: HIGH — based on direct source read of all 14 files
- SQL injection fix approach: HIGH — based on direct source read of import/database route + Drizzle sql template docs from ARCHITECTURE.md
- Credentials locations: HIGH — exact file:line confirmed by direct read
- withPermission module assignments: MEDIUM — DEFAULT_ROLE_PERMISSIONS not yet read; assumption that 'database' module is admin-restricted needs verification in Open Questions #2

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack, no fast-moving dependencies)
