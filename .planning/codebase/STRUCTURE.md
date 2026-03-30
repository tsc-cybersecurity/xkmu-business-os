# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
xKMU-BusinessOS/
├── src/                        # All application source code
│   ├── app/                    # Next.js App Router (pages + API)
│   ├── components/             # Shared React components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Core business logic, DB, auth, utils
│   └── __tests__/              # Test files
├── drizzle/                    # Drizzle ORM migration files
│   └── migrations/             # SQL migration files
├── docker/                     # Docker config and scripts
│   ├── app/                    # App Dockerfile context
│   ├── postgres/               # PostgreSQL custom config
│   └── scripts/                # Deployment scripts
├── data/                       # Runtime data (not committed)
│   └── uploads/                # User-uploaded files
├── docs/                       # Project documentation
├── public/                     # Static assets (favicon, etc.)
├── docker-compose.yml          # Development compose
├── docker-compose.local.yml    # Production compose (on server)
├── docker-compose.prod.yml     # Alternative production compose
├── drizzle.config.ts           # Drizzle ORM configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vitest.config.ts            # Test configuration
├── eslint.config.mjs           # ESLint configuration
├── postcss.config.mjs          # PostCSS configuration
└── components.json             # shadcn/ui configuration
```

## Directory Purposes

**`src/app/`** - Next.js App Router
- Purpose: All routes (pages and API endpoints)
- Contains: Route groups, page components, API handlers, layouts
- Key files: `layout.tsx` (root), `globals.css`

**`src/app/(public)/`** - Public Website
- Purpose: Marketing/landing pages visible without authentication
- Contains: Static pages (impressum, datenschutz, agb), service pages, blog
- Layout: `src/app/(public)/layout.tsx` (navbar + footer + breadcrumb)

**`src/app/intern/(auth)/`** - Authentication Pages
- Purpose: Login and registration flows
- Contains: `login/page.tsx`, `register/page.tsx`

**`src/app/intern/(dashboard)/`** - Authenticated Dashboard
- Purpose: All internal business application pages
- Contains: Feature-specific directories, each with `page.tsx`
- Layout: `src/app/intern/(dashboard)/layout.tsx` (sidebar + header + chat)

**`src/app/api/v1/`** - REST API
- Purpose: All API endpoints, versioned under v1
- Contains: Resource-based directories with `route.ts` files
- Pattern: Each directory = one resource, nested `[id]/route.ts` for single-item operations

**`src/components/`** - Shared Components
- Purpose: Reusable React components used across pages
- Contains: UI primitives, layout, domain-specific component groups

**`src/lib/`** - Core Library
- Purpose: All non-UI code (business logic, DB, auth, utilities)
- Contains: Organized by concern (auth, db, services, utils, types, constants)

**`src/__tests__/`** - Test Files
- Purpose: Unit and integration tests
- Contains: Mirrors source structure under `unit/` and `integration/`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout (fonts, metadata, DesignProvider)
- `src/app/intern/(dashboard)/layout.tsx`: Dashboard shell (auth check, sidebar, header, chat)
- `src/app/(public)/layout.tsx`: Public site shell (navbar, footer)

**Configuration:**
- `next.config.ts`: Next.js config (standalone output, CORS headers, image domains)
- `drizzle.config.ts`: Drizzle ORM config (connection, migration output)
- `tsconfig.json`: TypeScript config (path aliases: `@/` -> `src/`)
- `vitest.config.ts`: Test runner config
- `components.json`: shadcn/ui component config

**Database:**
- `src/lib/db/schema.ts`: All 70+ table definitions (2551 lines, single file)
- `src/lib/db/index.ts`: Connection pool with lazy initialization via Proxy
- `src/lib/db/seed.ts`: Seed runner
- `src/lib/db/seeds/`: Individual seed files (DIN, WiBA, CMS seeds)
- `src/lib/db/table-whitelist.ts`: Allowed tables for DB admin operations

**Authentication:**
- `src/lib/auth/session.ts`: JWT session create/get/delete/require
- `src/lib/auth/auth-context.ts`: Unified auth extraction (session or API key)
- `src/lib/auth/require-permission.ts`: `withPermission()` middleware
- `src/lib/auth/permissions.ts`: Permission check against DB
- `src/lib/auth/api-key.ts`: API key validation

**Validation:**
- `src/lib/utils/validation.ts`: All Zod schemas (739 lines, single file)

**API Response Helpers:**
- `src/lib/utils/api-response.ts`: `apiSuccess`, `apiError`, pagination helpers

**Logging:**
- `src/lib/utils/logger.ts`: Console-based structured logger

**Types:**
- `src/lib/types/auth.types.ts`: Session, AuthContext, ApiKeyPayload types
- `src/lib/types/permissions.ts`: Module/Action definitions, default role permissions

## Service Layer Organization

**`src/lib/services/`** contains 50+ service files following the pattern `{domain}.service.ts`:

**CRM Services:**
- `lead.service.ts`: Lead management (CRUD, filtering, scoring)
- `company.service.ts`: Company management
- `person.service.ts`: Contact person management
- `opportunity.service.ts`: Sales opportunities
- `activity.service.ts`: Activity tracking (calls, emails, notes)

**Finance Services:**
- `document.service.ts`: Invoices and offers
- `document-calculation.service.ts`: Price/tax calculations
- `document-template.service.ts`: Document templates
- `receipt.service.ts`: Receipt management

**Content Services:**
- `blog-post.service.ts`: Blog posts
- `cms-page.service.ts`, `cms-block.service.ts`, `cms-navigation.service.ts`: CMS system
- `social-media-post.service.ts`, `social-media-topic.service.ts`: Social media
- `marketing-campaign.service.ts`, `marketing-task.service.ts`: Marketing campaigns

**Security/Audit Services:**
- `din-audit.service.ts`, `din-scoring.service.ts`, `din-pdf.service.ts`: DIN SPEC 27076 audits
- `wiba-audit.service.ts`, `wiba-scoring.service.ts`, `wiba-pdf.service.ts`: WiBA checks
- `grundschutz-audit.service.ts`, `grundschutz-catalog.service.ts`, `grundschutz-asset.service.ts`: BSI Grundschutz
- `ir-playbook.service.ts`: Incident response playbooks
- `cockpit.service.ts`: IT system cockpit

**AI Services (`src/lib/services/ai/`):**
- `ai.service.ts`: Core AI abstraction (provider registry, routing, logging)
- `gemini.provider.ts`, `openai.provider.ts`, `openrouter.provider.ts`, `deepseek.provider.ts`, `kimi.provider.ts`, `ollama.provider.ts`: AI providers
- `lead-research.service.ts`: AI-powered lead/company research
- `blog-ai.service.ts`: AI blog generation
- `marketing-ai.service.ts`: AI marketing content
- `social-media-ai.service.ts`: AI social posts
- `cms-ai.service.ts`: AI CMS content
- `idea-ai.service.ts`: Idea processing
- `image-generation.service.ts`: AI image generation
- `kie.provider.ts`, `kie.service.ts`: kie.ai video generation

**Infrastructure Services:**
- `webhook.service.ts`: Outgoing webhooks
- `task-queue.service.ts`: Background task queue
- `email.service.ts`, `email-template.service.ts`: Email sending
- `n8n.service.ts`: n8n workflow integration
- `firecrawl.service.ts`, `firecrawl-research.service.ts`: Web scraping
- `media-upload.service.ts`: File uploads
- `image-optimizer.service.ts`: Image optimization

## Component Organization

**`src/components/ui/`** - UI Primitives (shadcn/ui)
- 23 components: `button.tsx`, `card.tsx`, `dialog.tsx`, `table.tsx`, `input.tsx`, `select.tsx`, `tabs.tsx`, `form.tsx`, `badge.tsx`, etc.
- Pattern: shadcn/ui components, do not modify directly

**`src/components/layout/`** - Layout Components
- `sidebar.tsx`: Main navigation sidebar
- `header.tsx`: Top header bar with user info
- `breadcrumbs.tsx`: Breadcrumb navigation

**`src/components/shared/`** - Reusable Business Components
- `confirm-dialog.tsx`: Confirmation modal
- `empty-state.tsx`: Empty state placeholder
- `form-field.tsx`: Form field wrapper
- `loading-states.tsx`: Loading spinners/skeletons
- `quick-create-dialog.tsx`: Quick entity creation
- `ai-research-card.tsx`: AI research results display
- `icon-picker.tsx`: Icon selector
- `image-field.tsx`: Image upload field
- `image-generator-dialog.tsx`: AI image generation dialog

**`src/components/chat/`** - AI Chat Components
- `chat-provider.tsx`: Chat context provider
- `chat-button.tsx`: Floating chat trigger
- `chat-panel.tsx`: Chat panel UI

**`src/components/din-audit/`** - DIN Audit Components
**`src/components/wiba/`** - WiBA Check Components

## Dashboard Route Structure

```
src/app/intern/(dashboard)/
├── dashboard/                  # Main dashboard/home
├── leads/                      # Lead management
│   ├── page.tsx               # Lead list
│   ├── new/page.tsx           # Create lead
│   ├── [id]/page.tsx          # Lead detail
│   └── _components/           # Lead-specific components
├── contacts/                   # Contact management
│   ├── companies/page.tsx     # Company list
│   └── persons/page.tsx       # Person list
├── chancen/page.tsx           # Opportunities (Google Maps search)
├── catalog/                    # Product catalog
│   ├── products/page.tsx
│   ├── services/page.tsx
│   ├── categories/page.tsx
│   └── _components/
├── finance/                    # Financial documents
│   ├── invoices/page.tsx
│   ├── offers/page.tsx
│   └── _components/
├── marketing/                  # Marketing campaigns
│   ├── page.tsx               # Campaign list
│   ├── new/page.tsx
│   ├── [id]/page.tsx
│   ├── newsletter/page.tsx
│   └── templates/page.tsx
├── social-media/               # Social media management
│   ├── page.tsx
│   ├── new/page.tsx
│   ├── [id]/page.tsx
│   ├── topics/page.tsx
│   └── content-plan/page.tsx
├── blog/                       # Blog management
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
├── ideas/                      # Idea management
│   ├── page.tsx
│   └── [id]/page.tsx
├── projekte/                   # Project management
│   └── [id]/page.tsx
├── prozesse/                   # Process handbook
│   ├── page.tsx
│   ├── [id]/page.tsx
│   └── dev/page.tsx
├── zeiterfassung/page.tsx     # Time tracking
├── cybersecurity/              # Security tools
│   ├── basisabsicherung/      # Basic security assessment
│   ├── grundschutz/           # BSI Grundschutz
│   └── ir-playbook/           # Incident response
├── din-audit/                  # DIN SPEC 27076 audits
│   ├── page.tsx
│   ├── new/page.tsx
│   ├── [id]/page.tsx
│   └── grants/page.tsx
├── wiba/                       # WiBA checks
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
├── business-intelligence/      # BI dashboard
├── cockpit/page.tsx           # IT system cockpit
├── chat/page.tsx              # AI chat
├── cms/                        # CMS editor
│   ├── page.tsx
│   ├── [id]/page.tsx
│   ├── navigation/page.tsx
│   └── templates/page.tsx
├── website/page.tsx           # Website preview
├── images/page.tsx            # Image generation
├── marketing-ki/page.tsx      # AI marketing agent
├── n8n-workflows/              # n8n integration
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
└── settings/                   # System settings
    ├── profile/page.tsx
    ├── tenant/page.tsx
    ├── users/page.tsx
    ├── roles/page.tsx
    ├── ai-providers/page.tsx
    ├── ai-prompts/page.tsx
    ├── ai-logs/page.tsx
    ├── api-keys/page.tsx
    ├── webhooks/page.tsx
    ├── email-templates/page.tsx
    ├── database/page.tsx
    ├── n8n/page.tsx
    ├── task-queue/page.tsx
    ├── import/page.tsx
    ├── export/page.tsx
    ├── api-docs/page.tsx
    └── app-docs/page.tsx
