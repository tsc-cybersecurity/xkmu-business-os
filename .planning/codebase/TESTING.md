# Testing Patterns

**Analysis Date:** 2026-04-13

## Test Framework

**Runner:**
- Vitest v4.1.0
- Config: `vitest.config.ts` at project root
- Environment: Node.js (not browser)

**Assertion Library:**
- Vitest built-in expect API (compatible with Jest)
- No separate assertion library needed

**Test Commands:**
```bash
npm run test              # Run all tests once
npm run test:unit        # Run only unit tests in src/__tests__/unit
npm run test:integration # Run only integration tests in src/__tests__/integration
npm run test:watch       # Watch mode - reruns on file changes
npm run test:coverage    # Generate coverage report (uses @vitest/coverage-v8)
```

## Test File Organization

**Location:**
- Co-located under `src/__tests__/` directory
- Two main categories:
  - `src/__tests__/unit/` - Unit tests for services, utilities, auth
  - `src/__tests__/integration/` - Integration tests using mocked DB
  - `src/__tests__/integration-real/` - Real database tests (skipped if `TEST_DATABASE_URL` not set)
- Test files matched to source structure: `src/lib/services/activity.service.ts` → `src/__tests__/unit/services/activity.service.test.ts`

**Naming:**
- Pattern: `{module-or-feature}.test.ts`
- Examples: `auth-key.test.ts`, `activity.service.test.ts`, `companies.route.test.ts`

**Structure:**
```
src/__tests__/
├── unit/                          # Unit tests (no DB)
│   ├── auth/
│   │   ├── api-key.test.ts
│   │   └── require-permission.test.ts
│   ├── services/
│   │   ├── activity.service.test.ts
│   │   ├── ai.service.test.ts
│   │   └── ...
│   └── proxy.test.ts
├── integration/                   # Integration tests (mocked DB)
│   └── api/
│       ├── auth.route.test.ts
│       ├── companies.route.test.ts
│       └── ...
├── integration-real/              # Real database tests
│   ├── crud/
│   │   ├── companies.test.ts
│   │   ├── leads.test.ts
│   │   └── users.test.ts
│   ├── api-key-scoping.test.ts
│   ├── auth-flow.test.ts
│   ├── permission-checks.test.ts
│   ├── tenant-isolation.test.ts
│   └── setup/
│       └── test-db.ts             # Real DB helpers
├── helpers/                       # Shared test utilities
│   ├── fixtures.ts                # Test data constants
│   ├── mock-db.ts                 # DB mocking helper
│   ├── mock-auth.ts               # Auth mocking helper
│   ├── mock-request.ts            # HTTP request mocking helper
│   └── ...
└── setup.ts                       # Global test setup (beforeEach hooks)
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID, TEST_USER_ID } from '../../helpers/fixtures'

describe('auth/api-key module', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getModule() {
    return import('@/lib/auth/api-key')
  }

  describe('generateApiKey', () => {
    it('returns key starting with xkmu_', async () => {
      const mod = await getModule()
      const { key } = mod.generateApiKey()
      expect(key).toMatch(/^xkmu_/)
    })
  })
})
```

**Key patterns:**

1. **Module resetting:** `vi.resetModules()` in `beforeEach()` to clear module cache between tests
2. **Lazy module loading:** `const mod = await import('@/module-path')` allows fresh module with fresh mocks
3. **Fixture pattern:** Create fixture factory functions that return test data with optional overrides:
```typescript
function apiKeyRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_KEY_ID,
    tenantId: TEST_TENANT_ID,
    // ... default values
    ...overrides,
  }
}
```

4. **Arrange-Act-Assert:** Clear separation:
```typescript
it('updates lastUsedAt after successful validation', async () => {
  // Arrange
  const row = apiKeyRowFixture()
  dbMock.mockSelect.mockResolvedValue([row])
  dbMock.mockUpdate.mockResolvedValue([])

  // Act
  const mod = await getModule()
  await mod.validateApiKey('xkmu_abcde12345')

  // Assert
  expect(dbMock.db.update).toHaveBeenCalled()
})
```

## Mocking

