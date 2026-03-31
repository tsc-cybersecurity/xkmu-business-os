# Phase 5: Test Coverage - Research

**Researched:** 2026-03-30
**Domain:** Vitest unit/integration testing, Drizzle ORM mocking, real-DB integration tests
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R3.3 | 80% coverage for auth, tenant, email, api-key services; integration tests with real DB; tenant-isolation verified | Service file inventory complete; mock-db pattern established; real-DB approach via Neon test schema documented |
| R3.4 | Integration tests for login-flow, CRUD (3 modules), multi-tenant isolation, permission-checks | auth.route.test.ts provides login-flow template; tenant-isolation pattern documented; CRUD candidates identified |
</phase_requirements>

---

## Summary

Phase 5 adds test coverage for the four security-critical service areas that have zero tests today: `api-key.service.ts`, `tenant.service.ts`, `email.service.ts`, and the auth layer (`require-permission.ts`, `auth-context.ts`, `session.ts`, `api-key.ts`). The requirement specifies 80% coverage for these areas and integration tests using a **real database** (no DB mocks).

The existing test infrastructure (Vitest 4.1, `setupDbMock`, `mockAuthContext`, dynamic import pattern) is mature and proven across 19 service unit tests. The unit test plan (05-01) follows established patterns exactly. The integration test plan (05-02) requires a different approach: a `.env.test` pointing at a dedicated Neon test schema (or the dev DB) so that real Drizzle queries execute. No Docker container is running locally — the dev environment uses Neon (cloud PostgreSQL). Integration tests must manage their own test-tenant data (seed before / cleanup after each test).

The R3.4 requirement "no DB mocks" conflicts with the existing `src/__tests__/integration/` approach which still uses `setupDbMock`. The planner must treat 05-02 as a **new test category** (`src/__tests__/integration-real/`) with a separate vitest project config or a `TEST_DATABASE_URL` environment variable pointing to an isolated test schema.

**Primary recommendation:** Unit tests (05-01) use the established `setupDbMock` + dynamic import pattern. Integration tests (05-02) use a real Neon connection via `TEST_DATABASE_URL`, a `beforeAll` that seeds one test tenant, and an `afterAll` that deletes it by tenantId.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.0 | Test runner | Already configured, all team tests use it |
| @vitest/coverage-v8 | 4.1.0 | Coverage reports | Already configured |
| drizzle-orm | current | Real DB queries in integration tests | Same ORM as production |
| postgres | current | PostgreSQL driver | Same driver as production |

### No new dependencies required
All needed libraries are already installed. The integration test DB approach only requires an environment variable (`TEST_DATABASE_URL`) and a dedicated test-schema setup — no new npm packages.

**Installation:** none required

---

## Architecture Patterns

### Recommended Test Structure
```
src/__tests__/
  setup.ts                                    # existing (vi.restoreAllMocks)
  helpers/
    fixtures.ts                               # extend with new fixtures
    mock-db.ts                                # existing (unit tests only)
    mock-auth.ts                              # existing (unit tests only)
    mock-request.ts                           # existing
    test-db.ts                                # NEW — real DB helper for integration-real
  unit/
    auth/
      require-permission.test.ts              # existing (5 tests)
      auth-context.test.ts                    # NEW (R3.3)
      session.test.ts                         # NEW (R3.3)
      api-key.test.ts                         # NEW (R3.3) — generateApiKey, hashApiKey, validateApiKey
    services/
      api-key.service.test.ts                 # NEW (R3.3)
      tenant.service.test.ts                  # NEW (R3.3)
      email.service.test.ts                   # NEW (R3.3)
      email-template.service.test.ts          # NEW (R3.3)
      ... (19 existing files unchanged)
  integration/
    api/
      ... (5 existing files unchanged)
  integration-real/                           # NEW directory — real DB
    setup/
      test-db.ts                              # seed + cleanup helpers
    auth-flow.test.ts                         # R3.4: login, register, session
    tenant-isolation.test.ts                  # R3.4: cross-tenant access denied
    api-key-scoping.test.ts                   # R3.3: real key create/validate cycle
    crud/
      companies.test.ts                       # R3.4: CRUD module 1
      leads.test.ts                           # R3.4: CRUD module 2
      users.test.ts                           # R3.4: CRUD module 3
    permission-checks.test.ts                 # R3.4: withPermission role matrix
```