```

## API Route Structure

```
src/app/api/
├── health/                     # Health check endpoint
└── v1/                         # Versioned API
    ├── auth/                   # Login, register, logout, session
    ├── leads/                  # Lead CRUD + [id] + inbound
    ├── companies/              # Company CRUD + [id]
    ├── persons/                # Person CRUD + [id]
    ├── opportunities/          # Opportunity CRUD
    ├── products/               # Product CRUD + [id]
    ├── product-categories/     # Category CRUD
    ├── documents/              # Invoice/offer CRUD + [id]
    ├── document-templates/     # Document template CRUD
    ├── ai/                     # AI completion endpoints
    ├── ai-providers/           # AI provider config
    ├── ai-prompt-templates/    # Prompt template CRUD
    ├── ai-logs/                # AI usage logs
    ├── chat/                   # Chat conversations
    ├── blog/                   # Blog posts
    ├── cms/                    # CMS pages + blocks
    ├── marketing/              # Campaigns + tasks
    ├── social-media/           # Posts + topics
    ├── newsletter/             # Newsletter management
    ├── ideas/                  # Idea CRUD + AI processing
    ├── activities/             # Activity tracking
    ├── din/                    # DIN audit endpoints
    ├── wiba/                   # WiBA check endpoints
    ├── grundschutz/            # BSI Grundschutz
    ├── ir-playbook/            # Incident response
    ├── cockpit/                # IT system cockpit
    ├── business-intelligence/  # BI analysis
    ├── images/                 # Image generation
    ├── media/                  # File uploads
    ├── email/                  # Email sending
    ├── email-templates/        # Email templates
    ├── feedback/               # Feedback forms
    ├── projects/               # Project management
    ├── processes/              # Process handbook
    ├── time-entries/           # Time tracking
    ├── receipts/               # Receipt management
    ├── kpi/                    # KPI dashboard
    ├── seo/                    # SEO tools
    ├── export/                 # Data export
    ├── import/                 # Data import
    ├── n8n/                    # n8n integration
    ├── kie/                    # kie.ai video
    ├── webhooks/               # Webhook config
    ├── api-keys/               # API key management
    ├── users/                  # User management
    ├── roles/                  # Role management
    ├── tenant/                 # Tenant settings
    ├── admin/                  # Admin operations
    ├── dashboard/              # Dashboard aggregation
    ├── contact/                # Public contact form
    ├── public/                 # Public API (no auth)
    └── task-queue/             # Background task management
