# Test Architecture Design: xKMU BusinessOS

**Date:** 2026-03-15
**Status:** Approved

## Goal

Establish a test infrastructure for xKMU BusinessOS using Vitest. Implement the Companies module as a fully tested reference, providing reusable utilities for all other modules.

## Scope

- Vitest setup with TypeScript and path alias support
- Test helpers: DB mocks, auth mocks, request builders, fixtures
- Companies module as reference implementation:
  - Zod schema validation tests
  - Service unit tests (with DB mocks)
  - API route integration tests (with auth + DB mocks)

## Framework & Dependencies

```
vitest                    - Test runner
@vitejs/plugin-react      - React support (for future component tests)
```

No additional test libraries needed initially. Vitest includes built-in mocking (`vi.mock`, `vi.fn`, `vi.spyOn`).

## File Structure

```
vitest.config.ts                          # Main config
src/
├── __tests__/
│   ├── setup.ts                          # Global test setup
│   ├── helpers/
│   │   ├── mock-db.ts                    # Drizzle DB mock utilities
│   │   ├── mock-auth.ts                  # Auth context + withPermission mock
│   │   ├── mock-request.ts               # NextRequest builder
│   │   └── fixtures.ts                   # Test data factories
│   ├── unit/
│   │   ├── services/
│   │   │   └── company.service.test.ts   # Service unit tests
│   │   └── validation/
│   │       └── company.validation.test.ts # Zod schema tests
│   └── integration/
│       └── api/
│           └── companies.route.test.ts   # API route tests
```

## Configuration

### vitest.config.ts