### Pattern 1: Unit Test — Service with DB (established)
**What:** Mock `@/lib/db` via `setupDbMock()`, dynamic import service after mock setup.
**When to use:** All 05-01 unit tests.
```typescript
// Source: src/__tests__/unit/services/company.service.test.ts (established pattern)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

describe('ApiKeyService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/api-key.service')
    return mod.ApiKeyService
  }

  it('create() inserts key and returns rawKey', async () => {
    dbMock.mockInsert.mockResolvedValue([{ id: 'key-1', tenantId: 'tenant-1', keyHash: 'hash', keyPrefix: 'xkmu_abcde', name: 'test', permissions: ['*'], createdAt: new Date(), updatedAt: new Date(), userId: null, expiresAt: null, lastUsedAt: null }])
    const service = await getService()
    const result = await service.create('tenant-1', { name: 'test' })
    expect(result.rawKey).toMatch(/^xkmu_/)
    expect(dbMock.db.insert).toHaveBeenCalled()
  })
})
```

### Pattern 2: Unit Test — Auth Functions (crypto + bcrypt mocking)
**What:** `api-key.ts` functions (`generateApiKey`, `hashApiKey`, `validateApiKey`) need bcrypt and DB mocked.
**When to use:** `src/__tests__/unit/auth/api-key.test.ts`
```typescript
// Key insight: hashApiKey uses bcrypt.hash (10 rounds = ~100ms in test)
// Mock bcryptjs to keep tests fast
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$mockedhash'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))
```

### Pattern 3: Unit Test — Session (jose + next/headers mocking)
**What:** `session.ts` uses `jose` for JWT and `next/headers` for cookies.
**When to use:** `src/__tests__/unit/auth/session.test.ts`
```typescript
// Must mock next/headers (cookies()) — not available in node test environment
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'mock-jwt-token' }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

// Must mock jose for createSession (signing) and getSession (verifying)
vi.mock('jose', () => ({
  SignJWT: vi.fn().mockReturnValue({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock.jwt.token'),
  }),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: {
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'admin', roleId: null, email: 'a@b.de' },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  }),
}))
```

### Pattern 4: Unit Test — EmailService (nodemailer mocking)
**What:** `email.service.ts` depends on `nodemailer` and `db`. Both must be mocked.
**When to use:** `src/__tests__/unit/services/email.service.test.ts`
```typescript
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: '<test@test.com>' }),
      verify: vi.fn().mockResolvedValue(true),
    }),
  },
}))

// Also set env vars for getConfig() to return non-null
process.env.EMAIL_USER = 'test@example.com'
process.env.EMAIL_PASSWORD = 'testpassword'
```

### Pattern 5: Integration Test with Real DB
**What:** Real Drizzle connection against `TEST_DATABASE_URL` (Neon). Seed test tenant, run tests, delete by tenantId.
**When to use:** All 05-02 integration-real tests.
**Critical:** R3.3 explicitly says "keine Mocks fuer DB" (no DB mocks). This is a distinct test category.

```typescript
// src/__tests__/integration-real/setup/test-db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const TEST_TENANT_ID = '00000000-0000-0000-ffff-000000000001'  // distinct prefix to avoid collision

export function createTestDb() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL not set — create .env.test')
  const client = postgres(url, { max: 5 })
  return drizzle(client, { schema })
}

export async function seedTestTenant(db: ReturnType<typeof createTestDb>) {
  await db.insert(schema.tenants).values({
    id: TEST_TENANT_ID,
    name: 'Integration Test Tenant',
    slug: 'integration-test-tenant',
    status: 'active',
  })
  return TEST_TENANT_ID
}

export async function cleanupTestTenant(db: ReturnType<typeof createTestDb>) {
  // Cascade: delete child records first due to FK constraints
  await db.delete(schema.apiKeys).where(eq(schema.apiKeys.tenantId, TEST_TENANT_ID))
  await db.delete(schema.users).where(eq(schema.users.tenantId, TEST_TENANT_ID))
  await db.delete(schema.tenants).where(eq(schema.tenants.id, TEST_TENANT_ID))
}
```

