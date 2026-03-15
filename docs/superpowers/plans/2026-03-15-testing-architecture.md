# Testing Architecture Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Vitest testing infrastructure and implement comprehensive tests for the Companies module as a reusable reference.

**Architecture:** Vitest with mocked Drizzle DB and auth layers. Tests split into unit (services, validation) and integration (API routes). Shared test helpers provide mock factories for DB, auth, requests, and fixtures.

**Tech Stack:** Vitest, Next.js 16 App Router, Drizzle ORM, Zod, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-15-testing-architecture-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `vitest.config.ts` | Vitest configuration with path aliases |
| Create | `src/__tests__/setup.ts` | Global test setup (mock resets) |
| Create | `src/__tests__/helpers/mock-db.ts` | Drizzle DB mock with chainable builders |
| Create | `src/__tests__/helpers/mock-auth.ts` | withPermission mock utilities |
| Create | `src/__tests__/helpers/mock-request.ts` | NextRequest builder |
| Create | `src/__tests__/helpers/fixtures.ts` | Test data factories |
| Create | `src/__tests__/unit/validation/company.validation.test.ts` | Zod schema tests |
| Create | `src/__tests__/unit/services/company.service.test.ts` | Service unit tests |
| Create | `src/__tests__/integration/api/companies.route.test.ts` | API route tests |
| Modify | `package.json` | Add vitest dependency and test scripts |

---

## Chunk 1: Infrastructure Setup

### Task 1: Install Vitest and configure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Create setup.ts**

```typescript
import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.restoreAllMocks()
})
```

- [ ] **Step 4: Add test scripts to package.json**

Add to `scripts` in `package.json`:

```json
"test": "vitest run",
"test:unit": "vitest run src/__tests__/unit",
"test:integration": "vitest run src/__tests__/integration",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 5: Verify vitest runs (no tests yet)**

```bash
npx vitest run
```

Expected: "No test files found" or similar clean exit.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/__tests__/setup.ts package.json package-lock.json
git commit -m "chore: add vitest test infrastructure"
```

---

### Task 2: Create test helpers - fixtures

**Files:**
- Create: `src/__tests__/helpers/fixtures.ts`

- [ ] **Step 1: Create fixtures.ts**

```typescript
import type { AuthContext } from '@/lib/auth/auth-context'

// Stable UUIDs for test consistency
export const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000002'
export const TEST_COMPANY_ID = '00000000-0000-0000-0000-000000000003'

export function authFixture(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    role: 'admin',
    roleId: null,
    ...overrides,
  }
}

export function companyFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_COMPANY_ID,
    tenantId: TEST_TENANT_ID,
    name: 'Test GmbH',
    legalForm: 'GmbH',
    street: 'Teststraße',
    houseNumber: '42',
    postalCode: '12345',
    city: 'Berlin',
    country: 'DE',
    phone: '+49 30 12345678',
    email: 'info@test-gmbh.de',
    website: 'https://test-gmbh.de',
    industry: 'IT',
    employeeCount: 25,
    annualRevenue: '1000000.00',
    vatId: 'DE123456789',
    status: 'prospect',
    tags: [],
    notes: null,
    customFields: {},
    createdBy: TEST_USER_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

export function createCompanyInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test GmbH',
    city: 'Berlin',
    country: 'DE',
    status: 'prospect',
    ...overrides,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/__tests__/helpers/fixtures.ts
git commit -m "test: add test data fixtures"
```

---

### Task 3: Create test helpers - mock-db

**Files:**
- Create: `src/__tests__/helpers/mock-db.ts`

This is the most complex helper. It mocks `@/lib/db` so that `db.insert()`, `db.select()`, `db.update()`, `db.delete()` return chainable builders that resolve to configurable values.

- [ ] **Step 1: Create mock-db.ts**

