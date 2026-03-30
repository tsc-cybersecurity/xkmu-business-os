# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- Services: `kebab-case.service.ts` (e.g., `src/lib/services/company.service.ts`, `src/lib/services/blog-post.service.ts`)
- AI providers: `kebab-case.provider.ts` (e.g., `src/lib/services/ai/gemini.provider.ts`)
- Validation schemas: single file `src/lib/utils/validation.ts` (all schemas consolidated)
- API routes: `route.ts` inside Next.js App Router convention directories
- UI components: `kebab-case.tsx` (e.g., `src/components/ui/button.tsx`, `src/components/shared/empty-state.tsx`)
- Page components: `page.tsx` inside route directories
- Layout components: `layout.tsx` inside route directories
- Feature-scoped components: `_components/` directory alongside page files (underscore prefix)
- Hooks: `use-kebab-case.tsx` (e.g., `src/hooks/use-permissions.tsx`)

**Functions:**
- Use camelCase: `fetchLeads`, `formatDate`, `getScoreColor`
- Service methods: camelCase verbs: `create`, `list`, `getById`, `update`, `delete`, `checkDuplicate`
- Helper functions: camelCase descriptive: `emptyToNull`, `validateAndParse`, `formatZodErrors`

**Variables:**
- Use camelCase: `formData`, `statusFilter`, `companySearch`
- Constants (inline): camelCase with descriptive names: `statusLabels`, `sourceLabels`
- Module-level constants: SCREAMING_SNAKE for environment-derived values, camelCase for mappings

**Types/Interfaces:**
- PascalCase for types and interfaces: `AuthContext`, `CompanyFilters`, `CreateCompanyInput`
- Input types follow `Create{Entity}Input`, `Update{Entity}Input` pattern
- Schema types: use Zod inference where possible, explicit interfaces for complex service inputs

**Exports:**
- Services exported as const objects (not classes): `export const CompanyService = { ... }`
- Components exported as named functions: `export function EmptyState(...) { ... }` or `export default function LeadsPage() { ... }`
- UI components use named exports: `export { Button, buttonVariants }`

## Code Style

**Formatting:**
- No Prettier config detected -- relies on editor defaults and ESLint
- 2-space indentation (TypeScript/TSX convention)
- Single quotes for strings in TypeScript
- Double quotes in JSX attributes (standard)
- No trailing commas enforced, but generally used
- No semicolons enforced -- semicolons are used consistently

**Linting:**
- ESLint 9 with flat config: `eslint.config.mjs`
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No custom rules beyond Next.js defaults

**TypeScript:**
- Strict mode enabled in `tsconfig.json`
- Target: ES2017
- Path alias: `@/*` maps to `./src/*`
- Use `type` imports where possible: `import type { Company } from '@/lib/db/schema'`
- Prefer explicit return types on service methods
- Use `unknown` over `any` for catch blocks: `catch (error) { ... }`

## Import Organization

**Order:**
1. External packages (React, Next.js, third-party)
2. Internal absolute imports using `@/` alias
3. Relative imports (rare, mainly in test helpers)

**Path Aliases:**
- `@/*` -> `./src/*` (defined in `tsconfig.json`)
- Always use `@/` for imports -- never relative paths from src files

**Examples from `src/app/api/v1/companies/route.ts`:**
```typescript
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiError, parsePaginationParams } from '@/lib/utils/api-response'
import { createCompanySchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CompanyService } from '@/lib/services/company.service'
import { WebhookService } from '@/lib/services/webhook.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
```

## API Route Pattern

Every API route handler follows this exact pattern:

```typescript
// GET - List endpoint
export async function GET(request: NextRequest) {
  return withPermission(request, 'MODULE_NAME', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    // ... parse filters from searchParams ...

    const result = await SomeService.list(auth.tenantId, { ...pagination, ...filters })
    return apiSuccess(result.items, result.meta)
  })
}

// POST - Create endpoint
export async function POST(request: NextRequest) {
  return withPermission(request, 'MODULE_NAME', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createSomethingSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const result = await SomeService.create(auth.tenantId, validation.data, auth.userId || undefined)

      // Optional: fire webhook
      WebhookService.fire(auth.tenantId, 'event.name', { ... }).catch(() => {})

      return apiSuccess(result, undefined, 201)
    } catch (error) {
      logger.error('Operation description', error, { module: 'ModuleAPI' })
      return apiError('ERROR_CODE', 'Human readable message', 500)
    }
  })
}
```

