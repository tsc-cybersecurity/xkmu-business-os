# Coding Conventions

**Analysis Date:** 2026-04-13

## Naming Patterns

**Files:**
- Services: PascalCase with `.service.ts` suffix - e.g., `activity.service.ts`, `user.service.ts`
- Components: kebab-case - e.g., `form-field.tsx`, `confirm-dialog.tsx`
- Utilities: kebab-case - e.g., `api-response.ts`, `logger.ts`
- API routes: lowercase kebab-case matching resource pattern - e.g., `/api/v1/activities/route.ts`
- Test files: matched to source with `.test.ts` suffix - e.g., `activity.service.test.ts`

**Functions:**
- camelCase for all functions - e.g., `apiSuccess()`, `validateApiKey()`, `getById()`
- Service methods: consistently named CRUD verbs: `create()`, `getById()`, `list()`, `update()`, `delete()`
- Async functions: use `async`/`await` pattern

**Variables:**
- camelCase for all variables and constants - e.g., `tenantId`, `createdId`, `maxBytes`
- Constants at module level: UPPERCASE_SNAKE_CASE - e.g., `TEST_TENANT_ID`, `FAKE_UUID`
- Test UUIDs: follow pattern `00000000-0000-0000-0000-0000000000XX` for fixtures

**Types:**
- Interfaces for object shapes: PascalCase, prefixed with `I` or suffixed with `Props`/`Input`/`Response` - e.g., `FormFieldProps`, `CreateActivityInput`, `ApiSuccessResponse<T>`
- Type aliases: PascalCase - e.g., `AuthContext`, `LogLevel`
- Enums: PascalCase values - e.g., `'note'`, `'call'`, `'meeting'` (lowercase string values in code)

## Code Style

**Formatting:**
- No explicit `.prettierrc` found - using ESLint defaults
- 2-space indentation (standard Next.js)
- Single quotes for strings
- Trailing commas in multi-line objects/arrays

**Linting:**
- ESLint v9.39.3
- Config: `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Flat config format (ESLint 9+)
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

**TypeScript:**
- Target: ES2017
- Strict mode enabled (`"strict": true`)
- Module resolution: bundler
- Path aliases: `@/*` → `./src/*`

## Import Organization

**Order:**
1. External libraries (React, Next.js, third-party packages)
2. Type imports from external libraries (`import type { ... }`)
3. Internal library imports (`@/lib/...`)
4. Schema/type imports from `@/lib/db/schema`
5. Utility imports (`@/lib/utils/...`)
6. Component imports (`@/components/...`)
7. Type imports from internal modules (`import type { ... }`)

**Example pattern** from `src/app/api/v1/activities/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createActivitySchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { ActivityService } from '@/lib/services/activity.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
```

**Path Aliases:**
- Use `@/` prefix for all imports from `src/` directory
- No relative imports (`../..`) in most files - always use path aliases

## Error Handling

**API Responses:**
- Use utility functions from `@/lib/utils/api-response.ts` for all API responses
- Responses are standardized as `ApiSuccessResponse<T>` or `ApiErrorResponse` types
- Success responses include `{ success: true, data: T, meta?: {...} }`
- Error responses include `{ success: false, error: { code, message, details?: [...] } }`

**Error Codes:**
- `NOT_FOUND` (404): Resource not found
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Permission denied
- `VALIDATION_ERROR` (400): Input validation failed
- `INTERNAL_ERROR` (500): Server error
- `PAYLOAD_TOO_LARGE` (413): Request body exceeds size limit
- `INVALID_BODY` (400): Malformed JSON

**Error Handling Pattern:**
```typescript
try {
  const body = await request.json()
  const validation = validateAndParse(schema, body)
  if (!validation.success) {
    return apiValidationError(formatZodErrors(validation.errors))
  }
  // ... process
  return apiSuccess(result, meta, 201)
} catch (error) {
  logger.error('Error message', error, { module: 'ModuleName' })
  return apiServerError()
}
```

**Service Error Patterns:**
- Return `null` for not-found cases - e.g., `getById()` returns `Activity | null`
- Return `boolean` for delete operations - `true` if deleted, `false` if not found
- Throw errors for validation failures or unexpected issues
- Catch and log errors in API routes; services propagate errors up

**Validation:**
- Use Zod schemas from `@/lib/utils/validation.ts` for all input validation
- Schemas organized by domain (tenant, user, activity, etc.)
- Use `validateAndParse()` helper for type-safe validation with error handling
- Include detailed error messages in Zod schema definitions

## Logging

**Framework:** Custom logger in `@/lib/utils/logger.ts`

**Patterns:**
- `logger.debug(message, context?)` - Development only (skipped in production)
- `logger.info(message, context?)` - General information
- `logger.warn(message, context?)` - Warning conditions
- `logger.error(message, error?, context?)` - Error conditions

**Context object:**
```typescript
interface LogContext {
  module?: string           // 'ActivitiesAPI', 'AuthService', etc.
  tenantId?: string
  userId?: string
  [key: string]: unknown    // Additional fields as needed
}
```

**Usage example:**
```typescript
logger.error('Error creating activity', error, { module: 'ActivitiesAPI' })
logger.info('Activity created', { module: 'ActivityService', tenantId: '...' })
```

## Comments

**When to Comment:**
- Comment non-obvious logic or complex algorithms
- Comment business rules and constraints
- Avoid commenting obvious code (variable names and function names should be self-documenting)
- Use comments to explain "why" not "what"

**JSDoc/TSDoc:**
- Used sparingly for public module APIs
- Example from `src/lib/auth/require-permission.ts`:
```typescript
/**
 * Wrapper fuer API-Routen mit Berechtigungspruefung.
 *
 * Prueft zuerst die Authentifizierung (Session oder API-Key),
 * dann die Berechtigung basierend auf der Rolle des Benutzers.
 */
