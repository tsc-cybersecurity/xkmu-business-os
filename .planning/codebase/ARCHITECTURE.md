# Architecture

**Analysis Date:** 2026-04-13

## Pattern Overview

**Overall:** Server-driven multi-tenant SaaS with Next.js App Router and RESTful API

**Key Characteristics:**
- **Multi-tenancy:** All data scoped by `tenantId` in database schema
- **Layered API-first design:** Separation of API routes, services, database, and UI concerns
- **SSR + API hybrid:** Public pages server-rendered, authenticated dashboard via API + client state
- **In-process cron:** Background tasks triggered via server instrumentation, no external scheduler
- **Service-oriented services:** Domain-specific service classes for business logic (AI, CMS, DIN, etc.)
- **Role-based access control (RBAC):** Permissions stored per tenant per role, checked at API layer and client

## Layers

**API Routes:**
- Purpose: HTTP entry points, request/response handling, validation, rate limiting
- Location: `src/app/api/v1/` (REST endpoints), `src/app/api/cron/` (background triggers)
- Contains: Route handlers using Next.js `route.ts` pattern with POST/GET/PUT/DELETE
- Depends on: Services, database, utilities (validation, auth, response formatting)
- Used by: Frontend UI, external API consumers

**Services:**
- Purpose: Business logic encapsulation for each domain (AI, CMS, Auth, Companies, etc.)
- Location: `src/lib/services/`
- Contains: Classes/objects with static methods handling operations (create, update, fetch, process)
- Key files: `user.service.ts`, `ai/ai.service.ts`, `company.service.ts`, workflow handlers
- Depends on: Database (Drizzle ORM), external APIs (OpenAI, Gemini, n8n), utilities
- Used by: API routes, cron jobs, background task handlers

**Database Layer:**
- Purpose: Data persistence with multi-tenant isolation
- Location: `src/lib/db/`
- Contains: Drizzle ORM schema, migrations, seed scripts
- Key files: `index.ts` (connection singleton), `schema.ts` (3190 lines, all tables and relations)
- Depends on: PostgreSQL, environment config
- Used by: All services and route handlers

**Frontend/UI Components:**
- Purpose: Server-rendered pages (public) and client-side dashboard UI
- Location: `src/components/` (reusable components), `src/app/` (pages and layouts)
- Contains: React components (both RSC and client), layout wrappers, forms
- Uses: Shadcn/radix-ui, react-hook-form, zod validation, tailwind CSS
- Depends on: API routes (via fetch), hooks (usePermissions), context providers
- User-facing: HTML rendered by Next.js

**Utilities & Helpers:**
- Purpose: Cross-cutting functions (validation, logging, rate limiting, CSRF, response formatting)
- Location: `src/lib/utils/`
- Contains: `api-response.ts`, `validation.ts`, `logger.ts`, `rate-limit.ts`, `sanitize.ts`, `markdown.ts`
- Depends on: zod for validation, redis for rate limiting, standard Node APIs
- Used by: API routes, services, client components

**Authentication & Authorization:**
- Purpose: Session management, API key auth, JWT validation, CSRF protection
- Location: `src/lib/auth/`
- Contains: `session.ts`, `api-key.ts`, `auth-context.ts`, `permissions.ts`
- Key flows:
  - JWT in secure httpOnly cookie (set via `createSession()`)
  - CSRF token in dual-submit pattern (cookie + header check in `src/proxy.ts`)
  - API key auth for programmatic access
  - Permissions loaded per-request via middleware and cached in client context
- Used by: Middleware (`src/proxy.ts`), route handlers, client hooks

## Data Flow

**Public Page Request (Website):**

1. User visits `/` or `/it-news/[slug]`
2. Next.js App Router matches route to `src/app/(public)/page.tsx` or `src/app/(public)/[...slug]/page.tsx`
3. Route renders using CMS data via `CmsService` (calls `src/lib/services/cms.service.ts`)
4. CMS service queries database (via `src/lib/db/index.ts`) for pages, blocks, navigation
5. Page server-renders with SEO metadata and global CMS navigation
6. HTML returned to client with design theme from `designSettings` table (global, not tenant-scoped)
7. No auth required; CORS handled in `src/proxy.ts` middleware

**Authenticated User Login Flow:**

1. User submits login form to `POST /api/v1/auth/login`
2. Route handler in `src/app/api/v1/auth/login/route.ts`:
   - Rate limits via `rateLimit()` (Redis-backed)
   - Validates email/password with Zod schema
   - Calls `UserService.authenticate(tenantId, email, password)`
   - Service finds user, compares password hash (bcrypt)
   - Updates `lastLoginAt` timestamp
   - Returns `SessionUser` (id, tenantId, email, role, roleId)
