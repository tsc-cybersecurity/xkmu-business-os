# Codebase Structure

**Analysis Date:** 2026-04-13

## Directory Layout

```
xkmu-business-os/
├── src/                          # Source code root
│   ├── app/                      # Next.js App Router (pages, API routes, layouts)
│   │   ├── (public)/            # Public routes (no auth required)
│   │   │   ├── layout.tsx        # Global public layout with CMS nav
│   │   │   ├── page.tsx          # Homepage
│   │   │   ├── [...slug]/page.tsx # CMS dynamic routes
│   │   │   ├── it-news/          # Blog listing & detail pages
│   │   │   ├── agb/              # Legal pages (AGB, Datenschutz, Impressum)
│   │   │   └── kontakt/page.tsx  # Contact form
│   │   ├── intern/               # Authenticated app (auth required)
│   │   │   ├── (auth)/           # Auth group (login, register)
│   │   │   │   ├── layout.tsx    # Auth page wrapper with branding
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   └── (dashboard)/      # Dashboard group (protected pages)
│   │   │       ├── layout.tsx    # Dashboard wrapper with sidebar nav
│   │   │       ├── blog/         # Blog management
│   │   │       ├── cms/          # CMS page editor
│   │   │       ├── contacts/     # Contact/person management
│   │   │       ├── crm/          # Company/lead management
│   │   │       ├── cockpit/      # System/integration controls
│   │   │       ├── din-audit/    # DIN 27001 audit module
│   │   │       ├── wiba/         # WIBA compliance module
│   │   │       ├── catalog/      # Product/service catalog
│   │   │       ├── business-intelligence/
│   │   │       ├── chat/         # AI chat interface
│   │   │       ├── ideas/        # Idea management
│   │   │       ├── finance/      # Accounting/invoicing
│   │   │       ├── emails/       # Email management
│   │   │       ├── leads/        # Lead database
│   │   │       ├── intelligence/ # BI insights
│   │   │       ├── processes/    # Process management
│   │   │       └── projects/     # Project management
│   │   ├── api/
│   │   │   ├── v1/               # REST API v1 endpoints
│   │   │   │   ├── auth/         # /api/v1/auth/* (login, logout, permissions)
│   │   │   │   ├── companies/    # /api/v1/companies/* (CRUD + research)
│   │   │   │   ├── blog/         # /api/v1/blog/posts/* (CRUD + AI generation)
│   │   │   │   ├── cms/          # /api/v1/cms/* (pages, blocks, navigation)
│   │   │   │   ├── chat/         # /api/v1/chat/* (conversations, messages)
│   │   │   │   ├── din/          # /api/v1/din/* (audits, requirements, grants)
│   │   │   │   ├── wiba/         # /api/v1/wiba/* (audits, requirements)
│   │   │   │   ├── ai/           # /api/v1/ai/* (completion, research, status)
│   │   │   │   ├── cockpit/      # /api/v1/cockpit/* (system configs)
│   │   │   │   └── [other]/      # contacts, leads, finance, ideas, etc.
│   │   │   ├── cron/
│   │   │   │   └── tick/route.ts # /api/cron/tick (background job trigger)
│   │   │   └── health/route.ts   # /api/health (liveness check)
│   │   ├── api-docs/             # API documentation pages
│   │   ├── _components/          # Layout-specific components
│   │   ├── fonts/                # Local font files (.woff2)
│   │   ├── globals.css           # Global Tailwind + custom CSS
│   │   └── layout.tsx            # Root layout with DesignProvider
│   ├── components/               # Reusable UI components
│   │   ├── chat/                 # Chat UI components
│   │   ├── din-audit/            # DIN audit UI components
│   │   ├── layout/               # Layout-specific components (sidebar, nav)
│   │   ├── shared/               # Shared components (tables, forms, dialogs)
│   │   ├── ui/                   # Shadcn/Radix UI base components (button, input, etc.)
│   │   ├── wiba/                 # WIBA UI components
│   │   └── csrf-provider.tsx     # CSRF token context provider
│   ├── hooks/                    # React hooks
│   │   └── use-permissions.tsx   # Permission checking hook + provider
│   ├── lib/                      # Core business logic layer
│   │   ├── auth/                 # Authentication & authorization
│   │   │   ├── session.ts        # JWT session creation/verification
│   │   │   ├── api-key.ts        # API key validation
│   │   │   ├── auth-context.ts   # Auth context types
│   │   │   └── permissions.ts    # Permission checking guard
│   │   ├── db/                   # Database layer
│   │   │   ├── index.ts          # Drizzle ORM connection singleton
│   │   │   ├── schema.ts         # Database schema (3190 lines, all tables)
│   │   │   ├── seed.ts           # Base seed script
│   │   │   ├── seed-check.ts     # Check if seed already run
│   │   │   ├── table-whitelist.ts # Admin inspection whitelist
│   │   │   └── seeds/            # Feature-specific seeds
│   │   │       ├── cms-seed.ts
│   │   │       ├── din-seed.ts
│   │   │       ├── wiba-seed.ts
│   │   │       ├── management-framework.seed.ts
│   │   │       └── [other].seed.ts
│   │   ├── services/             # Business logic (domain services)
│   │   │   ├── user.service.ts   # User CRUD & authentication
│   │   │   ├── company.service.ts
│   │   │   ├── blog.service.ts
│   │   │   ├── cms.service.ts
│   │   │   ├── cron.service.ts
│   │   │   ├── activity.service.ts
│   │   │   ├── ai-provider.service.ts
│   │   │   ├── ai-prompt-template.service.ts
│   │   │   ├── ai/               # AI-specific services
│   │   │   │   ├── ai.service.ts
│   │   │   │   ├── openai.provider.ts
│   │   │   │   ├── gemini.provider.ts
│   │   │   │   ├── deepseek.provider.ts
│   │   │   │   ├── ollama.provider.ts
│   │   │   │   ├── blog-ai.service.ts
│   │   │   │   ├── cms-ai.service.ts
│   │   │   │   ├── document-analysis.service.ts
│   │   │   │   ├── image-generation.service.ts
│   │   │   │   ├── lead-research.service.ts
│   │   │   │   ├── marketing-ai.service.ts
│   │   │   │   ├── website-scraper.service.ts
│   │   │   │   └── [other].service.ts
│   │   │   ├── workflow/         # Workflow/pipeline engine (future)
│   │   │   ├── task-queue-handlers/ # Background task handlers
│   │   │   └── [domain].service.ts # Domain-specific services
│   │   ├── types/                # TypeScript type definitions
│   │   │   ├── auth.types.ts     # User, Session, AuthContext types
│   │   │   └── permissions.ts    # Module, Action, Permission types
│   │   ├── utils/                # Utility functions (cross-cutting)
│   │   │   ├── api-response.ts   # apiSuccess(), apiError() utilities
│   │   │   ├── validation.ts     # Zod schemas & validateAndParse()
│   │   │   ├── logger.ts         # Console logger with module context
│   │   │   ├── rate-limit.ts     # Redis-backed rate limiting
│   │   │   ├── redis-client.ts   # Redis connection singleton
│   │   │   ├── sanitize.ts       # HTML/text sanitization
│   │   │   ├── markdown.ts       # Markdown parsing
│   │   │   ├── csrf.ts           # CSRF token generation
│   │   │   ├── icon-map.ts       # Icon name mappings
│   │   │   └── cms-metadata.ts   # CMS SEO & metadata utils
│   │   ├── constants/            # Constants & enums
│   │   ├── api-docs/             # API documentation registry
│   │   │   ├── registry.ts       # Doc registry builder
│   │   │   └── services/         # Doc files per API domain
│   │   │       ├── auth.ts
│   │   │       ├── companies.ts
│   │   │       ├── blog.ts
│   │   │       └── [other].ts
│   ├── __tests__/                # Test files
│   │   ├── unit/                 # Unit tests
│   │   └── integration/          # Integration tests
│   ├── instrumentation.ts        # Next.js hook for cron startup
│   └── proxy.ts                  # Middleware for auth, CSRF, CORS
├── drizzle/                      # Database migrations
│   └── migrations/               # SQL migration files
├── docker/                       # Docker configuration
│   ├── app/                      # App container
│   ├── postgres/                 # PostgreSQL container
│   └── scripts/                  # Container startup scripts
├── docs/                         # Documentation
│   └── superpowers/              # Feature documentation
├── public/                       # Static assets
├── .github/                      # GitHub Actions CI/CD
├── .planning/                    # Planning documents (GSD)
│   └── codebase/                 # Architecture documents (this folder)
├── .env                          # Environment variables (not committed)
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── drizzle.config.ts            # Drizzle ORM configuration
├── package.json                 # Node.js dependencies
├── eslint.config.mjs            # ESLint configuration
└── README.md                    # Project documentation
```

