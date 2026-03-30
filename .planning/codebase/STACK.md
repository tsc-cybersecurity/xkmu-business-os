# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (`tsconfig.json`, `package.json`)
- Target: ES2017, module resolution: bundler, strict mode enabled

**Secondary:**
- Shell scripts - Docker entrypoints (`docker/app/entrypoint.sh`, `docker/app/entrypoint.prod.sh`)
- SQL - Database migrations (`drizzle/migrations/`)

## Runtime

**Environment:**
- Node.js 20 (Alpine) - specified in `docker/app/Dockerfile` (`FROM node:20-alpine`)
- No `.nvmrc` file present

**Package Manager:**
- npm (lockfile: `package-lock.json`)
- Scripts defined in `package.json`

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack framework with App Router (`next.config.ts`)
  - Standalone output mode for Docker (`output: 'standalone'`)
  - Server Actions enabled (10MB body size limit)
  - CORS headers configured for `/api/*` routes
- React 19.2.4 - UI library
- React DOM 19.2.4

**ORM/Database:**
- Drizzle ORM 0.45.1 - PostgreSQL ORM (`src/lib/db/index.ts`)
- Drizzle Kit 0.31.8 - Migration tooling (`drizzle.config.ts`)
  - Schema: `src/lib/db/schema.ts` (2551 lines)
  - Migrations output: `drizzle/migrations/`
  - Dialect: PostgreSQL

**Testing:**
- Vitest 4.1.0 - Test runner
- @vitest/coverage-v8 4.1.0 - Coverage via V8

**Build/Dev:**
- Tailwind CSS 4 - Utility-first CSS (via `@tailwindcss/postcss` plugin)
- PostCSS (`postcss.config.mjs`) - CSS processing
- ESLint 9.39.3 + eslint-config-next 16.1.6 (`eslint.config.mjs`)
- tsx 4.21.0 - TypeScript execution for scripts/seeds

## Key Dependencies

**Critical:**
- `postgres` 3.4.8 - PostgreSQL driver (postgres.js), lazy-initialized with connection pooling (max 20) in `src/lib/db/index.ts`
- `jose` 6.1.3 - JWT handling for authentication
- `bcryptjs` 3.0.3 - Password hashing
- `zod` 4.3.6 - Schema validation
- `nodemailer` 8.0.0 - SMTP email sending (`src/lib/services/email.service.ts`)

**UI Components:**
- `radix-ui` 1.4.3 - Headless UI primitives
- `lucide-react` 0.575.0 - Icon library
- `recharts` 3.7.0 - Charts/data visualization
- `react-hook-form` 7.71.1 + `@hookform/resolvers` 5.2.2 - Form management with Zod integration
- `sonner` 2.0.7 - Toast notifications
- `next-themes` 0.4.6 - Dark/light mode support

**Styling Utilities:**
- `class-variance-authority` 0.7.1 - Component variant styling
- `clsx` 2.1.1 - Conditional class names
- `tailwind-merge` 3.4.0 - Tailwind class deduplication
- `tw-animate-css` 1.4.0 - CSS animations for Tailwind
- `@tailwindcss/typography` 0.5.19 - Prose styling

**Drag and Drop:**
- `@dnd-kit/core` 6.3.1 - Drag-and-drop framework
- `@dnd-kit/sortable` 10.0.0 - Sortable lists
- `@dnd-kit/utilities` 3.2.2

**Document Processing:**
- `exceljs` 4.4.0 - Excel file generation/parsing
- `jspdf` 4.2.0 + `jspdf-autotable` 5.0.7 - PDF generation
- `pdf-parse` 2.4.5 - PDF text extraction (server-external package)
- `mammoth` 1.11.0 - DOCX to HTML conversion

## Configuration

**TypeScript:**
- `tsconfig.json`: Strict mode, ES2017 target, bundler module resolution
- Path alias: `@/*` maps to `./src/*`
- JSX: react-jsx

**Next.js (`next.config.ts`):**
- Standalone output for Docker
- Server external packages: `postgres`, `pdf-parse`
- Remote image patterns: `www.xkmu.de`
- Server Actions body limit: 10MB

**Database (`drizzle.config.ts`):**
- Schema: `./src/lib/db/schema.ts`
- Migrations: `./drizzle/migrations`
- Dialect: PostgreSQL
- SSL configurable via `DATABASE_SSL` env var

**ESLint (`eslint.config.mjs`):**
- Extends next/core-web-vitals and next/typescript
- Default ignores: `.next/`, `out/`, `build/`

**PostCSS (`postcss.config.mjs`):**
- Plugin: `@tailwindcss/postcss`

## Build & Run Commands

```bash
npm run dev            # Next.js dev server
npm run build          # Production build (next build)
npm run start          # Production server (next start)
npm run lint           # ESLint
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run Drizzle migrations
npm run db:push        # Push schema to DB (no migration files)
npm run db:studio      # Drizzle Studio (DB browser)
npm run db:seed        # Seed database (npx tsx src/lib/db/seed.ts)
npm run db:seed:din    # Seed DIN spec data
npm run db:seed:wiba   # Seed WIBA data
npm run test           # Run all tests (vitest run)
npm run test:unit      # Unit tests only (src/__tests__/unit)
npm run test:integration  # Integration tests (src/__tests__/integration)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

## Platform Requirements

**Development:**
- Node.js 20+
- PostgreSQL database (local or remote)
- npm for package management

**Production (Docker):**
- Docker with multi-stage build (`docker/app/Dockerfile`)
- Node.js 20 Alpine base image
- PostgreSQL 16 client tools included for backup/migration
- Redis 7 Alpine for session caching (`docker-compose.local.yml`)
- Volumes: `./data/uploads` for BI documents and media uploads
- Entrypoint performs: DB wait, migration (`drizzle-kit push`), seeding, then starts server

**Docker Compose Variants:**
- `docker-compose.yml` - Base/development
- `docker-compose.local.yml` - Production on Hetzner server (connects to Supabase PostgreSQL)
- `docker-compose.prod.yml` - Alternative production
- `docker-compose.coolify.yml` - Coolify deployment (legacy)

---

*Stack analysis: 2026-03-30*