```typescript
import { vi } from 'vitest'

/**
 * Manages resolve values for a Drizzle operation (insert/select/update/delete).
 * Each call to the db operation creates a FRESH chain that resolves independently.
 * This is critical for methods like `list()` that call `Promise.all` with
 * two concurrent `db.select()` calls (items + count).
 */
function createChainMockManager() {
  let defaultResolveValue: unknown = []
  const resolveQueue: unknown[] = []

  function createFreshChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {}

    const chainMethods = [
      'from', 'where', 'values', 'returning', 'limit',
      'offset', 'orderBy', 'set', 'leftJoin', 'innerJoin',
    ]

    for (const method of chainMethods) {
      chain[method] = vi.fn().mockImplementation(() => chain)
    }

    // Capture resolve value at chain creation time
    const myResolveValue = resolveQueue.length > 0
      ? resolveQueue.shift()
      : defaultResolveValue

    chain.then = function (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(myResolveValue).then(onFulfilled, onRejected)
    }

    return chain
  }

  return {
    createFreshChain,
    /** Set what awaiting any new chain resolves to by default */
    mockResolvedValue(value: unknown) {
      defaultResolveValue = value
    },
    /** Queue a one-time resolved value (consumed by next chain creation) */
    mockResolvedValueOnce(value: unknown) {
      resolveQueue.push(value)
    },
  }
}

export function setupDbMock() {
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

- [ ] **Step 2: Commit**

```bash
git add src/__tests__/helpers/mock-db.ts
git commit -m "test: add Drizzle DB mock helper"
```

---

### Task 4: Create test helpers - mock-auth and mock-request

**Files:**
- Create: `src/__tests__/helpers/mock-auth.ts`
- Create: `src/__tests__/helpers/mock-request.ts`

- [ ] **Step 1: Create mock-auth.ts**

```typescript
import { vi } from 'vitest'
import type { AuthContext } from '@/lib/auth/auth-context'
import { authFixture } from './fixtures'

/**
 * Mocks withPermission to call the handler directly with the given auth context.
 * Pass `null` to simulate 401 Unauthorized.
 */
export function mockAuthContext(auth: AuthContext | null) {
  vi.doMock('@/lib/auth/require-permission', () => ({
    withPermission: vi.fn().mockImplementation(
      async (
        _request: unknown,
        _module: string,
        _action: string,
        handler: (auth: AuthContext) => Promise<Response>,
      ) => {
        if (!auth) {
          return Response.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
            { status: 401 },
          )
        }
        return handler(auth)
      },
    ),
  }))
}

/**
 * Mocks withPermission to return 403 Forbidden.
 */
export function mockAuthForbidden() {
  vi.doMock('@/lib/auth/require-permission', () => ({
    withPermission: vi.fn().mockImplementation(async () => {
      return Response.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403 },
      )
    }),
  }))
}

/**
 * Convenience: mock auth with default admin context.
 */
export function mockAuthAdmin() {
  mockAuthContext(authFixture())
}
```

- [ ] **Step 2: Create mock-request.ts**

```typescript
import { NextRequest } from 'next/server'

/**
 * Builds a NextRequest for testing API route handlers.
 */