```typescript
// Usage in test file
import { createTestDb, seedTestTenant, cleanupTestTenant, TEST_TENANT_ID } from '../setup/test-db'

describe('ApiKeyService — real DB integration', () => {
  let db: ReturnType<typeof createTestDb>

  beforeAll(async () => {
    db = createTestDb()
    await seedTestTenant(db)
  })

  afterAll(async () => {
    await cleanupTestTenant(db)
  })

  it('creates an api key and validates it', async () => {
    const { ApiKeyService } = await import('@/lib/services/api-key.service')
    const result = await ApiKeyService.create(TEST_TENANT_ID, { name: 'test-key' })
    expect(result.rawKey).toMatch(/^xkmu_/)

    const { validateApiKey } = await import('@/lib/auth/api-key')
    const payload = await validateApiKey(result.rawKey)
    expect(payload).not.toBeNull()
    expect(payload!.tenantId).toBe(TEST_TENANT_ID)
  })
})
```

### Pattern 6: Tenant Isolation Test
**What:** Create data under Tenant A, verify Tenant B cannot see it.
**When to use:** `src/__tests__/integration-real/tenant-isolation.test.ts`

```typescript
const TENANT_A = '00000000-0000-ffff-0000-000000000001'
const TENANT_B = '00000000-0000-ffff-0000-000000000002'

it('tenant B cannot read tenant A companies', async () => {
  // Insert company for tenant A
  await db.insert(schema.companies).values({ id: 'company-a', tenantId: TENANT_A, name: 'A GmbH', ... })

  const { CompanyService } = await import('@/lib/services/company.service')
  const results = await CompanyService.list(TENANT_B, {})

  // Tenant B sees zero results — tenant A's company is invisible
  expect(results.items.find(c => c.id === 'company-a')).toBeUndefined()
})
```

### Anti-Patterns to Avoid
- **Using `setupDbMock()` in integration-real tests:** The entire point of 05-02 is no DB mocks. Real DB must be used.
- **Sharing test tenantId with dev data:** Use a reserved UUID prefix (`ffff`) that only test code creates, so cleanup is safe.
- **Running integration-real tests against production DB:** `TEST_DATABASE_URL` must point to a schema with test data only. Using the Neon dev DB is acceptable if tenant cleanup is guaranteed.
- **Forgetting FK cascade order:** PostgreSQL FK constraints require deleting child tables first (api_keys, users, activities before tenants).
- **Not setting `JWT_SECRET` env var in test:** `session.ts::getJwtSecret()` throws if `JWT_SECRET` is undefined. Must set `process.env.JWT_SECRET = 'test-secret-min-32-chars-for-vitest'` in test setup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB teardown ordering | Custom cascade logic | Delete children before parents in correct FK order | PostgreSQL enforces FK; wrong order = constraint error |
| bcrypt in unit tests | Real bcrypt hashing | `vi.mock('bcryptjs')` | 10 bcrypt rounds ≈ 100ms each; 20 tests = 2s overhead |
| Coverage thresholds | Custom script | `vitest --coverage --coverage.thresholds.lines=80` in config | Built into `@vitest/coverage-v8` |
| Test data UUIDs | random UUIDs | Fixed UUID constants with reserved prefix | Random UUIDs make cleanup harder and logs noisy |

**Key insight:** The `@vitest/coverage-v8` threshold configuration allows per-file and per-directory thresholds. Set thresholds only for the four target directories to avoid forcing 80% on the entire codebase.

---

## Runtime State Inventory

> SKIPPED — this is a greenfield test addition phase, not a rename/refactor phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vitest | Unit + integration tests | ✓ | 4.1.0 | — |
| @vitest/coverage-v8 | Coverage reports | ✓ | 4.1.0 | — |
| PostgreSQL (local) | Real-DB integration tests | ✗ | — | Neon (cloud) via TEST_DATABASE_URL |
| Neon (cloud Postgres) | Real-DB integration tests | ✓ | .env DATABASE_URL exists | — |
| nodemailer | email.service.ts | ✓ | installed | — |
| bcryptjs | api-key.ts, user.service.ts | ✓ | installed | — |
| jose | session.ts | ✓ | installed | — |

