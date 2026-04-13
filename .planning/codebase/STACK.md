# Technology Stack

**Analysis Date:** 2026-04-13

## Languages

**Primary:**
- TypeScript 5.9.3 - Entire application codebase (`src/` and configuration files)
- JavaScript - Build/dev tooling configuration

**Secondary:**
- SQL - Database schema and migrations (`drizzle/migrations/`)
- HTML/CSS - Generated via React/Next.js templating

## Runtime

**Environment:**
- Node.js 20+ (v24.14.1 currently, no explicit .nvmrc constraint)
- npm 11.11.0+

**Package Manager:**
- npm (workspace-based, single package.json in root)
- Lockfile: package-lock.json (presence assumed, typical for npm)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework, SSR/API routes
- React 19.2.4 - UI component library
- React DOM 19.2.4 - DOM rendering

**Database:**
- Drizzle ORM 0.45.1 - TypeScript-first ORM for PostgreSQL
- Drizzle Kit 0.31.8 - Schema migration and management tool
- postgres 3.4.8 - PostgreSQL client (pure JavaScript, serverless-compatible)

**UI Components & Styling:**
- Tailwind CSS 4 (with @tailwindcss/postcss 4) - Utility-first CSS framework
- shadcn/ui (via Radix UI 1.4.3) - Accessible React component library
- Radix UI 1.4.3 - Headless component primitives
- class-variance-authority 0.7.1 - Component style variants
- tailwind-merge 3.4.0 - Safe Tailwind class merging
- lucide-react 0.575.0 - Icon library
- next-themes 0.4.6 - Theme management (dark/light mode)

**Testing:**
- Vitest 4.1.0 - Unit testing framework (Vite-based, Jest-compatible)
- @vitest/coverage-v8 4.1.0 - Code coverage reporting

**Build & Development:**
- PostCSS 4 (via @tailwindcss/postcss) - CSS transformation pipeline
- TypeScript 5.9.3 - Type checking and compilation
- tsx 4.21.0 - TypeScript execution for scripts (db:seed commands)
- ESLint 9.39.3 - Code linting
- eslint-config-next 16.1.6 - Next.js linting rules
- tw-animate-css 1.4.0 - Animation utilities for Tailwind

## Key Dependencies

**Critical:**
- drizzle-orm 0.45.1 - Data access layer (database operations)
- next 16.1.6 - Application framework
- react 19.2.4 - UI rendering engine

**Infrastructure & Utilities:**
- jose 6.1.3 - JWT creation/verification for session management (`src/lib/auth/session.ts`)
- bcryptjs 3.0.3 - Password hashing (`src/lib/auth/`, `src/lib/db/seed.ts`)
- nodemailer 8.0.5 - Email sending via SMTP (`src/lib/services/email.service.ts`)
- ioredis 5.10.1 - Redis client for optional session caching (`src/lib/utils/redis-client.ts`)
- clsx 2.1.1 - Conditional class name utilities

**Document Processing:**
- jspdf 4.2.0 - PDF generation (`src/lib/services/*-pdf.service.ts`)
- jspdf-autotable 5.0.7 - PDF table generation
- pdf-parse 2.4.5 - PDF text extraction (`src/app/api/v1/business-intelligence/documents/[id]/extract/route.ts`)
- mammoth 1.11.0 - Word document (.docx) parsing
- exceljs 4.4.0 - Excel file parsing and generation
- isomorphic-dompurify 3.7.1 - XSS sanitization for HTML content

**Email & Communication:**
- imapflow 1.3.1 - IMAP client for email account syncing (`src/lib/services/email-imap.service.ts`)
- @types/imapflow 1.0.23 - TypeScript types

**UI Libraries:**
- react-hook-form 7.71.1 - Form state management
- @hookform/resolvers 5.2.2 - Form validation adapters
- zod 4.3.6 - Schema validation
- recharts 3.7.0 - React charting library
- sonner 2.0.7 - Toast notifications

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Headless drag-and-drop utilities
- @dnd-kit/sortable 10.0.0 - Sortable preset for dnd-kit
- @dnd-kit/utilities 3.2.2 - dnd-kit helpers

## Configuration

**Environment:**
- `.env` file (see `.env.example` for template)
- Environment variables loaded by Next.js automatically
- `.env.example` documents all configurable options

**Build:**
- `tsconfig.json` - TypeScript compilation settings (target ES2017, strict mode)
- `next.config.ts` - Next.js configuration (standalone output for Docker, CSP headers)
- `drizzle.config.ts` - Drizzle Kit migration settings
- `postcss.config.mjs` - PostCSS pipeline configuration
- `eslint.config.mjs` - ESLint rules
- `vitest.config.ts` - Test runner configuration

**Critical Configuration Files:**
- `src/lib/db/schema.ts` - Drizzle schema definition (tables, relations)
- `src/lib/db/index.ts` - Database connection factory
- `src/lib/auth/session.ts` - JWT-based session management

## Platform Requirements

**Development:**
- Node.js 20+ (or per team policy if specified)
- npm 11+
- PostgreSQL 16+ (via Docker or local installation)
- Optional: Redis for session caching
- Optional: Ollama for local LLM inference

**Production:**
- Node.js 20+
- PostgreSQL 16+
- Standalone Docker container (builds to `output: standalone` in next.config.ts)
- Optional: Redis for distributed session management
- Memory: 512MB+ (application), 1GB+ (database)
- Storage: 10GB+ PostgreSQL volume (data-dependent)

**Deployment Targets Supported:**
- Docker (Coolify, Docker Compose, Kubernetes)
- Traditional VM/Server (systemd, PM2, etc.)
- Next.js-compatible serverless (Vercel, Netlify) - unlikely due to standalone build and long-running processes

---

*Stack analysis: 2026-04-13*