3. Route handler calls `createSession(user)` to generate JWT signed with `JWT_SECRET`
4. JWT stored in httpOnly, Secure, SameSite cookie
5. CSRF token generated and returned to client (stored in `csrf_token` cookie)
6. Client redirected to `/intern/` (authenticated dashboard)

**Dashboard Data Fetch with Permissions:**

1. Dashboard layout (`src/app/intern/(dashboard)/layout.tsx`) mounts `PermissionProvider`
2. Provider calls `GET /api/v1/auth/permissions` to fetch user's role permissions
3. Route handler (`src/app/api/v1/auth/permissions/route.ts`):
   - Extracts JWT from cookies via middleware (`src/proxy.ts`)
   - Verifies token via `jwtVerify()`
   - Loads user from database using `userId` from payload
   - Queries `rolePermissions` table for user's role
   - Returns permissions map keyed by module (e.g., `{ companies: { read: true, create: true } }`)
4. Client component calls `usePermissions()` hook to check `hasPermission('companies', 'read')`
5. Renders UI conditionally based on permissions

**API Route with Auth Guard & Service Call:**

Example: `POST /api/v1/companies/[id]/research`

1. Request comes in with JWT in cookie, CSRF tokens in cookie and `x-csrf-token` header
2. Middleware (`src/proxy.ts`):
   - Validates CSRF token (double-submit cookie check)
   - Verifies JWT signature
   - Extracts `userId`, `tenantId`, `role` from payload
   - Attaches to request context
3. Route handler calls `withPermission(request, 'companies', 'create')`
4. Permission guard verifies user has permission, returns 403 if denied
5. Handler parses body, validates input with Zod schema
6. Calls `CompanyService.research(tenantId, companyId, researchParams)`
7. Service:
   - Queries database for company (verifying tenantId match)
   - Calls AI service `LeadResearchService.research()` to generate research data
   - Inserts `companyResearches` records into database
   - Returns operation result
8. Route handler returns `apiSuccess()` with result data
9. Client receives `{ success: true, data: {...}, meta?: {...} }`

**Background Cron Job Execution:**

1. Next.js server starts, calls `register()` in `src/instrumentation.ts`
2. Guard checks: not in build phase, not in edge runtime, only once per process (HMR guard)
3. Stagger first tick by 30s (let migrations run first)
4. Every 60s, call `CronService.tick()`
5. Service in `src/lib/services/cron.service.ts`:
   - Queries `cronJobs` table for pending jobs (status='pending', nextRunAt <= now)
   - For each job, deserializes handler from `handlerCode` (stored as string)
   - Calls handler (e.g., `CronJobHandlers.sendNewsletters()`)
   - Updates job status, `lastRunAt`, `nextRunAt`
   - Catches errors and logs via `logger.error()`
6. Jobs run in-process, use same DB connection pool and logger as main app

**State Management (Client):**

1. Permissions fetched once via `PermissionProvider`, cached in React Context
2. Form state managed locally with `react-hook-form` + Zod validation
3. No centralized client state (Redux, Zustand) observed; component-level state via useState
4. API calls via `fetch()`, responses handled in event handlers
5. Toast notifications via `sonner` library on success/error
6. Theme toggling managed by `next-themes` provider

## Key Abstractions

**Service Pattern:**
- Purpose: Encapsulate domain logic and external API interactions
- Examples: `UserService`, `CompanyService`, `AiService`, `CmsService`, `DinAuditService`
- Pattern: Static methods on singleton objects, pure functions with side effects
- Invariant: Services always scope operations to `tenantId` (passed as first param)

**API Response Wrapper:**
- Purpose: Consistent response format across all endpoints
- File: `src/lib/utils/api-response.ts`
- Pattern: `apiSuccess<T>(data, meta)` returns `{ success: true, data, meta }`, `apiError(code, message, status)` returns `{ success: false, error: { code, message, details } }`
- Rationale: Standardizes client error handling, enables metadata (pagination, stats)

**Drizzle ORM Schema Relations:**
- Purpose: Define database structure with type-safe queries
- File: `src/lib/db/schema.ts` (3190 lines)
- Pattern: Each table has `pgTable()` definition + `relations()` for foreign keys and one-to-many relationships
- Multi-tenancy: Every table includes `tenantId` foreign key, indexed for performance
- Example: `tenantsRelations` defines `many(users)`, `many(companies)`, etc. — enables querying via relations

**Rate Limiting:**
- Purpose: Prevent abuse and brute force attacks
- File: `src/lib/utils/rate-limit.ts`
- Pattern: Redis-backed sliding window, IP-based keys (e.g., `rate:auth-login:{ip}`)
- Usage: `const limited = await rateLimit(request, 'auth-login', 10, 60_000)` — max 10 requests per 60s

