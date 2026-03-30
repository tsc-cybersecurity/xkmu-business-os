# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Vitest 4.1.0
- Config: `vitest.config.ts`
- Environment: `node`
- Globals: enabled (`describe`, `it`, `expect`, `vi` available without import, but explicitly imported anyway)

**Assertion Library:**
- Vitest built-in (`expect`)

**Coverage:**
- `@vitest/coverage-v8` 4.1.0

**Run Commands:**
```bash
npm test                  # Run all tests (vitest run)
npm run test:unit         # Run unit tests only (src/__tests__/unit)
npm run test:integration  # Run integration tests only (src/__tests__/integration)
npm run test:watch        # Watch mode (vitest)
npm run test:coverage     # Coverage report (vitest run --coverage)
```

## Test File Organization

**Location:** Centralized `src/__tests__/` directory (not co-located with source files)

**Structure:**
```
src/__tests__/
  setup.ts                              # Global setup (restores mocks)
  helpers/
    fixtures.ts                         # Test data factories
    mock-db.ts                          # Drizzle DB mock helper
    mock-auth.ts                        # Auth context mock helper
    mock-request.ts                     # NextRequest factory
  unit/
    services/
      company.service.test.ts           # 19 service test files
      lead.service.test.ts
      ...
    validation/
      company.validation.test.ts        # 17 validation test files
      lead.validation.test.ts
      ...
  integration/
    api/
      companies.route.test.ts           # 4 route integration tests
      auth.route.test.ts
      admin-database.route.test.ts
      export-database.route.test.ts
```

**Naming:**
- Unit service tests: `{entity}.service.test.ts`
- Unit validation tests: `{entity}.validation.test.ts`
- Integration route tests: `{entity}.route.test.ts`

**Include pattern** (from `vitest.config.ts`):
```
src/__tests__/**/*.test.ts
```

## Test Setup

**Global setup** at `src/__tests__/setup.ts`:
```typescript
import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.restoreAllMocks()
})
```

**Path alias** in `vitest.config.ts`:
```typescript
resolve: {
  alias: { '@': path.resolve(__dirname, './src') }
}
```

## Test Structure

**Service Unit Tests:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { companyFixture, TEST_TENANT_ID, TEST_USER_ID } from '../../helpers/fixtures'

// Mock side-effect dependencies
vi.mock('@/lib/services/webhook.service', () => ({
  WebhookService: { fire: vi.fn().mockResolvedValue(undefined) },
}))

describe('CompanyService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()           // Reset module cache for clean mocks
    dbMock = setupDbMock()      // Set up fresh DB mock
  })

  // Dynamic import AFTER mocks are set up
  async function getService() {
    const mod = await import('@/lib/services/company.service')
    return mod.CompanyService
  }

  describe('create', () => {
    it('creates a company and returns it', async () => {
      const fixture = companyFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, { name: 'Test GmbH' }, TEST_USER_ID)

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })
  })
})
```

**Key pattern:** Services are dynamically imported (`await import(...)`) AFTER `vi.doMock()` calls to ensure mocks are in place. This is critical because Vitest uses module-level mocking.

**Validation Unit Tests:**
```typescript
import { describe, it, expect } from 'vitest'
import { createCompanySchema } from '@/lib/utils/validation'