- Resolve `@/*` to `./src/*` (matching tsconfig)
- Setup file: `src/__tests__/setup.ts`
- Include pattern: `src/__tests__/**/*.test.ts`
- Environment: `node` (API routes don't need jsdom)

### package.json scripts

- `test` - Run all tests
- `test:unit` - Run unit tests only
- `test:integration` - Run integration tests only
- `test:watch` - Watch mode
- `test:coverage` - With coverage report

## Test Helpers Design

### mock-db.ts

Mocks `@/lib/db` module. Provides chainable query builders that mirror Drizzle's API:

```typescript
// Usage in tests:
const { mockInsert, mockSelect, mockUpdate, mockDelete } = setupDbMock()

mockSelect.mockResolvedValue([companyFixture])
mockInsert.mockResolvedValue([companyFixture])
```

The mock replaces `db.insert()`, `db.select()`, `db.update()`, `db.delete()` with vi.fn() chains that support `.values()`, `.from()`, `.where()`, `.returning()`, `.limit()`, `.offset()`, `.orderBy()`, `.set()`.

Each chain method returns the mock itself (for chaining), and the terminal call (the chain itself when awaited) resolves to the configured return value.

### mock-auth.ts

Mocks `@/lib/auth/require-permission` to bypass real session/JWT checks:

```typescript
// Usage in tests:
mockAuthContext({ tenantId: 'tenant-1', userId: 'user-1', role: 'admin' })
// Now withPermission will call the handler directly with this auth context

mockAuthContext(null)
// Now withPermission returns 401

mockAuthForbidden()
// Now withPermission returns 403
```

### mock-request.ts

Builds NextRequest objects for API route testing:

```typescript
// Usage:
const req = createTestRequest('POST', '/api/v1/companies', {
  name: 'Test GmbH',
  city: 'Berlin',
})

const req = createTestRequest('GET', '/api/v1/companies?page=2&limit=10')
```

### fixtures.ts

Factory functions for test data:

```typescript
const company = companyFixture()                    // Default values
const company = companyFixture({ name: 'Custom' })  // Override specific fields

const auth = authFixture()                          // Default admin auth
const auth = authFixture({ role: 'viewer' })        // Override role
```

Fixtures include UUIDs, timestamps, and all required fields with sensible defaults.

## Test Specifications

### 1. Zod Schema Validation Tests (~15 tests)

**File:** `src/__tests__/unit/validation/company.validation.test.ts`

Tests for `createCompanySchema`:

| Test | Input | Expected |
|------|-------|----------|
| Valid minimal input | `{ name: 'Test GmbH' }` | Passes, defaults applied |
| Valid full input | All fields populated | Passes |
| Missing name | `{}` | Fails: name required |
| Name too long | 256 chars | Fails: max 255 |
| Invalid email | `{ email: 'not-email' }` | Fails |
| Empty string email | `{ email: '' }` | Passes (allowed via `.or(z.literal(''))`) |
| Invalid website URL | `{ website: 'not-url' }` | Fails |
| Website URL too long | 256 char URL | Fails: max 255 |
| Negative employee count | `{ employeeCount: -1 }` | Fails: min 0 |
| Country too long | `{ country: 'DEU' }` | Fails: max 2 |
| Default country | No country | Defaults to 'DE' |
| Default status | No status | Defaults to 'prospect' |
| Default tags | No tags | Defaults to `[]` |
| Invalid status | `{ status: 'invalid' }` | Fails: enum |
| Custom fields | `{ customFields: { key: 'val' } }` | Passes |

Tests for `updateCompanySchema`:
| Test | Input | Expected |
|------|-------|----------|
| Empty object valid | `{}` | Passes (all partial) |
| Partial update | `{ name: 'New' }` | Passes |

### 2. Service Unit Tests (~20 tests)

**File:** `src/__tests__/unit/services/company.service.test.ts`

DB is mocked. Tests verify the service calls Drizzle correctly and transforms data properly.

**create:**
- Creates company with all fields, returns result
- Converts empty strings to null (emptyToNull helper)
- Sets default country to 'DE'
- Sets default status to 'prospect'
- Passes tenantId and createdBy

**getById:**
- Returns company when found
- Returns null when not found
- Filters by both tenantId and companyId (tenant isolation)

**update:**
- Updates and returns company
- Converts annualRevenue number to string
- Handles employeeCount null
- Returns null when not found
- Sets updatedAt timestamp

**delete:**
- Returns true when deleted
- Returns false when not found
- Filters by tenantId (tenant isolation)

**list:**
- Returns paginated results with meta
- Applies status filter (single value)
- Applies status filter (array)
- Applies tag filter
- Applies search filter (ilike on name)
- Respects pagination offset/limit
- Default page=1, limit=20
- Note: Uses `Promise.all` with two concurrent `db.select()` calls (items + count). Tests must use `mockResolvedValueOnce` twice in sequence or differentiate by select argument.

**search:**
- Returns matching companies
- Returns empty array for empty query
- Respects limit parameter

**addTag:**
- Adds tag to existing company
- Short-circuits if tag already exists (returns unchanged company)
- Returns null if company not found

**removeTag:**
- Removes tag from existing company
- Returns null if company not found

**getPersons:**
- Returns persons for company
- Returns empty array when no persons
- Filters by tenantId (tenant isolation)

**checkDuplicate:**
- Finds by exact name (case-insensitive)
- Finds by website domain
- Returns null when no duplicate
- Handles invalid URL gracefully

### 3. API Route Integration Tests (~15 tests)

**File:** `src/__tests__/integration/api/companies.route.test.ts`

Both auth and DB are mocked. Tests verify the full request flow through the route handler.

**POST /api/v1/companies:**
- 201 with valid data, returns `{ success: true, data: company }`
- 400 with invalid data (validation error with field details)
- 409 when duplicate detected
- 401 without auth
- 403 as viewer (no create permission)
- WebhookService.fire is called (mocked as no-op returning resolved promise)

**GET /api/v1/companies:**
- 200 returns paginated list with meta
- Passes query params to service (status, search, tags, pagination)
- 401 without auth

**GET /api/v1/companies/[id]:**
- 200 returns single company
- 404 when not found
- 401 without auth

**PUT /api/v1/companies/[id]:**
- 200 with valid update
- 400 with invalid data
- 404 when not found
- 401 without auth
- 200 as member (members can update)

**DELETE /api/v1/companies/[id]:**
- 200 on successful delete
- 404 when not found
- 401 without auth
- 403 as member (no delete permission)

**Route params note:** Next.js 16 uses `Promise<{ id: string }>` for dynamic params. Tests must pass a `params` object wrapping the id in a resolved Promise: `{ params: Promise.resolve({ id: 'test-id' }) }`.

## Mocking Strategy

### What gets mocked

| Dependency | Mock approach | Why |
|------------|--------------|-----|
| `@/lib/db` | `vi.mock` with chainable builders | Isolate from real DB |
| `@/lib/auth/require-permission` | `vi.mock` with configurable auth | Skip JWT/session |
| `@/lib/auth/auth-context` | `vi.mock` | Used by require-permission |
| `@/lib/services/webhook.service` | `vi.mock` with no-op | Side effect, not under test |

### What does NOT get mocked

- Zod schemas (tested as-is)
- `validateAndParse` / `formatZodErrors` (pure functions)
- `apiSuccess` / `apiError` / etc. (response builders, tested through route tests)
- Service logic (in service tests, only DB calls are mocked)

## Future Extension

Once this reference is established, adding tests for another module (e.g. Leads) requires:

1. Copy `company.service.test.ts` → `lead.service.test.ts`
2. Copy `company.validation.test.ts` → `lead.validation.test.ts`
3. Copy `companies.route.test.ts` → `leads.route.test.ts`
4. Replace fixtures, schemas, service calls
5. Add module-specific test cases

All helpers (`mock-db`, `mock-auth`, `mock-request`, `fixtures`) are reusable without changes.

Phase 2 (future): Add integration tests against a real test PostgreSQL database for high-confidence validation of queries and migrations.