**Missing dependencies with no fallback:** None — all tools present.

**Missing dependencies with fallback:**
- Local PostgreSQL: not running. Use Neon cloud DB (`DATABASE_URL` from `.env`) as `TEST_DATABASE_URL` in `.env.test`. Tests must clean up by tenantId so they don't corrupt shared dev data.

**Critical environment setup for 05-02:**
```bash
# .env.test (create this file — not committed to git)
TEST_DATABASE_URL="<same as DATABASE_URL from .env>"
JWT_SECRET="test-jwt-secret-minimum-32-characters-long"
DATABASE_SSL="require"
```

---

## Common Pitfalls

### Pitfall 1: `next/headers` not available in Vitest node environment
**What goes wrong:** `session.ts` calls `await cookies()` from `next/headers`. In Vitest's `environment: 'node'`, this throws `Error: cookies() was called outside a request scope`.
**Why it happens:** `next/headers` relies on AsyncLocalStorage context that only exists during Next.js request handling.
**How to avoid:** Always mock `next/headers` before importing `session.ts`. Use `vi.mock('next/headers', ...)` at the module level (before any imports) or `vi.doMock` + `vi.resetModules` pattern.
**Warning signs:** Error message: "cookies() was called outside a request scope" or "Dynamic server usage"

### Pitfall 2: bcrypt performance in unit tests
**What goes wrong:** `api-key.ts::hashApiKey` uses `bcrypt.hash(key, 10)` — 10 salt rounds. Each hash takes ~100ms. A test file with 10+ creates = 1+ second just for bcrypt.
**Why it happens:** bcrypt is intentionally slow for security. Test environment doesn't exempt it.
**How to avoid:** Always mock `bcryptjs` in unit tests. Only use real bcrypt in integration-real tests where we want end-to-end validation.
**Warning signs:** Unit test suite taking >5 seconds for a single service file.

### Pitfall 3: Module cache not reset between tests
**What goes wrong:** Service or auth module imported once keeps its mocked dependencies across tests. Second test sees wrong mock values.
**Why it happens:** Node module cache. `vi.doMock` only works if module hasn't been imported yet in this test run.
**How to avoid:** Call `vi.resetModules()` in `beforeEach` before any `vi.doMock` calls, then dynamically import the module under test.
**Warning signs:** Tests pass individually but fail when run together; mock call counts accumulate across tests.

### Pitfall 4: Integration-real tests running without TEST_DATABASE_URL
**What goes wrong:** If `.env.test` is missing, `createTestDb()` throws. All integration-real tests fail with confusing errors.
**Why it happens:** `.env.test` is not committed to git (contains DB credentials).
**How to avoid:** Integration-real test files must check for `TEST_DATABASE_URL` and skip gracefully if missing. Use `vi.skipIf(!process.env.TEST_DATABASE_URL)`.
**Warning signs:** "TEST_DATABASE_URL not set" error on a fresh checkout.

```typescript
// Graceful skip pattern
const hasTestDb = !!process.env.TEST_DATABASE_URL
describe.skipIf(!hasTestDb)('ApiKeyService — real DB', () => { ... })
```

### Pitfall 5: FK violation during test data cleanup
**What goes wrong:** `DELETE FROM tenants WHERE id = TEST_TENANT_ID` fails because child rows exist (users, api_keys, activities, companies).
**Why it happens:** PostgreSQL FK constraints. Cascade delete must be manual unless the schema defines `ON DELETE CASCADE`.
**How to avoid:** Check schema for FK cascade settings. If not cascading, delete in correct order: activities → api_keys → companies → leads → users → tenants.
**Warning signs:** `violates foreign key constraint` error during afterAll cleanup.

### Pitfall 6: Tenant isolation false-positive — service missing tenantId filter
**What goes wrong:** A service query forgets `where(eq(table.tenantId, tenantId))`. Test passes because Tenant A and B both have no data, giving zero results for both.
**Why it happens:** Empty test DB makes filter absence invisible.
**How to avoid:** Always seed data for Tenant A *before* asserting Tenant B cannot see it. The test must prove isolation under positive data conditions.
**Warning signs:** Tenant isolation test passes even after removing the tenantId filter from the service.