```

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx`
- API routes: `route.ts`
- Services: `kebab-case.service.ts` (e.g., `lead.service.ts`, `blog-post.service.ts`)
- AI providers: `kebab-case.provider.ts` (e.g., `gemini.provider.ts`)
- UI components: `kebab-case.tsx` (e.g., `confirm-dialog.tsx`)
- Types: `kebab-case.types.ts` (e.g., `auth.types.ts`)
- Seeds: `kebab-case.seed.ts` (e.g., `din-requirements.seed.ts`)
- Task handlers: `kebab-case.handler.ts`

**Directories:**
- Route groups: `(groupname)` (e.g., `(public)`, `(auth)`, `(dashboard)`)
- Dynamic routes: `[param]` (e.g., `[id]`, `[slug]`)
- Private components: `_components/` (not routable)
- Resource names: kebab-case plural (e.g., `leads/`, `social-media/`, `ai-providers/`)

**Code Naming:**
- Services: PascalCase const objects (e.g., `LeadService`, `CompanyService`)
- Schemas: camelCase (e.g., `createLeadSchema`, `updateCompanySchema`)
- DB tables: camelCase exports, snake_case SQL names
- Types/Interfaces: PascalCase (e.g., `LeadWithRelations`, `CreateLeadInput`)

## Where to Add New Code