```
- Document function parameters and return types in complex public APIs
- German language accepted for comments and JSDoc (mixed with English is common)

**Section Dividers:**
- Use comment sections to organize large blocks: `// ─── Shared session / user fixtures ─────...`
- Helpful for visual structure in test files and large modules

## Function Design

**Size:** 
- Keep functions under 50 lines when possible
- Service methods typically 10-30 lines
- API route handlers 20-40 lines
- Extract utility functions for reusable logic

**Parameters:**
- Max 3-4 parameters for regular functions
- Use object destructuring for multiple optional parameters
- API route handlers accept `(tenantId: string, filters: FilterObject = {})`
- Services accept `tenantId` as first parameter for multi-tenancy

**Return Values:**
- Use specific types: `Promise<T | null>` for optional, `Promise<T>` for guaranteed
- Use union types for multiple return types: `Promise<User | ApiErrorResponse>`
- Return objects with meta/items for paginated results: `{ items: T[], meta: PaginationMeta }`

**Pagination:**
- Default page: 1, default limit: 50 (some endpoints use 20)
- Return paginated objects: `{ items: T[], meta: { page, limit, total, totalPages } }`
- Calculate totalPages: `Math.ceil(total / limit)`

## Module Design

**Exports:**
- Services export as object with methods: `export const ServiceName = { method1(), method2() }`
- Utilities export individual functions
- Components export as default for `.tsx` files or named exports for utility components
- Re-export commonly used items in barrel files (`index.ts`)

**Barrel Files:**
- Used in component directories - e.g., `src/components/shared/index.ts`
- Simplifies imports: `import { FormField, ConfirmDialog } from '@/components/shared'`

**File Organization:**
- One service/utility per file (except barrel files)
- Test files co-located with source: `service.ts` and `service.test.ts` in same directory or under `__tests__/`
- Schemas organized by domain in `@/lib/utils/validation.ts`

---

*Convention analysis: 2026-04-13*