**Validation & Zod Schemas:**
- Purpose: Input validation and type inference
- Files: `src/lib/utils/validation.ts` (shared schemas), individual route files (domain-specific)
- Pattern: Define schema once, use for validation + TypeScript types
- Response: `validateAndParse(schema, data)` returns `{ success, data?, errors? }`, formatted errors sent to client

**Permission Guard:**
- Purpose: Check user has module+action permission before executing
- File: `src/lib/auth/permissions.ts`
- Pattern: `withPermission(request, module, action)` returns error or next(request)
- Storage: `rolePermissions` table (roleId, module, canCreate/Read/Update/Delete booleans)
- Lookup: Cached in session JWT payload or fetched per-request

## Entry Points

**Public Website:**
- Location: `src/app/(public)/layout.tsx` → root layout
- Triggers: Requests to `/` (homepage), `/it-news`, `/datenschutz`, etc.
- Responsibilities:
  - Load global design settings (theme, fonts, colors)
  - Fetch CMS navigation from database (cached, no tenantId filtering)
  - Render header/footer with xKMU branding
  - Pass children (page content) to DesignProvider for styling

**Authentication Pages:**
- Location: `src/app/intern/(auth)/layout.tsx`
- Pages: `login/page.tsx`, `register/page.tsx`
- Triggers: Requests to `/intern/login`, `/intern/register`
- Responsibilities:
  - Show login/register forms
  - Submit to `POST /api/v1/auth/login` or `POST /api/v1/auth/register`
  - Redirect to dashboard on success, show error on failure
  - No permission checks (public routes)

**Authenticated Dashboard:**
- Location: `src/app/intern/(dashboard)/layout.tsx`
- Sections: blog, CMS, CRM, companies, leads, DIN audit, WIBA, catalog, cockpit, etc.
- Triggers: Requests to `/intern/blog`, `/intern/contacts`, `/intern/din-audit`, etc.
- Responsibilities:
  - Load user session from JWT cookie (middleware validates)
  - Mount PermissionProvider to load and cache permissions
  - Render sidebar navigation with modules
  - Pass children (feature pages) with context
  - Each feature page calls APIs (`GET /api/v1/{resource}`) to load data

**API Server (v1):**
- Location: `src/app/api/v1/`
- Routes: `/auth/*`, `/companies/*`, `/blog/*`, `/cms/*`, `/din/*`, `/wiba/*`, `/ai/*`, etc.
- Triggers: HTTP requests from frontend, webhooks, third-party integrations
- Responsibilities:
  - Validate requests (CSRF, JWT, input schema)
  - Check permissions (RBAC)
  - Call services to execute business logic
  - Return standardized JSON responses

**Cron Scheduler:**
- Location: `src/instrumentation.ts`
- Trigger: Server startup (Node.js runtime only, not build phase)
- Responsibilities:
  - Start in-process interval (60s)
  - Call `CronService.tick()` to process pending jobs
  - Log execution, catch errors, continue running

## Error Handling

**Strategy:** Try-catch at route handler level, log errors, return standardized error responses

**Patterns:**
- **Validation errors:** `apiValidationError(details)` with field-level feedback
  - Example: `{ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [{ field: 'email', message: 'Invalid email' }] } }`
- **Auth errors:** `apiUnauthorized()` (401) for missing JWT, `apiForbidden()` (403) for missing permissions
- **Not found:** `apiNotFound()` (404) for missing resources (company, user, etc.)
- **Server errors:** `apiServerError()` (500) with generic message, actual error logged
- **Rate limit:** Return 429 with error message
- **CSRF failure:** Return 403 with error message in `src/proxy.ts`

**Logging:**
- File: `src/lib/utils/logger.ts`
- Pattern: `logger.info(message, { module: 'ModuleName' })`, `logger.error(message, error, { module: 'ModuleName' })`
- Context: Each call includes module name for traceability
- Output: Console (JSON structure in production for log aggregation)

## Cross-Cutting Concerns

**Logging:** Console-based logger in `src/lib/utils/logger.ts`, called from services and route handlers with module context

**Validation:** Zod schemas in `src/lib/utils/validation.ts` (shared) and route files (domain-specific), `validateAndParse()` utility returns typed result

**Authentication:** 
- JWT in httpOnly cookie (set by `createSession()`)
- CSRF in cookie + header (double-submit pattern validated in `src/proxy.ts`)
- Session verified per-request via middleware

**Authorization:** Role-based permissions checked via `withPermission()` guard, permissions map cached in client context via `usePermissions()` hook

**Multi-tenancy:** Every table includes `tenantId` foreign key, all queries filtered by `tenantId`, services always scope operations by tenant

**Request/Response:** Standardized format via `apiSuccess()` and `apiError()` utilities, pagination meta attached when applicable

---

*Architecture analysis: 2026-04-13*
