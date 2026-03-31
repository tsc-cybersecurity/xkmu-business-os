---
phase: 01-foundation
plan: 02
subsystem: import/database API route
tags: [security, sql-injection, parameterized-queries, tenant-isolation, tdd]
requirements: [R1.1]

dependency_graph:
  requires: []
  provides:
    - SQL injection-free database import route
    - Cross-tenant isolation enforcement on import
    - Parameterized DELETE and INSERT in import route
    - withPermission auth migration for import route
  affects:
    - src/app/api/v1/import/database/route.ts
    - src/__tests__/integration/api/import-database.route.test.ts

tech_stack:
  added: []
  patterns:
    - sql.identifier() for safe table/column name quoting
    - sql`${v}` tagged template for parameterized values
    - sql.join() for building parameterized value lists
    - Character-by-character SQL value parser (handles strings with commas)
    - TDD: RED (cross-tenant test fails) → GREEN (fix closes vulnerability)

key_files:
  created:
    - src/__tests__/integration/api/import-database.route.test.ts
  modified:
    - src/app/api/v1/import/database/route.ts

decisions:
  - Used sql.identifier() for column names instead of sql.raw() — zero sql.raw() calls remain
  - Applied withPermission auth migration alongside SQL fix (Plan 01-01 not yet executed)
  - parseValuesList() parses character-by-character to handle commas inside SQL string literals
  - Multi-row INSERT statements are logged and skipped (not an error, just unsupported)
  - tenant_id override is unconditional — any tenant_id from uploaded SQL is always replaced

metrics:
  duration: ~12 minutes
  completed: 2026-03-31
  tasks_completed: 2
  files_modified: 2
  commits: 2
---

# Phase 01 Plan 02: SQL Injection Fix — Database Import Summary

**One-liner:** Closed SQL injection vulnerability in DB import by replacing sql.raw() with Drizzle parameterized queries (sql.identifier + sql.join) and enforcing tenant isolation by unconditionally overwriting tenant_id from uploaded SQL with auth.tenantId.

## What Was Built

The `src/app/api/v1/import/database/route.ts` route previously executed raw SQL strings from uploaded files verbatim via `sql.raw(statement)`. An attacker could craft an SQL file containing arbitrary SQL. The DELETE in replace-mode also used string interpolation.

### Changes Made

**1. New `ParsedInsert` interface** — removed `statement: string`, added `columns: string[]` and `values: unknown[]`.

**2. New `parseValuesList()` function** — character-by-character parser that reverses the export format:
- `NULL` → `null`
- `TRUE`/`FALSE` → boolean
- `'...'` → string (with `''` → `'` unescaping)
- `'...'::jsonb` → `JSON.parse()`
- ISO date strings → `new Date()`
- Bare numbers → `Number()`

**3. Rewritten `parseInsertStatements()`** — returns structured `{table, columns, values}` instead of raw SQL strings. Multi-row INSERTs are skipped with a warning.

**4. Parameterized DELETE:**
```typescript
// OLD (unsafe)
await tx.execute(sql.raw(`DELETE FROM ${table} WHERE tenant_id = '${tenantId}'`))

// NEW (safe)
await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}`)
```

**5. Parameterized INSERT with tenant enforcement:**
```typescript
// Enforce tenant isolation: unconditionally overwrite tenant_id
const tenantIdIdx = insert.columns.indexOf('tenant_id')
if (tenantIdIdx !== -1) {
  insert.values[tenantIdIdx] = tenantId
}

const columnsSql = sql.join(insert.columns.map(c => sql.identifier(c)), sql`, `)
const valuesSql = sql.join(insert.values.map(v => sql`${v}`), sql`, `)
await tx.execute(
  sql`INSERT INTO ${sql.identifier(insert.table)} (${columnsSql}) VALUES (${valuesSql})${conflictClause}`
)
```

**6. Auth migration** — replaced local `getAuthContext()` with `withPermission(request, 'database', 'create', handler)`.

## Tests

5 tests in `src/__tests__/integration/api/import-database.route.test.ts`:

| Test | Status |
|------|--------|
| cross-tenant isolation: tenant_id in uploaded SQL is overwritten with auth tenant | PASS |
| returns 200 with success:true and stats.totalInserted > 0 for valid SQL | PASS |
| returns 400 when no file is uploaded | PASS |
| returns 400 for non-.sql file extension | PASS |
| returns 401 for unauthenticated request (tenant isolation proof) | PASS |

The cross-tenant test correctly failed in TDD RED phase (proving the vulnerability existed), then passed after the fix.

## Verification Results

| Check | Result |
|-------|--------|
| `grep "sql.raw" import/database/route.ts` | 0 matches |
| `grep "sql.identifier" import/database/route.ts` | 3 matches |
| `grep "tenantIdIdx" import/database/route.ts` | present |
| `grep "insert.columns\|insert.values" import/database/route.ts` | present |
| Import test suite (5 tests) | all pass |
| Full test suite | pre-existing 3 failures unchanged |
| `npx next build` | success (exit 0) |

## Commits

| Hash | Message |
|------|---------|
| `aad1850` | test(01-02): add failing cross-tenant import test (TDD RED) |
| `a0f7c46` | feat(01-02): fix SQL injection in database import route |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed logger.warn() call signature**
- **Found during:** Task 2 — `npx next build` TypeScript check
- **Issue:** `logger.warn()` takes `(message, context?)` — called with 3 args `(message, undefined, context)`
- **Fix:** Removed the `undefined` second argument: `logger.warn(msg, { module: '...' })`
- **Files modified:** `src/app/api/v1/import/database/route.ts`
- **Commit:** Included in `a0f7c46`

**2. [Rule 2 - Missing critical] Replaced sql.raw() for column names too**
- **Found during:** Task 2 acceptance criteria check (`grep sql.raw`)
- **Issue:** Used `sql.raw(columns.map(c => '"${c}"').join(', '))` for column names — still violates zero-sql.raw rule
- **Fix:** Replaced with `sql.join(columns.map(c => sql.identifier(c)), sql\`, \`)`
- **Files modified:** `src/app/api/v1/import/database/route.ts`
- **Commit:** Included in `a0f7c46`

**3. [Rule 1 - Bug] Updated test mocks to use withPermission pattern**
- **Found during:** Task 2 GREEN phase — after applying withPermission migration, tests mocked wrong auth layer
- **Issue:** Tests mocked `@/lib/auth/session` and `@/lib/auth/api-key` directly, but route now uses `withPermission`
- **Fix:** Updated tests to mock `@/lib/auth/require-permission` with correct `withPermission` mock
- **Files modified:** `src/__tests__/integration/api/import-database.route.test.ts`
- **Commit:** Included in `a0f7c46`

## Known Stubs

None — the import route is fully functional. All values are parameterized, tenant isolation is enforced.

## Self-Check: PASSED