---

## Code Examples

### Verified patterns from existing codebase

### Coverage threshold configuration
```typescript
// vitest.config.ts addition for 05-01
// Source: @vitest/coverage-v8 official docs
test: {
  coverage: {
    provider: 'v8',
    include: [
      'src/lib/auth/**/*.ts',
      'src/lib/services/api-key.service.ts',
      'src/lib/services/tenant.service.ts',
      'src/lib/services/email.service.ts',
      'src/lib/services/email-template.service.ts',
    ],
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 80,
    },
  },
}
```

### Fixture additions needed for 05-01
```typescript
// Extend src/__tests__/helpers/fixtures.ts
export const TEST_API_KEY_ID = '00000000-0000-0000-0000-000000000010'
export const TEST_TENANT_ID_B = '00000000-0000-0000-0000-000000000020'  // for isolation tests

export function apiKeyFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_API_KEY_ID,
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    name: 'Test API Key',
    keyHash: '$2a$10$mockedHash',
    keyPrefix: 'xkmu_abcde',
    permissions: ['*'],
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

export function tenantFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_TENANT_ID,
    name: 'Test Tenant GmbH',
    slug: 'test-tenant-gmbh',
    status: 'active',
    street: null,
    houseNumber: null,
    postalCode: null,
    city: null,
    country: 'DE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}
```

### withPermission() role matrix test pattern
```typescript
// Source: existing src/__tests__/unit/auth/require-permission.test.ts (expand this file)
const roleMatrix = [
  { role: 'owner', action: 'delete', expected: 200 },
  { role: 'admin', action: 'delete', expected: 200 },
  { role: 'member', action: 'delete', expected: 403 },
  { role: 'viewer', action: 'read', expected: 200 },
  { role: 'viewer', action: 'create', expected: 403 },
]

for (const { role, action, expected } of roleMatrix) {
  it(`role "${role}" ${action} → ${expected}`, async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    getAuthContextMock.mockResolvedValueOnce(makeAuthContext({ role, apiKeyPermissions: null }))
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'companies', action as Action, handler)
    expect(response.status).toBe(expected)
  })
}
```

---

## Service Inventory (Target for 80% Coverage)

### Services with ZERO existing tests (all targets for 05-01)

**`src/lib/services/api-key.service.ts`** — 82 lines
Methods: `create`, `getById`, `list`, `delete`, `updateLastUsed`
Dependencies to mock: `@/lib/db`, `@/lib/auth/api-key` (generateApiKey, hashApiKey)

**`src/lib/services/tenant.service.ts`** — 115 lines
Methods: `create`, `getById`, `getBySlug`, `update`, `delete`, `list`, `slugExists`
Dependencies to mock: `@/lib/db`
Note: `list()` uses `db.select().$dynamic()` — the mock-db chain manager supports `$dynamic` but verify the mock handles it.

**`src/lib/services/email.service.ts`** — 227 lines
Methods: `getConfig`, `createTransporter`, `send`, `isConfigured`, `sendWithTemplate`, `verifyConfig`
Dependencies to mock: `nodemailer`, `@/lib/db`, `@/lib/services/email-template.service` (for sendWithTemplate), env vars
Critical: `getConfig()` reads from `process.env` — set env vars in beforeEach, reset in afterEach.

**`src/lib/services/email-template.service.ts`** — methods: `list`, `getBySlug`, `getById`, `create`, `update`, `delete`, `applyPlaceholders`, `seedDefaults`
Dependencies to mock: `@/lib/db`

### Auth files with partial/no tests (targets for 05-01)

**`src/lib/auth/api-key.ts`** — 87 lines
Functions: `generateApiKey`, `hashApiKey`, `verifyApiKey`, `validateApiKey`, `getApiKeyFromRequest`, `requireApiKey`, `hasPermission`
Existing coverage: ZERO (note: `hasPermission` here is the api-key payload version, different from `permissions.ts::hasPermission`)
Dependencies to mock: `bcryptjs`, `@/lib/db`