**New Feature (e.g., "Tickets"):**
1. DB schema: Add table to `src/lib/db/schema.ts` with `tenantId` FK
2. Run migration: `npx drizzle-kit generate` then `npx drizzle-kit migrate`
3. Validation: Add Zod schemas to `src/lib/utils/validation.ts`
4. Service: Create `src/lib/services/ticket.service.ts`
5. API routes: Create `src/app/api/v1/tickets/route.ts` and `src/app/api/v1/tickets/[id]/route.ts`
6. Permission: Add module to `MODULES` array in `src/lib/types/permissions.ts`
7. Dashboard page: Create `src/app/intern/(dashboard)/tickets/page.tsx`
8. Sidebar link: Add entry in `src/components/layout/sidebar.tsx`
9. Tests: Add to `src/__tests__/unit/services/` or `src/__tests__/integration/api/`

**New AI-Powered Feature:**
1. Create domain AI service: `src/lib/services/ai/{domain}-ai.service.ts`
2. Use `AIService.complete()` from `src/lib/services/ai/ai.service.ts`
3. Add prompt template via `AiPromptTemplateService.getOrDefault(tenantId, slug)` from `src/lib/services/ai-prompt-template.service.ts`
4. API route: `src/app/api/v1/{resource}/generate/route.ts` or similar

**New Shared Component:**
- Reusable business component: `src/components/shared/{name}.tsx`
- UI primitive: Use `npx shadcn@latest add {component}` (adds to `src/components/ui/`)
- Feature-specific: `src/app/intern/(dashboard)/{feature}/_components/{name}.tsx`

**New Utility:**
- Shared helper: `src/lib/utils/{name}.ts`
- Constants: `src/lib/constants/{name}.ts`
- Types: `src/lib/types/{name}.ts`

## Special Directories

**`data/uploads/`:**
- Purpose: User-uploaded files (media, documents)
- Generated: Yes (at runtime)
- Committed: No

**`drizzle/migrations/`:**
- Purpose: SQL migration files generated by Drizzle Kit
- Generated: Yes (via `npx drizzle-kit generate`)
- Committed: Yes

**`docker/`:**
- Purpose: Docker build context, PostgreSQL config, deployment scripts
- Generated: No
- Committed: Yes

**`src/app/_components/`:**
- Purpose: Root-level shared components (DesignProvider, landing page components)
- Contains: `design-provider.tsx`, `landing-navbar.tsx`, `landing-footer.tsx`, `breadcrumb.tsx`, `blocks/` (CMS block renderers)
- Not routable (underscore prefix)

**`src/lib/db/seeds/`:**
- Purpose: Seed data for catalog/reference tables (DIN requirements, WiBA requirements, CMS defaults)
- Generated: No
- Run via: `src/lib/db/seed.ts`

---

*Structure analysis: 2026-03-30*
