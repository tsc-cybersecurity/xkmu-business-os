# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Next.js App Router Monolith with Multi-Tenant Architecture

**Key Characteristics:**
- Single Next.js application serving both public website and internal dashboard
- Multi-tenant data isolation via `tenantId` on virtually every database table
- Service-layer pattern for business logic, API route handlers are thin wrappers
- JWT-based session auth with RBAC (role-based access control)
- AI provider abstraction layer supporting 6+ providers with runtime switching
- Docker-only deployment (standalone output)

## Layers

**Presentation Layer (Client):**
- Purpose: React client components for UI
- Location: `src/app/intern/(dashboard)/` (dashboard pages), `src/app/(public)/` (public pages)
- Contains: Page components (`page.tsx`), route-specific `_components/` directories
- Depends on: API layer via `fetch('/api/v1/...')`
- Used by: End users via browser

**API Layer:**
- Purpose: RESTful API endpoints with auth/permission checks
- Location: `src/app/api/v1/`
- Contains: `route.ts` files with GET/POST/PUT/DELETE handlers
- Depends on: Auth layer, Service layer, Validation utilities
- Used by: Dashboard client, external integrations, API keys

**Service Layer:**
- Purpose: All business logic, database queries, orchestration
- Location: `src/lib/services/`
- Contains: `*.service.ts` files as singleton objects (e.g., `LeadService`, `CompanyService`)
- Depends on: Database layer, AI layer
- Used by: API route handlers exclusively

**AI Abstraction Layer:**
- Purpose: Unified interface to multiple AI providers
- Location: `src/lib/services/ai/`
- Contains: Provider implementations, domain-specific AI services
- Depends on: External AI APIs, `ai_providers` DB table for config
- Used by: Service layer for AI-powered features

**Database Layer:**
- Purpose: Schema definition, connection management, ORM
- Location: `src/lib/db/`
- Contains: Single schema file (`schema.ts`, 2551 lines, 70+ tables), connection pool, seeds
- Depends on: PostgreSQL via `postgres` driver
- Used by: Service layer

**Auth Layer:**
- Purpose: Authentication, authorization, permission checking
- Location: `src/lib/auth/`
- Contains: Session management, API key validation, permission middleware
- Depends on: Database layer (users, roles, role_permissions tables)
- Used by: API layer

## Data Flow

**Authenticated Dashboard Request:**

1. User navigates to `/intern/(dashboard)/leads`
2. Server-side layout (`layout.tsx`) calls `getSession()` to verify JWT cookie
3. If no session, redirect to `/intern/login`
4. Client component mounts, calls `fetch('/api/v1/leads')`
5. API route handler calls `withPermission(request, 'leads', 'read', handler)`
6. `withPermission` extracts auth from session cookie or API key via `getAuthContext()`
7. Permission check runs against role permissions in DB
8. Handler calls `LeadService.list(auth.tenantId, filters)`
9. Service queries DB with `tenantId` filter (data isolation)
10. Response returned as `apiSuccess(items, meta)`

**API Key Request (External):**

1. External system sends request with `X-Api-Key` header
2. `getAuthContext()` falls through session check, validates API key
3. API key auth gets `role: 'api'` which bypasses granular permission checks
4. Same service layer handles the request with `tenantId` from API key

**State Management:**
- No global client state manager (no Redux, Zustand, etc.)
- Each page manages its own state via React `useState`/`useEffect`
- Data fetching: direct `fetch` calls to API routes from client components
- Permission state: `PermissionProvider` context (`src/hooks/use-permissions.tsx`)
- Chat state: `ChatProvider` context (`src/components/chat/chat-provider.tsx`)

## Key Abstractions

**Service Objects:**
- Purpose: Encapsulate all business logic for a domain
- Examples: `src/lib/services/lead.service.ts`, `src/lib/services/company.service.ts`, `src/lib/services/document.service.ts`
- Pattern: Exported const object with async methods, always takes `tenantId` as first param
- Example signature: `LeadService.create(tenantId: string, data: CreateLeadInput): Promise<Lead>`

**AI Provider Interface:**
- Purpose: Swap AI backends without changing business code
- Examples: `src/lib/services/ai/gemini.provider.ts`, `src/lib/services/ai/openai.provider.ts`, `src/lib/services/ai/openrouter.provider.ts`, `src/lib/services/ai/deepseek.provider.ts`, `src/lib/services/ai/kimi.provider.ts`, `src/lib/services/ai/ollama.provider.ts`
- Pattern: `AIProvider` interface with `name`, `complete(prompt, options)`, `isAvailable()` methods
- Registration: Static providers registered in `src/lib/services/ai/index.ts`, DB-configured providers created at runtime via factory in `src/lib/services/ai/ai.service.ts`

**Domain-Specific AI Services:**
- Purpose: Combine AI calls with domain knowledge for specific features
- Examples: `src/lib/services/ai/lead-research.service.ts`, `src/lib/services/ai/blog-ai.service.ts`, `src/lib/services/ai/marketing-ai.service.ts`, `src/lib/services/ai/social-media-ai.service.ts`, `src/lib/services/ai/cms-ai.service.ts`
- Pattern: Each uses `AIService` for completions but adds domain-specific prompt construction