**`src/lib/auth/session.ts`** — 82 lines
Functions: `createSession`, `getSession`, `deleteSession`, `requireSession`, `requireRole`
Dependencies to mock: `next/headers` (cookies), `jose` (SignJWT, jwtVerify), env `JWT_SECRET`

**`src/lib/auth/auth-context.ts`** — 44 lines
Function: `getAuthContext`
Dependencies to mock: `@/lib/auth/session` (getSession), `@/lib/auth/api-key` (getApiKeyFromRequest, validateApiKey)
Note: This is a small orchestrator — easy to test both session-auth and api-key-auth paths.

**`src/lib/auth/require-permission.ts`** — 65 lines (PARTIALLY tested)
Existing: 6 API-key scope tests exist in `src/__tests__/unit/auth/require-permission.test.ts`
Missing: Role-based permission matrix (owner/admin/member/viewer), roleId-based RBAC path, unauthenticated 401 path

**`src/lib/auth/permissions.ts`** — 41 lines
Functions: `getPermissionsForRole`, `hasPermission`
Dependencies to mock: `@/lib/db`

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual test data creation | `setupDbMock()` chain manager | Tests run without DB — fast, hermetic |
| `vi.mock()` at top level | `vi.doMock()` + `vi.resetModules()` | Correct isolation between tests |
| No coverage thresholds | `@vitest/coverage-v8` thresholds | Enforces 80% gate |

**Note on `.$dynamic()` in TenantService.list():** The `setupDbMock` chain manager creates chains with fixed methods (`from`, `where`, `values`, etc.). The `.$dynamic()` method used by TenantService is not in the default chain. The mock will need to be extended OR TenantService.list() should be tested via the route integration test pattern where the whole chain is mocked at the db level. Verify this before writing the test.

---

## Open Questions

1. **Does `setupDbMock` handle `.$dynamic()`?**
   - What we know: `mock-db.ts` chain methods are: `from, where, values, returning, limit, offset, orderBy, set, leftJoin, innerJoin, groupBy`. No `$dynamic`.
   - What's unclear: Will `TenantService.list()` throw when calling `.$dynamic()` on the mock?
   - Recommendation: Add `$dynamic: vi.fn().mockImplementation(() => chain)` to `createChainMockManager` in `mock-db.ts`, OR test the list/filter path in integration-real tests instead of unit tests.

2. **Can integration-real tests run against the Neon dev DB safely?**
   - What we know: `.env` DATABASE_URL points to Neon. No separate test DB exists. No local PostgreSQL is running.
   - What's unclear: Will test tenant cleanup always run (even on test failure)?
   - Recommendation: Use `try/finally` in `afterAll` for cleanup. Use fixed reserved tenant UUIDs so a manual cleanup query is always possible. Document in test file that `.env.test` is required.

3. **Does `vitest --coverage` include only specified files or the whole project?**
   - What we know: Default coverage includes all files under the `include` glob. Without `coverage.include` config, 80% across all 70 services is unachievable.
   - What's unclear: Whether the current `vitest.config.ts` already scopes coverage.
   - Recommendation: Add explicit `coverage.include` for the four target areas in vitest.config.ts as part of 05-01.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @vitest/coverage-v8 4.1.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R3.3 | ApiKeyService CRUD | unit | `npm run test:unit -- api-key.service` | ❌ Wave 0 |