**Framework:** Vitest's built-in `vi` module

**Patterns:**

1. **Module mocking:** `vi.doMock()` for complete module replacement:
```typescript
vi.doMock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$mockhashedvalue'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))
```

2. **Function mocking:** `vi.fn()` for individual functions:
```typescript
const mockGetSession = vi.fn()
const mockCreateSession = vi.fn().mockResolvedValue(undefined)
```

3. **Mock chaining:** `mockResolvedValue()` and `mockResolvedValueOnce()` for sequential responses:
```typescript
dbMock.mockSelect.mockResolvedValueOnce(fixtures)  // First call
dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])  // Second call
```

4. **DB mocking helper** from `src/__tests__/helpers/mock-db.ts`:
```typescript
function setupDbMock() {
  const insertMock = createChainMockManager()
  const selectMock = createChainMockManager()
  const updateMock = createChainMockManager()
  const deleteMock = createChainMockManager()

  const db = {
    insert: vi.fn().mockImplementation(() => insertMock.createFreshChain()),
    select: vi.fn().mockImplementation(() => selectMock.createFreshChain()),
    update: vi.fn().mockImplementation(() => updateMock.createFreshChain()),
    delete: vi.fn().mockImplementation(() => deleteMock.createFreshChain()),
  }

  vi.doMock('@/lib/db', () => ({ db }))

  return {
    db,
    mockInsert: insertMock,
    mockSelect: selectMock,
    mockUpdate: updateMock,
    mockDelete: deleteMock,
  }
}
```

5. **Request mocking helper** - `createTestRequest()` creates fake Next.js Request objects:
```typescript
const req = createTestRequest('POST', '/api/v1/auth/login', {
  email: 'admin@test.de',
  password: 'Password123!',
})
const res = await handler(req)
const body = await res.json()
```

**What to Mock:**
- External dependencies (bcrypt, email, AI providers)
- Database operations (use DB mock helper)
- HTTP requests (use request mock helper)
- Session/auth (use auth mock helper)
- Time-dependent code (use vi.useFakeTimers() if needed)

**What NOT to Mock:**
- Internal service logic (test actual implementation)
- Validation schemas (let Zod validate actual behavior)
- Error handling paths (verify actual error responses)
- Business logic flows (test real interactions between modules)

## Fixtures and Factories

**Test Data:**
```typescript
// From src/__tests__/helpers/fixtures.ts
export const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000002'
export const TEST_COMPANY_ID = '00000000-0000-0000-0000-000000000003'
export const TEST_KEY_ID = '00000000-0000-0000-0000-000000000060'

// Fixture factory pattern
function activityFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ACTIVITY_ID,
    tenantId: TEST_TENANT_ID,
    leadId: null,
    type: 'note',
    subject: 'Test Subject',
    content: 'Test Content',
    metadata: {},
    userId: TEST_USER_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}
```

**Location:**
- Global fixtures: `src/__tests__/helpers/fixtures.ts` (TEST_TENANT_ID, TEST_USER_ID, etc.)
- Local fixtures: Defined at top of test file using factory functions
- Database setup helpers: `src/__tests__/integration-real/setup/test-db.ts`

**Factory Functions:**
- Accept optional `overrides` object for flexible test data
- Return complete, realistic test data
- Multiple variants for different scenarios (e.g., `activityFixture` and `activityWithUserFixture`)

## Coverage

**Requirements:** Not enforced (no coverage threshold in vitest.config)

**View Coverage:**
```bash
npm run test:coverage
```

Coverage report generated by `@vitest/coverage-v8`. Results typically displayed in terminal and written to coverage directory.

## Test Types

**Unit Tests:**
- Located: `src/__tests__/unit/`
- Scope: Single function or module in isolation
- Mocks: All external dependencies (DB, HTTP, crypto)
- Speed: Fast (milliseconds per test)
- Example: `src/__tests__/unit/auth/api-key.test.ts` tests `generateApiKey()`, `hashApiKey()`, `validateApiKey()` functions in isolation
- No database calls; all I/O is mocked