## Directory Purposes

**src/app/(public)/**
- Purpose: Public-facing website pages without authentication
- Contains: Homepage, blog listing, legal pages (AGB, Datenschutz, Impressum), contact form
- Key files: `layout.tsx` (wraps with global nav), `page.tsx` (homepage), `[...slug]/page.tsx` (CMS dynamic routes)

**src/app/intern/(auth)/**
- Purpose: Authentication pages (login, register, password reset)
- Contains: Login & register forms, API submission handlers
- Key files: `layout.tsx` (branded auth wrapper), `login/page.tsx`, `register/page.tsx`
- Guard: No auth required; public but restricted to unauthenticated users

**src/app/intern/(dashboard)/**
- Purpose: Main authenticated application with multiple business modules
- Contains: Blog management, CMS editor, CRM, DIN audit, WIBA, catalog, etc.
- Key files: `layout.tsx` (dashboard shell with sidebar), feature subdirectories
- Guard: Requires valid JWT session; permissions checked per module

**src/app/api/v1/**
- Purpose: RESTful API endpoints for all business operations
- Contains: CRUD routes, AI/service integrations, reporting endpoints
- Pattern: Each resource has `route.ts` with POST/GET/PUT/DELETE handlers
- Auth: JWT in cookie (validated by middleware), CSRF for mutations

**src/lib/db/**
- Purpose: Data persistence layer with Drizzle ORM
- Key file: `schema.ts` (3190 lines) — defines all 50+ tables, multi-tenant structure, relations
- Database: PostgreSQL with migrations in `drizzle/migrations/`
- Seeds: Feature-specific seed files for DIN, WIBA, CMS, management frameworks

**src/lib/services/**
- Purpose: Business logic encapsulation, organized by domain
- Pattern: Static methods on singleton objects (e.g., `UserService.create()`, `CompanyService.research()`)
- Scope: Each service scopes operations by `tenantId` (first parameter)
- AI services: Separate `ai/` subfolder with provider adapters (OpenAI, Gemini, Deepseek, Ollama) and domain-specific AI services (blog, CMS, document analysis, image generation, research)

**src/lib/auth/**
- Purpose: Authentication & authorization logic
- Components:
  - `session.ts`: JWT creation/verification (httpOnly cookie)
  - `permissions.ts`: Permission guard decorator for routes
  - `api-key.ts`: API key lookup and validation
  - `auth-context.ts`: Type definitions for auth data

**src/lib/utils/**
- Purpose: Cross-cutting utility functions
- Key files:
  - `api-response.ts`: Standardized response wrappers (`apiSuccess()`, `apiError()`)
  - `validation.ts`: Zod schemas for common inputs (login, register, etc.)
  - `logger.ts`: Console logging with module context
  - `rate-limit.ts`: Redis-backed rate limiting (brute-force protection)
  - `csrf.ts`: CSRF token generation
  - `sanitize.ts`: HTML/text sanitization (XSS protection)

**src/components/**
- Purpose: Reusable React UI components
- Structure:
  - `ui/`: Shadcn/Radix base components (button, input, dialog, etc.) — auto-generated
  - `shared/`: Domain-agnostic components (tables, forms, modals)
  - `layout/`: Dashboard navigation, sidebars, headers
  - Domain folders: `chat/`, `din-audit/`, `wiba/` for feature-specific UI

**src/hooks/**
- Purpose: React custom hooks for client-side logic
- Key: `use-permissions.tsx` — loads permissions from API, provides context for permission checks

**public/**
- Purpose: Static assets served directly by Next.js
- Contains: Favicons, images, fonts (though main fonts are in `src/app/fonts/`)

## Key File Locations

**Entry Points:**

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/(public)/page.tsx` | Homepage |
| `/intern/login` | `src/app/intern/(auth)/login/page.tsx` | Login page |
| `/intern/blog` | `src/app/intern/(dashboard)/blog/page.tsx` | Blog management |
| `POST /api/v1/auth/login` | `src/app/api/v1/auth/login/route.ts` | Login API |
| `GET /api/v1/auth/permissions` | `src/app/api/v1/auth/permissions/route.ts` | Permissions API |
| `POST /api/cron/tick` | `src/app/api/cron/tick/route.ts` | Cron trigger |

**Configuration:**

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js settings (CSP headers, image domains, server packages) |
| `tsconfig.json` | TypeScript compiler options & path aliases (`@/` = `src/`) |
| `tailwind.config.ts` | Tailwind CSS theme, plugins, content paths |
| `drizzle.config.ts` | Drizzle ORM migration & studio settings |
| `package.json` | Node.js dependencies & scripts (dev, build, test, db) |
| `eslint.config.mjs` | ESLint rules (next.js recommended) |

**Core Logic:**

| File | Purpose |
|------|---------|
| `src/lib/db/index.ts` | Drizzle ORM connection singleton |
| `src/lib/db/schema.ts` | Database schema (all tables, 3190 lines) |
| `src/lib/services/user.service.ts` | User CRUD & authentication |
| `src/lib/services/company.service.ts` | Company CRUD & research |
| `src/lib/services/cron.service.ts` | Background job processor |
| `src/lib/auth/permissions.ts` | RBAC permission checker |
| `src/lib/utils/api-response.ts` | API response utilities |
| `src/proxy.ts` | Middleware: JWT validation, CSRF check, CORS |
| `src/instrumentation.ts` | Next.js hook: cron ticker startup |

**Testing:**

| File | Purpose |
|------|---------|
| `src/__tests__/unit/` | Unit tests for utilities, services |
| `src/__tests__/integration/` | Integration tests for APIs |
| `vitest.config.ts` | Vitest configuration (if exists) |

## Naming Conventions

**Files:**

| Pattern | Example | Purpose |
|---------|---------|---------|
| `*.service.ts` | `user.service.ts` | Business logic class |
| `*.provider.ts` | `openai.provider.ts` | External API adapter |
| `*.types.ts` | `auth.types.ts` | TypeScript type definitions |
| `route.ts` | `src/app/api/v1/auth/login/route.ts` | Next.js route handler |
| `page.tsx` | `src/app/intern/(dashboard)/blog/page.tsx` | Next.js page component |
| `layout.tsx` | `src/app/intern/(dashboard)/layout.tsx` | Next.js layout wrapper |
| `*.test.ts` | `user.service.test.ts` | Test file (co-located) |
| `*-seed.ts` | `din-seed.ts` | Database seed script |

**Directories:**

| Pattern | Example | Purpose |
|---------|---------|---------|
| `(groupName)` | `(public)`, `(dashboard)` | Route group (no URL segment) |
| `[param]` | `[id]`, `[slug]` | Dynamic route segment |
| `[...slug]` | `[...slug]` | Catch-all route segment |
| Lowercase with hyphens | `din-audit/`, `blog-posts/` | Feature folders |

**Functions & Variables:**

| Pattern | Example | Purpose |
|---------|---------|---------|
| camelCase | `getUserById()`, `validateEmail()` | Functions, variables |
| PascalCase | `UserService`, `Session` | Classes, types, interfaces |
| UPPER_SNAKE_CASE | `SALT_ROUNDS`, `JWT_SECRET` | Constants |
| `use*` | `usePermissions()`, `useAsync()` | React hooks |
| `with*` | `withPermission()` | Higher-order function/wrapper |
| `is*`, `has*` | `isActive()`, `hasPermission()` | Boolean functions |

## Where to Add New Code

**New Feature (e.g., new module in dashboard):**

1. **Database schema:** Add table(s) to `src/lib/db/schema.ts`
   - Include `tenantId` foreign key, timestamps (`createdAt`, `updatedAt`)
   - Define relations if related to existing tables
   - Create seed script at `src/lib/db/seeds/feature-seed.ts`

2. **Service layer:** Create `src/lib/services/feature.service.ts`
   - Export static methods for CRUD, search, complex operations
   - Always scope by `tenantId` (first parameter)
   - Handle validation and business rules

3. **API routes:** Create `src/app/api/v1/feature/` directory
   - `route.ts` for collection endpoints (`GET` list, `POST` create)
   - `[id]/route.ts` for item endpoints (`GET`, `PUT`, `DELETE`)
   - Call `withPermission(request, 'feature', action)` guard at start
   - Validate input with Zod schema
   - Call service, return standardized response

4. **UI pages:** Create `src/app/intern/(dashboard)/feature/` directory
   - `page.tsx` for list view
   - `[id]/page.tsx` for detail/edit view
   - Call API endpoints via `fetch()`
   - Use `usePermissions()` hook to show/hide UI based on permissions

5. **Components:** Create `src/components/feature/` if complex UI
   - Extract form, table, dialog components into separate files
   - Use Shadcn/Radix UI base components for consistency

6. **Tests:** Create `src/__tests__/unit/services/feature.service.test.ts`
   - Test service methods independently
   - Mock database, external services

**New Component (shared across features):**

1. Create at `src/components/shared/{component-name}/` if reusable across modules
2. Or create at `src/components/{feature-name}/` if feature-specific
3. Use Shadcn/Radix base components from `src/components/ui/`
4. Export from `index.ts` if multi-file component

**New Utility Function:**

1. If cross-cutting (used in 3+ places): `src/lib/utils/feature-name.ts`
2. If domain-specific: Within the service or page that uses it
3. Write with clear parameters, return types, and error handling
4. Document edge cases in comments

**New API Provider (AI, external service):**

1. Create at `src/lib/services/ai/{provider-name}.provider.ts`
2. Implement provider interface (e.g., `async complete(prompt)`, `async generateImage(prompt)`)
3. Handle rate limiting, retry logic, error mapping
4. Return typed result
5. Register in `src/lib/services/ai/ai.service.ts` switch statement

## Special Directories

**drizzle/migrations/**
- Purpose: Database schema migrations (auto-generated by drizzle-kit)
- Generated: Yes (by `npm run db:generate`)
- Committed: Yes (part of source control)
- Approach: Auto-generated; modify schema.ts and run `db:generate` to create migration

**.next/**
- Purpose: Next.js build output (cache, server, static files)
- Generated: Yes (by `npm run build`)
- Committed: No (gitignored)

**public/**
- Purpose: Static assets served at root `/`
- Generated: No (manually added)
- Committed: Yes (images, favicons, etc.)

**docker/**
- Purpose: Container configuration for local dev and production
- Postgres, app service, environment setup
- Committed: Yes (part of deployment)

**.env (local only)**
- Purpose: Local environment variables (secrets, DB URL, API keys)
- Generated: No (manually created for local dev)
- Committed: No (.gitignored)

**.planning/codebase/**
- Purpose: Architecture documentation (ARCHITECTURE.md, STRUCTURE.md, TESTING.md, CONVENTIONS.md, CONCERNS.md)
- Generated: By GSD codebase mapper
- Committed: Yes (reference for development)

---

*Structure analysis: 2026-04-13*