| R3.3 | TenantService CRUD | unit | `npm run test:unit -- tenant.service` | ❌ Wave 0 |
| R3.3 | EmailService send/config | unit | `npm run test:unit -- email.service` | ❌ Wave 0 |
| R3.3 | EmailTemplateService CRUD | unit | `npm run test:unit -- email-template.service` | ❌ Wave 0 |
| R3.3 | auth/api-key.ts functions | unit | `npm run test:unit -- unit/auth/api-key` | ❌ Wave 0 |
| R3.3 | session.ts create/get/delete | unit | `npm run test:unit -- unit/auth/session` | ❌ Wave 0 |
| R3.3 | auth-context.ts two auth paths | unit | `npm run test:unit -- unit/auth/auth-context` | ❌ Wave 0 |
| R3.3 | withPermission role matrix | unit | `npm run test:unit -- unit/auth/require-permission` | ✅ partial |
| R3.3 | 80% coverage gate | coverage | `npm run test:coverage` | ❌ config change |
| R3.3 | Real-DB api-key create+validate | integration | `vitest run src/__tests__/integration-real` | ❌ Wave 0 |
| R3.4 | Login/logout/register flow | integration | `vitest run src/__tests__/integration-real/auth-flow` | ❌ Wave 0 |
| R3.4 | Tenant A/B isolation | integration | `vitest run src/__tests__/integration-real/tenant-isolation` | ❌ Wave 0 |
| R3.4 | CRUD companies real DB | integration | `vitest run src/__tests__/integration-real/crud/companies` | ❌ Wave 0 |
| R3.4 | CRUD leads real DB | integration | `vitest run src/__tests__/integration-real/crud/leads` | ❌ Wave 0 |
| R3.4 | CRUD users real DB | integration | `vitest run src/__tests__/integration-real/crud/users` | ❌ Wave 0 |
| R3.4 | Permission-check matrix real | integration | `vitest run src/__tests__/integration-real/permission-checks` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit` (fast, no DB required)
- **Per wave merge:** `npm run test:coverage` (includes coverage threshold gate)
- **Phase gate:** Full suite green + coverage ≥ 80% for target areas before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/unit/auth/api-key.test.ts` — covers R3.3 auth/api-key functions
- [ ] `src/__tests__/unit/auth/session.test.ts` — covers R3.3 session management
- [ ] `src/__tests__/unit/auth/auth-context.test.ts` — covers R3.3 auth-context orchestration
- [ ] `src/__tests__/unit/services/api-key.service.test.ts` — covers R3.3 ApiKeyService
- [ ] `src/__tests__/unit/services/tenant.service.test.ts` — covers R3.3 TenantService
- [ ] `src/__tests__/unit/services/email.service.test.ts` — covers R3.3 EmailService
- [ ] `src/__tests__/unit/services/email-template.service.test.ts` — covers R3.3 EmailTemplateService
- [ ] `src/__tests__/integration-real/setup/test-db.ts` — shared real-DB seed/cleanup helper
- [ ] `src/__tests__/integration-real/auth-flow.test.ts` — R3.4 login flow
- [ ] `src/__tests__/integration-real/tenant-isolation.test.ts` — R3.3 + R3.4 isolation
- [ ] `src/__tests__/integration-real/api-key-scoping.test.ts` — R3.3 real key lifecycle
- [ ] `src/__tests__/integration-real/crud/companies.test.ts` — R3.4 CRUD module 1
- [ ] `src/__tests__/integration-real/crud/leads.test.ts` — R3.4 CRUD module 2
- [ ] `src/__tests__/integration-real/crud/users.test.ts` — R3.4 CRUD module 3
- [ ] `src/__tests__/integration-real/permission-checks.test.ts` — R3.4 permission matrix
- [ ] `vitest.config.ts` update — add `coverage.include` and `coverage.thresholds`
- [ ] `.env.test` (user must create, not committed) — `TEST_DATABASE_URL`, `JWT_SECRET`

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all service files read and analyzed
- `src/__tests__/` directory — all existing test patterns verified by reading source
- `vitest.config.ts` — confirmed Vitest 4.1 + node environment + setupFiles

### Secondary (MEDIUM confidence)
- `.env` — confirmed Neon (cloud PostgreSQL) as the available DB for integration tests
- `docker-compose.yml` — confirmed postgres:16-alpine image in dev stack, but container not running locally
- `package.json` test scripts — confirmed exact npm test commands

### Tertiary (LOW confidence)
- `.$dynamic()` behavior with `setupDbMock` — not verified by running tests; inferred from mock-db.ts source inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed, versions confirmed
- Architecture: HIGH — patterns directly verified from existing test files
- Pitfalls: HIGH — `next/headers` and bcrypt issues are well-documented Node.js test patterns; .$dynamic() gap found by code inspection
- Integration-real approach: MEDIUM — approach is sound but Neon test isolation not battle-tested; FK cleanup order depends on schema constraints not fully read

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack, no fast-moving dependencies)