**Key rules:**
- Always wrap with `withPermission(request, module, action, handler)`
- `auth.tenantId` is always passed as first argument to service methods (multi-tenant isolation)
- Use `validateAndParse()` + `formatZodErrors()` for request body validation
- Use `apiSuccess()`, `apiError()`, `apiValidationError()`, `apiNotFound()`, `apiServerError()` for responses
- Webhooks are fire-and-forget: `.catch(() => {})`
- Error logging uses `logger.error(message, error, { module: 'Name' })`

## API Response Format

All API responses follow a consistent envelope:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "name", "message": "Required" }]
  }
}
```

Defined in `src/lib/utils/api-response.ts`. Error codes use SCREAMING_SNAKE: `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `RATE_LIMITED`, `DUPLICATE_COMPANY`, etc.

## Validation Pattern

All schemas live in `src/lib/utils/validation.ts`. Follow these conventions:

```typescript
// Create schema: full required fields + defaults
export const createEntitySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().or(z.literal('')),  // Allow empty string
  status: z.enum(['active', 'inactive']).default('active'),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.string(), z.unknown()).default({}),
})

// Update schema: partial of create
export const updateEntitySchema = createEntitySchema.partial()
```

**Key conventions:**
- Optional string fields use `.optional().or(z.literal(''))` to accept empty strings
- UUID references use `uuidSchema.nullable().optional()`
- Enums defined separately: `export const entityStatusSchema = z.enum([...])`
- German validation messages for user-facing fields: `z.string().min(1, 'Name ist erforderlich')`
- Use `validateAndParse(schema, data)` helper which returns `{ success, data }` or `{ success, errors }`
- Use `formatZodErrors(error)` to convert ZodError to `[{ field, message }]` array

## Service Pattern

Services are plain object exports (not classes) in `src/lib/services/`:

```typescript
export const EntityService = {
  async create(tenantId: string, data: CreateInput, createdBy?: string): Promise<Entity> {
    const [entity] = await db.insert(table).values({ tenantId, ...data }).returning()
    return entity
  },

  async list(tenantId: string, filters: Filters): Promise<PaginatedResult<Entity>> {
    // ... query with conditions, pagination ...
  },

  async getById(tenantId: string, id: string): Promise<Entity | null> {
    // ... query ...
  },

  async update(tenantId: string, id: string, data: UpdateInput): Promise<Entity> {
    // ... update query ...
  },

  async delete(tenantId: string, id: string): Promise<void> {
    // ... delete query ...
  },
}
```

**Key rules:**
- Every method takes `tenantId` as first parameter for multi-tenant isolation
- All queries include `and(eq(table.tenantId, tenantId), ...)` condition
- Use `.returning()` for insert/update to get the result
- Empty strings converted to null via `emptyToNull()` helper
- Pagination follows `PaginatedResult<T>` type from `src/lib/utils/api-response.ts`

## Component Patterns

**Page components** are `'use client'` by default (data fetching via `fetch` to API):

```typescript
'use client'

export default function EntityPage() {
  const [items, setItems] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/v1/entities')
      const data = await response.json()
      if (data.success) setItems(data.data)
    } catch (error) {
      logger.error('Failed to fetch', error, { module: 'PageName' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with title + action button */}
      <Card>
        {/* Content with loading skeleton / empty state / data table */}
      </Card>
    </div>
  )
}
```

**Layout components** are server components that check session:
```typescript
// No 'use client' directive
export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/intern/login')
  return <PermissionProvider><ChatProvider>{children}</ChatProvider></PermissionProvider>
}
```

**Feature-scoped components** live in `_components/` directories next to the page:
- `src/app/intern/(dashboard)/leads/_components/activity-timeline.tsx`
- `src/app/intern/(dashboard)/_components/category-page.tsx`