export function createTestRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
): NextRequest {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`
  const init: RequestInit = { method }

  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return new NextRequest(fullUrl, init)
}

/**
 * Creates route params matching Next.js 16 pattern: Promise<{ id: string }>
 */
export function createTestParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/helpers/mock-auth.ts src/__tests__/helpers/mock-request.ts
git commit -m "test: add auth and request mock helpers"
```

---

## Chunk 2: Zod Validation Tests

### Task 5: Company schema validation tests

**Files:**
- Create: `src/__tests__/unit/validation/company.validation.test.ts`
- Reference: `src/lib/utils/validation.ts:111-141`

- [ ] **Step 1: Write validation tests**

```typescript
import { describe, it, expect } from 'vitest'
import { createCompanySchema, updateCompanySchema } from '@/lib/utils/validation'

describe('createCompanySchema', () => {
  it('accepts valid minimal input', () => {
    const result = createCompanySchema.safeParse({ name: 'Test GmbH' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Test GmbH')
      expect(result.data.country).toBe('DE')
      expect(result.data.status).toBe('prospect')
      expect(result.data.tags).toEqual([])
      expect(result.data.customFields).toEqual({})
    }
  })

  it('accepts valid full input', () => {
    const result = createCompanySchema.safeParse({
      name: 'Muster AG',
      legalForm: 'AG',
      street: 'Hauptstraße',
      houseNumber: '1a',
      postalCode: '80331',
      city: 'München',
      country: 'DE',
      phone: '+49 89 12345',
      email: 'info@muster.de',
      website: 'https://muster.de',
      industry: 'Consulting',
      employeeCount: 50,
      annualRevenue: 5000000,
      vatId: 'DE987654321',
      status: 'customer',
      tags: ['premium', 'enterprise'],
      notes: 'Important client',
      customFields: { sector: 'B2B' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createCompanySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 255 chars', () => {
    const result = createCompanySchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts empty string email', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', email: '' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid website URL', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', website: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('rejects website URL exceeding 255 chars', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(240)
    const result = createCompanySchema.safeParse({ name: 'Test', website: longUrl })
    expect(result.success).toBe(false)
  })

  it('rejects negative employee count', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', employeeCount: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects country exceeding 2 chars', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', country: 'DEU' })
    expect(result.success).toBe(false)
  })

  it('defaults country to DE', () => {
    const result = createCompanySchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.country).toBe('DE')
  })

  it('defaults status to prospect', () => {
    const result = createCompanySchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('prospect')
  })

  it('defaults tags to empty array', () => {
    const result = createCompanySchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.tags).toEqual([])
  })

  it('rejects invalid status', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', status: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('accepts custom fields', () => {
    const result = createCompanySchema.safeParse({
      name: 'Test',
      customFields: { key: 'value', nested: { a: 1 } },
    })
    expect(result.success).toBe(true)
  })

  it('accepts null employeeCount', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', employeeCount: null })
    expect(result.success).toBe(true)
  })

  it('accepts null annualRevenue', () => {
    const result = createCompanySchema.safeParse({ name: 'Test', annualRevenue: null })
    expect(result.success).toBe(true)
  })
})

describe('updateCompanySchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateCompanySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateCompanySchema.safeParse({ name: 'New Name', city: 'Hamburg' })
    expect(result.success).toBe(true)
  })

  it('still validates field constraints', () => {
    const result = updateCompanySchema.safeParse({ name: 'A'.repeat(256) })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/__tests__/unit/validation
```

Expected: All 18 tests pass. These test Zod schemas directly - no mocking needed.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/unit/validation/company.validation.test.ts
git commit -m "test: add company Zod schema validation tests"
```

---

## Chunk 3: Service Unit Tests

### Task 6: Company service unit tests

**Files:**
- Create: `src/__tests__/unit/services/company.service.test.ts`
- Reference: `src/lib/services/company.service.ts`

- [ ] **Step 1: Write service tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { companyFixture, TEST_TENANT_ID, TEST_COMPANY_ID, TEST_USER_ID } from '../../helpers/fixtures'

// Mock webhook service (fire-and-forget side effect)
vi.mock('@/lib/services/webhook.service', () => ({
  WebhookService: { fire: vi.fn().mockResolvedValue(undefined) },
}))

describe('CompanyService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/company.service')
    return mod.CompanyService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a company and returns it', async () => {
      const fixture = companyFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        name: 'Test GmbH',
        city: 'Berlin',
      }, TEST_USER_ID)

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('converts empty strings to null', async () => {
      const fixture = companyFixture({ legalForm: null, street: null })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        name: 'Test',
        legalForm: '',
        street: '',
      })

      expect(result.legalForm).toBeNull()
      expect(result.street).toBeNull()
    })

    it('sets default country to DE', async () => {
      const fixture = companyFixture({ country: 'DE' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, { name: 'Test' })

      expect(result.country).toBe('DE')
    })

    it('sets default status to prospect', async () => {
      const fixture = companyFixture({ status: 'prospect' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, { name: 'Test' })

      expect(result.status).toBe('prospect')
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns company when found', async () => {
      const fixture = companyFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, TEST_COMPANY_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns company', async () => {
      const fixture = companyFixture({ name: 'Updated GmbH' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_COMPANY_ID, {
        name: 'Updated GmbH',
      })

      expect(result).toEqual(fixture)
      expect(result!.name).toBe('Updated GmbH')
    })

    it('converts annualRevenue number to string', async () => {
      const fixture = companyFixture({ annualRevenue: '500000.00' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_COMPANY_ID, {
        annualRevenue: 500000,
      })

      expect(result).toBeDefined()
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, 'nonexistent', { name: 'X' })

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_COMPANY_ID }])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, TEST_COMPANY_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with meta', async () => {
      const fixtures = [companyFixture(), companyFixture({ id: '00000000-0000-0000-0000-000000000004', name: 'Other GmbH' })]

      // First call: items, second call: count
      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 2 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
      expect(result.meta.totalPages).toBe(1)
    })

    it('uses default page=1 and limit=20', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 50 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID, { page: 3, limit: 10 })

      expect(result.meta.page).toBe(3)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(5)
    })

    it('passes status filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { status: 'customer' })

      // Verify db.select was called (filter applied internally via Drizzle where clause)
      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes search filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { search: 'Test' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes tags filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { tags: ['premium'] })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })
  })

  // ---- search ----

  describe('search', () => {
    it('returns matching companies', async () => {
      const fixture = companyFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.search(TEST_TENANT_ID, 'Test')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test GmbH')
    })

    it('returns empty array for empty query', async () => {
      const service = await getService()
      const result = await service.search(TEST_TENANT_ID, '   ')

      expect(result).toEqual([])
      // Should not hit DB
      expect(dbMock.db.select).not.toHaveBeenCalled()
    })
  })

  // ---- addTag ----

  describe('addTag', () => {
    it('adds tag to company', async () => {
      const fixture = companyFixture({ tags: [] })
      const updated = companyFixture({ tags: ['new-tag'] })

      // getById select
      dbMock.mockSelect.mockResolvedValue([fixture])
      // update
      dbMock.mockUpdate.mockResolvedValue([updated])

      const service = await getService()
      const result = await service.addTag(TEST_TENANT_ID, TEST_COMPANY_ID, 'new-tag')

      expect(result!.tags).toContain('new-tag')
    })

    it('does not duplicate existing tag', async () => {
      const fixture = companyFixture({ tags: ['existing'] })
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.addTag(TEST_TENANT_ID, TEST_COMPANY_ID, 'existing')

      expect(result).toEqual(fixture)
      expect(dbMock.db.update).not.toHaveBeenCalled()
    })

    it('returns null if company not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.addTag(TEST_TENANT_ID, 'nonexistent', 'tag')

      expect(result).toBeNull()
    })
  })

  // ---- removeTag ----

  describe('removeTag', () => {
    it('removes tag from company', async () => {
      const fixture = companyFixture({ tags: ['keep', 'remove'] })
      const updated = companyFixture({ tags: ['keep'] })

      dbMock.mockSelect.mockResolvedValue([fixture])
      dbMock.mockUpdate.mockResolvedValue([updated])

      const service = await getService()
      const result = await service.removeTag(TEST_TENANT_ID, TEST_COMPANY_ID, 'remove')

      expect(result!.tags).toEqual(['keep'])
    })

    it('returns null if company not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.removeTag(TEST_TENANT_ID, 'nonexistent', 'tag')

      expect(result).toBeNull()
    })
  })

  // ---- getPersons ----

  describe('getPersons', () => {
    it('returns persons for company', async () => {
      const person = { id: 'p1', firstName: 'Max', lastName: 'Mustermann', tenantId: TEST_TENANT_ID, companyId: TEST_COMPANY_ID }
      dbMock.mockSelect.mockResolvedValue([person])

      const service = await getService()
      const result = await service.getPersons(TEST_TENANT_ID, TEST_COMPANY_ID)

      expect(result).toHaveLength(1)
      expect(result[0].firstName).toBe('Max')
    })

    it('returns empty array when no persons', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getPersons(TEST_TENANT_ID, TEST_COMPANY_ID)

      expect(result).toEqual([])
    })
  })

  // ---- checkDuplicate ----

  describe('checkDuplicate', () => {
    it('finds duplicate by name (case-insensitive)', async () => {
      const fixture = companyFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.checkDuplicate(TEST_TENANT_ID, 'test gmbh')

      expect(result).toEqual(fixture)
    })

    it('finds duplicate by website domain', async () => {
      const fixture = companyFixture()
      // First select (by name) returns nothing
      dbMock.mockSelect.mockResolvedValueOnce([])
      // Second select (by domain) returns match
      dbMock.mockSelect.mockResolvedValueOnce([fixture])

      const service = await getService()
      const result = await service.checkDuplicate(TEST_TENANT_ID, 'Other Name', 'https://test-gmbh.de')

      expect(result).toEqual(fixture)
    })

    it('returns null when no duplicate', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.checkDuplicate(TEST_TENANT_ID, 'Unique Corp')

      expect(result).toBeNull()
    })

    it('handles invalid URL gracefully', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.checkDuplicate(TEST_TENANT_ID, 'Test', ':::invalid')

      expect(result).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/__tests__/unit/services
```

Expected: All ~25 tests pass.

- [ ] **Step 3: Fix any mock chain issues**

The Drizzle chain mock might need adjustments if `from()`, `where()` etc. need specific return shapes. Debug any failures by checking what methods the service actually calls on the chain.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/unit/services/company.service.test.ts
git commit -m "test: add company service unit tests"
```

---

## Chunk 4: API Route Integration Tests

### Task 7: Companies API route tests

**Files:**
- Create: `src/__tests__/integration/api/companies.route.test.ts`
- Reference: `src/app/api/v1/companies/route.ts`
- Reference: `src/app/api/v1/companies/[id]/route.ts`

- [ ] **Step 1: Write API route tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext, mockAuthForbidden } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import {
  authFixture,
  companyFixture,
  createCompanyInput,
  TEST_TENANT_ID,
  TEST_COMPANY_ID,
} from '../../helpers/fixtures'

// Mock webhook service
vi.mock('@/lib/services/webhook.service', () => ({
  WebhookService: { fire: vi.fn().mockResolvedValue(undefined) },
}))

describe('POST /api/v1/companies', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/route')
    return mod.POST
  }

  it('returns 201 with valid data', async () => {
    const fixture = companyFixture()
    // checkDuplicate: no match
    dbMock.mockSelect.mockResolvedValue([])
    // create: returns new company
    dbMock.mockInsert.mockResolvedValue([fixture])

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Test GmbH')
  })

  it('returns 400 with invalid data', async () => {
    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', {})
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 409 when duplicate detected', async () => {
    const existing = companyFixture()
    dbMock.mockSelect.mockResolvedValue([existing])

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error.code).toBe('DUPLICATE_COMPANY')
  })

  it('calls WebhookService.fire on success', async () => {
    const fixture = companyFixture()
    dbMock.mockSelect.mockResolvedValue([])
    dbMock.mockInsert.mockResolvedValue([fixture])

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    await handler(req)

    const { WebhookService } = await import('@/lib/services/webhook.service')
    expect(WebhookService.fire).toHaveBeenCalled()
  })

  it('returns 401 without auth', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(null)

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    const res = await handler(req)

    expect(res.status).toBe(401)
  })

  it('returns 403 as viewer', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthForbidden()

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    const res = await handler(req)

    expect(res.status).toBe(403)
  })
})

describe('GET /api/v1/companies', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/route')
    return mod.GET
  }

  it('returns 200 with paginated list', async () => {
    const fixtures = [companyFixture()]
    dbMock.mockSelect.mockResolvedValueOnce(fixtures)
    dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/companies')
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.meta.total).toBe(1)
  })

  it('returns 401 without auth', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(null)

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/companies')
    const res = await handler(req)

    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/companies/[id]', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/[id]/route')
    return mod.GET
  }

  it('returns 200 with company', async () => {
    dbMock.mockSelect.mockResolvedValue([companyFixture()])

    const handler = await getHandler()
    const req = createTestRequest('GET', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(TEST_COMPANY_ID)
  })

  it('returns 404 when not found', async () => {
    dbMock.mockSelect.mockResolvedValue([])

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/companies/nonexistent')
    const res = await handler(req, createTestParams('nonexistent'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 401 without auth', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(null)

    const handler = await getHandler()
    const req = createTestRequest('GET', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(401)
  })
})

describe('PUT /api/v1/companies/[id]', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/[id]/route')
    return mod.PUT
  }

  it('returns 200 with valid update', async () => {
    const updated = companyFixture({ name: 'Updated GmbH' })
    dbMock.mockUpdate.mockResolvedValue([updated])

    const handler = await getHandler()
    const req = createTestRequest('PUT', `/api/v1/companies/${TEST_COMPANY_ID}`, { name: 'Updated GmbH' })
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.name).toBe('Updated GmbH')
  })

  it('returns 400 with invalid data', async () => {
    const handler = await getHandler()
    const req = createTestRequest('PUT', `/api/v1/companies/${TEST_COMPANY_ID}`, { name: 'A'.repeat(256) })
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when not found', async () => {
    dbMock.mockUpdate.mockResolvedValue([])

    const handler = await getHandler()
    const req = createTestRequest('PUT', '/api/v1/companies/nonexistent', { name: 'Test' })
    const res = await handler(req, createTestParams('nonexistent'))

    expect((await res.json()).error.code).toBe('NOT_FOUND')
  })

  it('returns 200 as member (members can update)', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture({ role: 'member' }))

    const updated = companyFixture({ name: 'Member Update' })
    dbMock.mockUpdate.mockResolvedValue([updated])

    const handler = await getHandler()
    const req = createTestRequest('PUT', `/api/v1/companies/${TEST_COMPANY_ID}`, { name: 'Member Update' })
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(200)
  })

  it('returns 401 without auth', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(null)

    const handler = await getHandler()
    const req = createTestRequest('PUT', `/api/v1/companies/${TEST_COMPANY_ID}`, { name: 'Test' })
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/v1/companies/[id]', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/[id]/route')
    return mod.DELETE
  }

  it('returns 200 on successful delete', async () => {
    dbMock.mockDelete.mockResolvedValue([{ id: TEST_COMPANY_ID }])

    const handler = await getHandler()
    const req = createTestRequest('DELETE', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 404 when not found', async () => {
    dbMock.mockDelete.mockResolvedValue([])

    const handler = await getHandler()
    const req = createTestRequest('DELETE', '/api/v1/companies/nonexistent')
    const res = await handler(req, createTestParams('nonexistent'))

    expect((await res.json()).error.code).toBe('NOT_FOUND')
  })

  it('returns 401 without auth', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(null)

    const handler = await getHandler()
    const req = createTestRequest('DELETE', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(401)
  })

  it('returns 403 as member', async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthForbidden()

    const handler = await getHandler()
    const req = createTestRequest('DELETE', `/api/v1/companies/${TEST_COMPANY_ID}`)
    const res = await handler(req, createTestParams(TEST_COMPANY_ID))

    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (~55 total: 18 validation + 25 service + 15 route).

- [ ] **Step 3: Debug and fix mock issues**

Common issues to watch for:
- `vi.doMock` vs `vi.mock`: `doMock` is lazy and works with dynamic imports. If tests fail with "module not found", ensure `vi.resetModules()` is called before `setupDbMock()`.
- The Drizzle chain mock's `then` method must handle both `Promise.all` and direct `await`.
- NextRequest constructor might need `next/server` to be available in test env.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/integration/api/companies.route.test.ts
git commit -m "test: add companies API route integration tests"
```

---

## Chunk 5: Final Verification

### Task 8: Run full test suite and verify

- [ ] **Step 1: Run all tests with verbose output**

```bash
npx vitest run --reporter=verbose
```

Expected: ~55 tests across 3 files, all passing.

- [ ] **Step 2: Run with coverage**

```bash
npx vitest run --coverage
```

Review coverage for `company.service.ts` and `validation.ts`.

- [ ] **Step 3: Final commit with all fixes**

If any adjustments were needed during debugging, commit them:

```bash
git add -A src/__tests__/ vitest.config.ts
git commit -m "test: complete companies module test suite"
```