describe('createCompanySchema', () => {
  it('accepts valid minimal input', () => {
    const result = createCompanySchema.safeParse({ name: 'Test GmbH' })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createCompanySchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
```

Validation tests are straightforward schema.safeParse() assertions -- no mocks needed.

**Integration (Route) Tests:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest } from '../../helpers/mock-request'
import { authFixture, companyFixture, createCompanyInput } from '../../helpers/fixtures'

vi.mock('@/lib/services/webhook.service', () => ({
  WebhookService: { fire: vi.fn().mockResolvedValue(undefined) },
}))

describe('POST /api/v1/companies', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())   // Mock auth to allow requests
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/companies/route')
    return mod.POST
  }

  it('returns 201 with valid data', async () => {
    dbMock.mockSelect.mockResolvedValue([])        // No duplicate
    dbMock.mockInsert.mockResolvedValue([companyFixture()])

    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/companies', createCompanyInput())
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
  })
})
```

## Mocking

**Framework:** Vitest built-in (`vi.mock`, `vi.doMock`, `vi.fn`)

**Database Mock** (`src/__tests__/helpers/mock-db.ts`):
- `setupDbMock()` creates a complete chainable mock for Drizzle ORM operations
- Mocks `db.insert()`, `db.select()`, `db.update()`, `db.delete()` with chainable methods (`.from()`, `.where()`, `.values()`, `.returning()`, etc.)
- Returns `mockInsert`, `mockSelect`, `mockUpdate`, `mockDelete` chain managers
- Each manager has `.mockResolvedValue(value)` and `.mockResolvedValueOnce(value)`
- Uses `vi.doMock('@/lib/db', () => ({ db }))` for module-level mock

**Auth Mock** (`src/__tests__/helpers/mock-auth.ts`):
- `mockAuthContext(auth)` - mocks `withPermission` to bypass auth and call handler directly
- `mockAuthForbidden()` - mocks `withPermission` to return 403
- `mockAuthAdmin()` - shortcut for `mockAuthContext(authFixture())`

**Request Mock** (`src/__tests__/helpers/mock-request.ts`):
- `createTestRequest(method, url, body?)` - creates `NextRequest` instance
- `createTestParams(id)` - creates `{ params: Promise<{ id }> }` for dynamic route params

**What to mock:**
- Always mock `@/lib/db` via `setupDbMock()` (no real database in tests)
- Always mock `@/lib/auth/require-permission` via `mockAuthContext()` in integration tests
- Mock fire-and-forget services like `WebhookService.fire` with `vi.mock()`
- Mock external AI providers when testing AI services

**What NOT to mock:**
- Zod validation schemas (test directly with `.safeParse()`)
- Pure utility functions (`emptyToNull`, `formatZodErrors`)
- The service/route under test itself

## Fixtures and Factories

**Location:** `src/__tests__/helpers/fixtures.ts`

**Constants:**
```typescript
export const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001'
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000002'
export const TEST_COMPANY_ID = '00000000-0000-0000-0000-000000000003'
```

**Fixture pattern:**
```typescript
export function companyFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_COMPANY_ID,
    tenantId: TEST_TENANT_ID,
    name: 'Test GmbH',
    // ... all fields with sensible defaults ...
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

**Currently only company fixtures exist.** Other service tests likely define inline data. When adding new test fixtures, follow the same pattern in `fixtures.ts`.

## Coverage

**Requirements:** No minimum threshold enforced
**Tool:** `@vitest/coverage-v8`

```bash
npm run test:coverage     # Generates coverage report
```

## Test Types

**Unit Tests (services):**
- 19 test files in `src/__tests__/unit/services/`
- Test service methods in isolation with mocked DB
- Cover CRUD operations, edge cases (empty strings, nulls, defaults)
- ~6,400 lines total

**Unit Tests (validation):**
- 17 test files in `src/__tests__/unit/validation/`
- Test Zod schema validation with valid/invalid inputs
- Cover boundary conditions, required fields, format validation
- ~4,900 lines total

**Integration Tests (routes):**
- 4 test files in `src/__tests__/integration/api/`
- Test API route handlers end-to-end (with mocked DB and auth)
- Cover HTTP status codes, response format, error handling
- ~1,550 lines total
- Files: `auth.route.test.ts`, `companies.route.test.ts`, `admin-database.route.test.ts`, `export-database.route.test.ts`

**E2E Tests:**
- Not present. No Playwright/Cypress configuration exists.

**Component Tests:**
- Not present. No React Testing Library or component test files exist.

## CI/CD Test Integration

- No CI pipeline configuration detected in the repository
- Docker-based deployment via Portainer on Hetzner server
- `npm run build` (Next.js build) is used as a pre-push check per project convention
- Tests are run manually via `npm test`

## Test Coverage Gaps

**Untested services (51 of 70 service files have no tests):**
- All AI service files: `src/lib/services/ai/*.ts` (24 files)
- Business intelligence: `src/lib/services/business-document.service.ts`, `src/lib/services/business-profile.service.ts`
- DIN audit services: `src/lib/services/din-audit.service.ts`, `src/lib/services/din-requirement.service.ts`, etc.
- Chat service: `src/lib/services/chat.service.ts`
- Cockpit service: `src/lib/services/cockpit.service.ts`
- CMS services (partial): `src/lib/services/cms-block-template.service.ts`, `src/lib/services/cms-block-type.service.ts`
- Document calculation: `src/lib/services/document-calculation.service.ts`
- Email template: `src/lib/services/email-template.service.ts`
- Opportunity: `src/lib/services/opportunity.service.ts`
- N8N workflow: `src/lib/services/n8n-workflow.service.ts`

**Untested API routes:**
- Only 4 of ~90+ route files have integration tests
- Missing: leads, products, documents, CMS, marketing, social media, DIN, cockpit, AI, chat, opportunities, etc.

**No component tests:**
- Zero React component testing
- No tests for client-side state management or form behavior
- No tests for shared components in `src/components/shared/`

**No E2E tests:**
- No browser-based testing
- No critical path testing (login flow, CRUD flows)

**Missing test areas:**
- Auth middleware behavior (rate limiting at `src/lib/utils/rate-limit.ts`)
- Webhook delivery logic
- AI provider response parsing (especially Gemini thinking parts)
- PDF generation (`jspdf`)
- File upload/media handling
- Multi-tenant isolation (ensuring tenant A cannot access tenant B data)

## Patterns for Writing New Tests

**Adding a new service test:**
1. Create file at `src/__tests__/unit/services/{name}.service.test.ts`
2. Import and use `setupDbMock()` from helpers
3. Use `vi.resetModules()` in `beforeEach`
4. Dynamic import the service under test
5. Mock side-effect dependencies with `vi.mock()`

**Adding a new validation test:**
1. Create file at `src/__tests__/unit/validation/{name}.validation.test.ts`
2. Import schema from `@/lib/utils/validation`
3. Test with `schema.safeParse()` -- no mocking needed

**Adding a new route integration test:**
1. Create file at `src/__tests__/integration/api/{name}.route.test.ts`
2. Import `setupDbMock`, `mockAuthContext`, `createTestRequest` from helpers
3. Mock auth and DB in `beforeEach`
4. Dynamic import the route handler
5. Assert HTTP status codes and response body structure

---

*Testing analysis: 2026-03-30*