## UI Pattern

**Component Library:** shadcn/ui (Radix UI + Tailwind + CVA)
- Components in `src/components/ui/` -- standard shadcn/ui components
- Use `cn()` utility from `src/lib/utils.ts` for merging Tailwind classes
- Use `cva` (class-variance-authority) for component variants

**Shared Components** in `src/components/shared/`:
- `ConfirmDialog`, `EmptyState`, `FormField`, `AIResearchCard`, `QuickCreateCompanyDialog`, `QuickCreatePersonDialog`, `ImageGeneratorDialog`, `ImageField`, `IconPicker`
- Barrel export from `src/components/shared/index.ts`

**Icons:** Use `lucide-react` exclusively. Import individual icons: `import { Plus, Search, TrendingUp } from 'lucide-react'`

**Toast notifications:** Use `sonner` library via `toast` import:
```typescript
import { toast } from 'sonner'
toast.success('Erfolgreich gespeichert')
toast.error('Fehler beim Speichern')
```

**Tailwind patterns:**
- Spacing: `space-y-6` for vertical page sections
- Cards: `<Card><CardHeader>...<CardContent>...</Card>` wrapper for sections
- Tables: shadcn `<Table>` components with `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>`
- Loading: `animate-pulse` skeleton divs
- Status badges: `<Badge>` with dynamic color classes
- Responsive: `flex-col sm:flex-row` pattern, `sm:` breakpoint prefixes
- Dark mode: `next-themes` with CSS variables in `src/app/globals.css`

## Error Handling

**API routes:**
- Wrap POST/PUT/DELETE in try-catch
- Log with `logger.error(message, error, { module })`
- Return `apiError('CODE', 'message', statusCode)` or `apiServerError()`
- Never expose internal error details to client

**Client-side:**
- Check `data.success` on fetch responses
- Use `toast.error()` for user-visible errors
- Use `logger.error()` for debug logging

**Services:**
- Let errors propagate to API route handler (no try-catch in services)
- Services return null for not-found cases (caller decides response)

## Logging

**Framework:** Custom logger at `src/lib/utils/logger.ts`
- Wraps `console.debug/info/warn/error`
- Structured format: `[ISO_TIMESTAMP] LEVEL message {context} | error`
- Debug only in development
- Always include `{ module: 'ComponentName' }` context

**Pattern:**
```typescript
logger.info('Company created', { module: 'CompaniesAPI', tenantId: auth.tenantId })
logger.error('Create company error', error, { module: 'CompaniesAPI' })
```

## Authentication & Authorization

**Session:** JWT-based via `src/lib/auth/session.ts`
- Cookie name: `xkmu_session`
- 7-day duration
- Uses `jose` library for JWT

**API Auth:** Dual auth via `src/lib/auth/auth-context.ts`
- Session auth (cookie-based JWT)
- API key auth (header-based)

**Permission wrapper:** `withPermission(request, module, action, handler)` from `src/lib/auth/require-permission.ts`
- Modules: `'companies'`, `'leads'`, `'products'`, etc.
- Actions: `'read'`, `'create'`, `'update'`, `'delete'`
- Provides `AuthContext` with `tenantId`, `userId`, `role`, `roleId`

**Client-side permissions:** `usePermissions()` hook from `src/hooks/use-permissions.tsx`
- Wrapped in `<PermissionProvider>` at dashboard layout level
- `hasPermission(module, action)` check

## Language

- UI text is in **German** throughout
- Code (variable names, comments in code) is in **English**
- Validation messages use German: `'Name ist erforderlich'`
- API error codes and technical messages in English: `'VALIDATION_ERROR'`, `'Resource not found'`

## Comments

**When to comment:**
- JSDoc-style for exported functions with complex signatures
- Section separators with `// ============` in large files (e.g., validation schemas)
- Brief inline comments for non-obvious business logic

**No JSDoc required** for simple service methods or component props -- TypeScript types serve as documentation.

---

*Convention analysis: 2026-03-30*