**Integration Tests (Mocked DB):**
- Located: `src/__tests__/integration/`
- Scope: API routes with mocked database
- Mocks: Database via `setupDbMock()`, auth sessions via `vi.doMock()`
- Speed: Fast (uses mocks)
- Example: `src/__tests__/integration/api/auth.route.test.ts` tests complete auth flow with mocked DB
- Verifies integration between route handler → service → mock DB

**Integration Tests (Real DB):**
- Located: `src/__tests__/integration-real/`
- Scope: CRUD operations and business logic with actual database
- Mocks: Nothing - uses real test database
- Speed: Slower (database I/O)
- Skipped by default: Only runs if `TEST_DATABASE_URL` environment variable is set
- Example: `src/__tests__/integration-real/crud/companies.test.ts` creates, reads, updates, deletes real database records
- Includes lifecycle: `beforeAll()` for setup, `afterAll()` for cleanup

**E2E Tests:**
- Not detected in codebase
- Not currently used

## Common Patterns

**Async Testing:**
```typescript
describe('validateApiKey', () => {
  it('returns ApiKeyPayload with permissions when key is valid', async () => {
    const row = apiKeyRowFixture({ permissions: ['*'] })
    dbMock.mockSelect.mockResolvedValue([row])
    dbMock.mockUpdate.mockResolvedValue([])

    const mod = await getModule()
    const result = await mod.validateApiKey('xkmu_abcde12345')

    expect(result).not.toBeNull()
    expect(result?.permissions).toEqual(['*'])
  })
})
```
- Use `async/await` syntax
- `mockResolvedValue()` for promises
- `mockResolvedValueOnce()` for sequential promise calls

**Error Testing:**
```typescript
it('returns null when key does not start with xkmu_', async () => {
  const mod = await getModule()
  const result = await mod.validateApiKey('invalid_key_format')
  expect(result).toBeNull()
})

it('returns false for wrong key', async () => {
  const bcrypt = await import('bcryptjs')
  vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as unknown as void)

  const mod = await getModule()
  const result = await mod.verifyApiKey('xkmu_wrongkey', '$2a$10$mockhashedvalue')
  expect(result).toBe(false)
})
```
- Test null/falsy returns for error conditions
- Mock specific behavior for negative cases
- Verify error messages are sensible (use `expect(body.error.message).toContain(...)`

**Pagination Testing:**
```typescript
it('returns paginated results with meta', async () => {
  dbMock.mockSelect.mockResolvedValueOnce(fixtures)
  dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])

  const service = await getService()
  const result = await service.list(TEST_TENANT_ID)

  expect(result.items).toHaveLength(2)
  expect(result.meta.total).toBe(2)
  expect(result.meta.page).toBe(1)
  expect(result.meta.limit).toBe(50)
  expect(result.meta.totalPages).toBe(1)
})
```
- Mock select queries twice: once for items, once for count
- Verify both items and metadata in response

**Tenant Isolation Testing (Real DB):**
```typescript
it('getById() returns null for wrong tenantId (isolation check)', async () => {
  const { CompanyService } = await import('@/lib/services/company.service')
  const notFound = await CompanyService.getById('00000000-0000-0000-0000-000000000099', createdId)
  expect(notFound).toBeNull()
})
```
- Real DB tests include tenant isolation verification
- Ensures service methods check `tenantId` in queries
- Prevents cross-tenant data leaks

**Setup and Teardown (Real DB):**
```typescript
describe.skipIf(!hasTestDb)('CRUD: Companies — real DB', () => {
  let db: TestDb
  let createdId: string

  beforeAll(async () => {
    db = createTestDb()
    await seedTestTenant(db, TEST_INTEGRATION_TENANT_A)
  })

  afterAll(async () => {
    try {
      await cleanupTestTenant(db, TEST_INTEGRATION_TENANT_A)
    } finally {
      // always runs cleanup
    }
  })
})
```
- Use `beforeAll()` to initialize test database and seed data
- Use `afterAll()` with try/finally to guarantee cleanup runs
- `describe.skipIf(!hasTestDb)` skips test suite if real DB not available

---

*Testing analysis: 2026-04-13*