**Validation Schemas:**
- Purpose: Type-safe request validation
- Location: `src/lib/utils/validation.ts` (single file, all schemas)
- Pattern: Zod schemas with `validateAndParse(schema, body)` helper
- Example: `createLeadSchema`, `updateLeadSchema`, `createCompanySchema`

**API Response Helpers:**
- Purpose: Consistent JSON response format
- Location: `src/lib/utils/api-response.ts`
- Pattern: `apiSuccess(data, meta?)`, `apiError(code, message, status)`, `apiNotFound()`, `apiServerError()`
- Response shape: `{ success: true, data: T, meta?: {...} }` or `{ success: false, error: { code, message, details? } }`

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page load
- Responsibilities: Font loading, HTML structure, `DesignProvider` wrapper, JSON-LD schema

**Dashboard Layout:**
- Location: `src/app/intern/(dashboard)/layout.tsx`
- Triggers: Any `/intern/*` dashboard page
- Responsibilities: Session validation, redirect to login if unauthenticated, renders Sidebar + Header + ChatPanel + PermissionProvider

**Public Layout:**
- Location: `src/app/(public)/layout.tsx`
- Triggers: Any public page (landing, services, legal pages)
- Responsibilities: Landing navbar, footer, breadcrumb

**API Health Check:**
- Location: `src/app/api/health/`
- Triggers: Docker health checks, monitoring

## Authentication & Authorization

**Authentication Methods:**
1. **JWT Session Cookie** (`xkmu_session`): 7-day expiry, HS256 signed, httpOnly, secure in production
   - Implementation: `src/lib/auth/session.ts`
   - Login: `src/app/api/v1/auth/` routes
2. **API Key** (`X-Api-Key` header): SHA-256 hashed in DB, prefix-based lookup
   - Implementation: `src/lib/auth/api-key.ts`

**Authorization Model:**
- `withPermission(request, module, action, handler)` wrapper for all API routes
- Implementation: `src/lib/auth/require-permission.ts`
- Dual-path authorization:
  1. **Granular RBAC**: If user has `roleId`, check `role_permissions` table for module+action
  2. **Legacy fallback**: owner/admin get full access, member gets read/create/update, viewer gets read-only
- 38 modules defined in `src/lib/types/permissions.ts` (companies, leads, products, etc.)
- 4 CRUD actions: create, read, update, delete
- 6 default role templates: owner, admin, member, viewer, auditor, designer

## Multi-Tenancy

**Implementation:** Row-level isolation via `tenantId` column

- Every data table includes `tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' })`
- Every service method takes `tenantId` as first parameter
- Every DB query includes `eq(table.tenantId, tenantId)` in WHERE clause
- `tenantId` comes from authenticated session or API key, never from client input
- Tenant created on registration, user gets `owner` role for their tenant

**Tenant Scoped Tables (all 70+ tables except):**
- `tenants` (top-level)
- `dinRequirements`, `wibaRequirements`, `grundschutzGroups/Controls` (shared catalog data)

## Error Handling

**Strategy:** Try/catch in API handlers, structured error responses

**Patterns:**
- API routes wrap handler logic in try/catch, return `apiError()` or `apiServerError()`
- Validation errors return `apiValidationError(formatZodErrors(errors))` with field-level detail
- Auth failures return `apiUnauthorized()` (401) or `apiForbidden()` (403)
- Service layer uses `logger.error()` for server-side logging, throws or returns null for errors
- No global error boundary detected for client components

## Cross-Cutting Concerns

**Logging:**
- Custom logger at `src/lib/utils/logger.ts`
- Console-based with structured JSON context (module, tenantId, userId)
- Levels: debug (dev only), info, warn, error
- Usage: `logger.error('Create lead error', error, { module: 'LeadsAPI' })`

**Validation:**
- Zod schemas in `src/lib/utils/validation.ts`
- `validateAndParse(schema, body)` returns `{ success, data }` or `{ success, errors }`
- `formatZodErrors()` converts Zod errors to `{ field, message }[]` for API responses

**Rate Limiting:**
- Utility at `src/lib/utils/rate-limit.ts`

**Task Queue:**
- DB-backed task queue at `src/lib/services/task-queue.service.ts`
- Tasks stored in `task_queue` table, processed via manual trigger (button-based, not cron)
- Handlers in `src/lib/services/task-queue-handlers/` (currently: `dunning.handler.ts`)

**Webhooks:**
- Outgoing webhook system: fires on events like `lead.created`, `lead.won`, `research.completed`
- Service: `src/lib/services/webhook.service.ts`
- Webhook definitions stored per tenant

**Activity Tracking:**
- `activities` table tracks CRM interactions (email, call, note, meeting, ai_outreach)
- Service: `src/lib/services/activity.service.ts`

## API Design

**Convention:** REST, versioned under `/api/v1/`

**URL Pattern:** `/api/v1/{resource}` for collection, `/api/v1/{resource}/[id]` for single item

**Pagination:** Query params `?page=1&limit=20`, response meta: `{ page, limit, total, totalPages }`

**Filtering:** Query params specific to each resource (e.g., `?status=new&source=manual&search=term`)

**CORS:** Configured in `next.config.ts` with permissive `Access-Control-Allow-Origin: *`

---

*Architecture analysis: 2026-03-30*
