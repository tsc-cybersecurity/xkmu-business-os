# Codebase Concerns

**Analysis Date:** 2026-03-30

## Security Concerns

### SQL Injection via `sql.raw()` in Database Import

- Issue: The database import route uses `sql.raw()` to execute user-supplied SQL statements parsed from uploaded `.sql` files. While only INSERT statements against whitelisted tables are accepted, the statement content itself is not sanitized beyond regex matching.
- Files: `src/app/api/v1/import/database/route.ts:188` (DELETE with string interpolation), `src/app/api/v1/import/database/route.ts:212` (raw INSERT execution)
- Impact: A crafted SQL file could potentially inject malicious SQL within an INSERT statement (e.g., subqueries, function calls). The DELETE uses string interpolation for `tenantId` which comes from the authenticated session (lower risk, but still bad practice).
- Fix approach: Use parameterized queries for DELETE. For INSERT, consider parsing values and re-constructing parameterized inserts rather than executing raw SQL strings.

### Wildcard CORS on All API Routes

- Issue: `Access-Control-Allow-Origin: *` is set for all `/api/*` routes in `next.config.ts:32`. Combined with `Access-Control-Allow-Credentials: true`, this allows any origin to make credentialed requests.
- Files: `next.config.ts:30-36`
- Impact: Any website can make API calls to the application. While session cookies use `sameSite: lax`, API key-based auth via headers is fully exposed.
- Fix approach: Replace wildcard with explicit allowed origins (e.g., `boss.xkmu.de`). Remove `Allow-Credentials` if wildcard is kept (browsers reject `*` with credentials anyway, but it signals intent).

### No CSRF Protection

- Issue: No CSRF tokens or middleware detected. No `middleware.ts` file exists. Session cookies use `sameSite: lax` which protects against POST from cross-origin, but GET-based state changes would be vulnerable.
- Files: `src/lib/auth/session.ts:30-33` (cookie config)
- Impact: Any mutation via GET request (if any exist) is vulnerable to CSRF. The `sameSite: lax` setting mitigates most POST-based CSRF.
- Fix approach: Add Next.js middleware for CSRF token validation on mutation routes, or ensure all mutations use POST/PUT/DELETE only.

### No Security Headers (CSP, X-Frame-Options, etc.)

- Issue: No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, or other security headers are configured.
- Files: `next.config.ts` (no security headers in `headers()` function)
- Impact: Application is vulnerable to clickjacking, MIME-type sniffing, and has no XSS mitigation from CSP.
- Fix approach: Add security headers in `next.config.ts` `headers()` function: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy` with appropriate directives.

### Hardcoded Default Admin Credentials in Source Code

- Issue: Default admin email and password are hardcoded as fallbacks in seed files. These are committed to version control.
- Files: `src/lib/db/seed-check.ts:20-21`, `src/lib/db/seed.ts:14-15`
- Impact: If `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` env vars are not set, a known email/password combination is used. The password `fG58Ebj2@MDv6uvm` is in the git history.
- Fix approach: Remove hardcoded fallbacks. Require env vars or fail the seed process if they are missing.

### API Key Auth Bypasses Permission Checks

- Issue: In `withPermission()`, when auth role is `'api'`, the handler is called immediately without any module/action permission check.
- Files: `src/lib/auth/require-permission.ts:25-27`
- Impact: Any valid API key gets full access to all modules and all actions, regardless of the intended scope. This defeats the purpose of granular permissions.
- Fix approach: Check API key scopes against the requested module/action, similar to how roleId permissions are checked.

### Duplicate `getAuthContext` Implementations (14 files)

- Issue: 14 API route files define their own local `getAuthContext()` function instead of using the shared one from `src/lib/auth/auth-context.ts`. These have slightly different implementations and inconsistent permission checks.
- Files: `src/app/api/v1/companies/[id]/research/route.ts`, `src/app/api/v1/email/send/route.ts`, `src/app/api/v1/export/database/route.ts`, `src/app/api/v1/import/database/route.ts`, `src/app/api/v1/leads/[id]/research/route.ts`, `src/app/api/v1/persons/[id]/research/route.ts`, `src/app/api/v1/companies/[id]/crawl/route.ts`, `src/app/api/v1/companies/[id]/analyze-document/route.ts`, `src/app/api/v1/companies/[id]/persons/route.ts`, `src/app/api/v1/companies/[id]/research/[researchId]/apply/route.ts`, `src/app/api/v1/companies/[id]/research/[researchId]/reject/route.ts`, `src/app/api/v1/ideas/[id]/convert/route.ts`, `src/app/api/v1/leads/[id]/outreach/route.ts`, `src/app/api/v1/ai-prompt-templates/seed/route.ts`
- Impact: Inconsistent auth handling. Some check admin role, some don't. Bug fixes to auth logic must be replicated across all 14 copies.
- Fix approach: Migrate all 14 routes to use the shared `getAuthContext` from `src/lib/auth/auth-context.ts` and wrap with `withPermission()`.

### No HTML Sanitization Library

- Issue: Markdown rendering uses `dangerouslySetInnerHTML` with a custom markdown-to-HTML converter. While `escapeHtml()` is applied to text content, there is no DOMPurify or similar library to sanitize the final HTML output.
- Files: `src/lib/utils/markdown.ts`, `src/app/_components/markdown-renderer.tsx:14`, `src/app/intern/(dashboard)/settings/email-templates/page.tsx:238`
- Impact: If any edge case in the custom markdown parser produces unsafe HTML, XSS is possible. The email template preview renders raw HTML from the database.
- Fix approach: Add `dompurify` (or `isomorphic-dompurify`) as a dependency and sanitize all `dangerouslySetInnerHTML` inputs.

## Performance Concerns

### Sequential Awaits in Loops (N+1 Query Patterns)

- Issue: Multiple services execute database queries inside for-loops, causing N+1 query patterns.
- Files:
  - `src/lib/services/ai-prompt-template.service.ts:128-129` - checks existing per slug in seedDefaults loop
  - `src/lib/services/cms-block.service.ts:106-107` - updates sort order one-by-one
  - `src/lib/services/cms-navigation.service.ts:105-106` - updates sort order one-by-one
  - `src/lib/services/din-audit.service.ts:204-205` - saves answers one-by-one
  - `src/lib/services/document-calculation.service.ts:194-195` - updates item sort order one-by-one
  - `src/lib/services/ai/image-generation.service.ts:477-478` - deletes images one-by-one
  - `src/app/api/v1/processes/dev-tasks/generate/route.ts:98-99` - loads tasks per process
  - `src/app/api/v1/social-media/topics/generate/route.ts:60-61` - creates topics one-by-one
- Impact: Slow operations for lists with many items. Each loop iteration adds a database round-trip.
- Fix approach: Use batch operations: `INSERT ... VALUES (...), (...)`, bulk `UPDATE` with `CASE WHEN`, or `Promise.all()` where order doesn't matter.

### In-Memory Rate Limiter Does Not Scale

- Issue: Rate limiting uses an in-memory `Map` that only works for a single process/container.
- Files: `src/lib/utils/rate-limit.ts`
- Impact: If the app runs with multiple replicas (horizontal scaling), rate limits are per-instance, not global. An attacker could bypass limits by hitting different instances.
- Fix approach: The docker-compose already includes Redis (`REDIS_URL` is configured). Move rate limiting to Redis with `INCR`/`EXPIRE` pattern.

### Monolithic Schema File (2551 lines)

- Issue: The entire database schema is in a single file.
- Files: `src/lib/db/schema.ts` (2551 lines)
- Impact: Difficult to navigate, slow IDE responsiveness, merge conflicts likely when multiple features touch the schema.
- Fix approach: Split into domain-specific schema files (e.g., `schema/auth.ts`, `schema/crm.ts`, `schema/cms.ts`) and re-export from an index.

### Large Page Components

- Issue: Several page components exceed 600-1000+ lines, mixing data fetching, state management, and UI.
- Files:
  - `src/app/intern/(dashboard)/cockpit/page.tsx` (1158 lines)
  - `src/components/shared/ai-research-card.tsx` (1047 lines)
  - `src/app/intern/(dashboard)/prozesse/dev/page.tsx` (983 lines)
  - `src/app/intern/(dashboard)/cybersecurity/grundschutz/assets/[id]/page.tsx` (883 lines)
  - `src/app/intern/(dashboard)/cms/[id]/blocks/[blockId]/_components/block-field-renderer.tsx` (878 lines)
  - `src/app/intern/(dashboard)/chancen/page.tsx` (763 lines)
  - `src/app/intern/(dashboard)/catalog/_components/product-form.tsx` (760 lines)
- Impact: Hard to maintain, test, and review. Slow re-renders when any state changes in a large component.
- Fix approach: Extract sub-components, custom hooks for data fetching, and separate container/presentation patterns.

## Code Quality Concerns

### Excessive `as any` Casts (42 instances)

- Issue: 42 occurrences of `as any` across the codebase, concentrated in the CMS block field renderer.
- Files: `src/app/intern/(dashboard)/cms/[id]/blocks/[blockId]/_components/block-field-renderer.tsx` (20+ instances), `src/app/_components/cms-block-renderer.tsx` (4 instances)
- Impact: Defeats TypeScript's type safety. Runtime errors possible from incorrect assumptions about data shape.
- Fix approach: Define proper interfaces for each CMS block type's content structure. Use discriminated unions for block types.

### ESLint Rule Suppressions

- Issue: 8 `eslint-disable` comments, primarily suppressing `react-hooks/exhaustive-deps`.
- Files: `src/app/intern/(dashboard)/cybersecurity/basisabsicherung/[id]/checklist/[checklistId]/page.tsx:133,157`, `src/app/intern/(dashboard)/cybersecurity/grundschutz/page.tsx:117`, `src/app/intern/(dashboard)/ideas/[id]/page.tsx:72`, `src/app/intern/(dashboard)/prozesse/page.tsx:304`, `src/app/intern/(dashboard)/wiba/[id]/interview/page.tsx:137`, `src/app/_components/blocks/blog-listing-block.tsx:52`
- Impact: Missing dependencies in `useEffect` can cause stale closures and bugs that are hard to debug.
- Fix approach: Fix dependency arrays or extract logic into stable callbacks with `useCallback`.

### Inconsistent Error Handling in Newer Routes

- Issue: Newer API routes (grundschutz, ir-playbook) use `console.error` instead of the established `logger` utility.
- Files: `src/app/api/v1/grundschutz/assets/route.ts:45,64`, `src/app/api/v1/grundschutz/assets/[id]/route.ts:21,44,65`, `src/app/api/v1/grundschutz/assets/[id]/controls/route.ts:33`, `src/app/api/v1/ir-playbook/route.ts:22,44`, `src/app/api/v1/ir-playbook/views/route.ts:28`, `src/app/api/v1/ir-playbook/[id]/route.ts:21,37`
- Impact: These errors may not appear in structured logs. Inconsistent with the codebase convention of using `logger.error()`.
- Fix approach: Replace `console.error` with `logger.error(message, error, { module: '...' })` pattern.

### Silent Error Swallowing in AI Services

- Issue: Many AI service catch blocks are empty (no error variable captured, no logging).
- Files: `src/lib/services/ai/ai.service.ts:272,335,382`, `src/lib/services/ai/blog-ai.service.ts:175`, `src/lib/services/ai/business-intelligence-ai.service.ts:55`, `src/lib/services/ai/cms-ai.service.ts:37,74`, `src/lib/services/ai/document-analysis.service.ts:73`, `src/lib/services/ai/image-generation.service.ts:460`
- Impact: AI failures are silently swallowed. Debugging AI issues becomes very difficult because errors leave no trace.
- Fix approach: Add `logger.warn()` or `logger.error()` in catch blocks, even if the error is expected/recoverable.

## Test Coverage Gaps

### Only 19 of 70 Services Have Unit Tests

- Issue: 70 service files exist in `src/lib/services/`, but only 19 have corresponding unit tests.
- Files: `src/__tests__/unit/services/` (19 test files) vs `src/lib/services/` (70 service files)
- Untested critical services include:
  - `src/lib/services/ai-provider.service.ts` - AI provider management
  - `src/lib/services/email.service.ts` - Email sending
  - `src/lib/services/tenant.service.ts` - Multi-tenant management
  - `src/lib/services/tenant-seed.service.ts` - Tenant data seeding
  - `src/lib/services/opportunity.service.ts` - Sales pipeline
  - `src/lib/services/project.service.ts` - Project management
  - `src/lib/services/firecrawl.service.ts` - Web scraping
  - `src/lib/services/api-key.service.ts` - API key management
- Impact: 73% of services have zero automated tests. Regressions can ship unnoticed.
- Risk: High - especially for auth-related services (`api-key.service.ts`, `tenant.service.ts`)
- Fix approach: Prioritize tests for auth, email, and tenant services. Use existing test patterns from `src/__tests__/unit/services/` as templates.

### Only 4 Integration Tests

- Issue: Only 4 integration test files exist for 215 API routes.
- Files: `src/__tests__/integration/api/` (admin-database, auth, companies, export-database)
- Impact: API contract changes can break clients without test failures.
- Fix approach: Add integration tests for critical flows: login, CRUD on core entities, permission checks.

### No E2E Tests

- Issue: No end-to-end test framework or tests detected.
- Impact: Full user flows (login -> create entity -> verify) are never automatically tested.
- Fix approach: Add Playwright or Cypress for critical paths.

## Architecture Concerns

### No Next.js Middleware

- Issue: No `middleware.ts` file exists at the project root or in `src/`.
- Impact: No centralized auth check, no request logging, no redirect logic. Each API route must handle its own auth independently, leading to the duplicated `getAuthContext` problem.
- Fix approach: Add `middleware.ts` with auth verification for `/api/v1/*` (except public routes) and `/intern/*` paths.

### Docker-Compose Exposes Default Secrets

- Issue: `docker-compose.local.yml` contains default values for secrets (JWT_SECRET, Redis password, Supabase DB password) via `${VAR:-default}` syntax.
- Files: `docker-compose.local.yml:37-38`
- Impact: If deployed without setting env vars, the application runs with known credentials.
- Fix approach: Remove default values for security-critical variables. Fail startup if they are not set.

### Session Has No Refresh/Rotation

- Issue: JWT sessions last 7 days with no refresh mechanism. Once issued, a token is valid until expiry.
- Files: `src/lib/auth/session.ts:6` (7-day duration), no refresh endpoint exists
- Impact: Compromised tokens remain valid for up to 7 days. No way to revoke sessions (stateless JWT).
- Fix approach: Add a shorter-lived access token with a refresh token pattern, or store sessions server-side for revocation capability.

## Dependencies at Risk

### No Lock File Pinning Visible

- Issue: All dependencies in `package.json` use caret ranges (`^`), which means minor/patch updates can change behavior.
- Files: `package.json`
- Impact: Builds may produce different results depending on when `npm install` runs. A breaking change in a minor version could cause production issues.
- Fix approach: Ensure `package-lock.json` or equivalent is committed and used in CI/Docker builds with `npm ci`.

---

*Concerns audit: 2026-03-30*
