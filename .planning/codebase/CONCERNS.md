# Codebase Concerns

**Analysis Date:** 2026-04-13

## Fire-and-Forget Async Operations

**Webhook and Workflow Triggers:**
- Issue: Workflows and webhooks are fired asynchronously without awaiting completion or guaranteed delivery
- Files: `src/lib/services/lead.service.ts` (lines 344, 351, 373), `src/app/api/v1/contact/route.ts`, `src/app/api/v1/companies/route.ts`
- Impact: Failed webhook/workflow execution is silently swallowed; no retry mechanism; business logic may not complete. Leads changing status might trigger workflows that fail without operator visibility.
- Current: Some calls use `.catch(() => {})` which silently ignores errors; others don't catch at all
- Fix approach: Implement a webhook/workflow delivery queue (extend TaskQueueService) with retry logic and dead-letter tracking

## Database Connection Pooling

**Low Pool Size for High Concurrency:**
- Issue: Fixed pool size of 20 connections with idle_timeout of 20 seconds
- Files: `src/lib/db/index.ts` (lines 40-42)
- Impact: Under load (e.g., multiple email syncs, IR playbook imports, concurrent requests), connection exhaustion can cause request queueing or timeouts. No adaptive scaling.
- Current: `max: 20, idle_timeout: 20, connect_timeout: 10`
- Fix approach: Profile production load; increase `max` to 40-50 and add connection metrics/monitoring

## N+1 Query Patterns

**IR Playbook Service Escalation Levels:**
- Issue: Fetching all escalation levels in loop, then separately querying recipients per level
- Files: `src/lib/services/ir-playbook.service.ts` (lines 91-99)
- Impact: 1 query for levels + N queries for recipients; scales linearly with escalation levels. Large incident playbooks trigger many DB round-trips.
- Fix approach: Use SQL JOIN to fetch levels + recipients in single query, or batch the recipient fetches

**Email Sync - No Batch Processing:**
- Issue: `syncAccount()` processes messages one at a time in a loop without batching
- Files: `src/lib/services/email-imap.service.ts` (lines 82-93)
- Impact: Each message triggers separate DB insert; many emails in a single sync session means many roundtrips
- Fix approach: Batch inserts into groups of 50-100 messages per transaction

## Type Safety Issues with `as unknown` / `as any`

**Unsafe Type Coercion in Services:**
- Issue: 1028+ uses of `as any`, `as unknown`, `!!`, `!.` across codebase
- Files: Widespread across `src/lib/services/**`, `src/app/intern/**`, `src/components/**`
- Impact: Runtime errors if shape assumptions fail; harder to refactor; loses TypeScript safety benefits
- Current: Examples: `src/lib/services/ir-playbook.service.ts` line 59, `src/lib/services/ir-playbook.service.ts` line 68, `src/lib/services/ir-playbook.service.ts` line 76
- Fix approach: Add stricter `tsconfig` settings; run `@typescript-eslint/no-unsafe-type` linter rule; migrate hot-path services first

## Missing Transaction Boundaries

**IR Playbook Import - Partial Success Risk:**
- Issue: Large JSON import in `importFullPlaybook()` inserts groups/controls/links but if one insert fails mid-stream, partial data remains in DB
- Files: `src/lib/services/grundschutz-catalog.service.ts` (lines 150+)
- Impact: Database integrity compromised; next import has conflicting data; manual cleanup required
- Current: Uses `db.transaction()` for catalog import (good) but not all import services do
- Fix approach: Ensure ALL multi-step imports use transactions; add rollback testing

## Workflow Engine Condition Evaluation

**Limited Expression Language - Silent Fallback:**
- Issue: `evaluateCondition()` uses regex-based parsing for simple conditions; unknown formats default to `true`
- Files: `src/lib/services/workflow/engine.ts` (lines 39-84, specifically line 79-80)
- Impact: Typos in condition syntax silently execute the step when intended to skip. Complex conditions can't be expressed. Debugging difficult.
- Fix approach: Add condition validation at workflow creation time; log unexpected formats as warnings; consider expression evaluator library (e.g., `expr-eval`)

## SMTP Transport Not Closed

**Resource Leak in Email Sending:**
- Issue: `nodemailer` transport created but never explicitly closed
- Files: `src/lib/services/email-smtp.service.ts` (lines 48-90)
- Impact: SMTP connections may linger after send; under high email volume, connection leaks accumulate
- Fix approach: Add `transport.close()` in finally block; test with connection monitoring

## Unhandled Promise Rejections

**Cron Ticker Async Handler:**
- Issue: `CronService.tick()` error caught but execution continues; no circuit breaker
- Files: `src/instrumentation.ts` (lines 47-52)
- Impact: If tick() starts failing (e.g., DB connection lost), it will keep retrying every 60s with no backoff, logging errors but not alerting
- Fix approach: Add exponential backoff, circuit breaker, or alert threshold after N consecutive failures

## CSRF Cookie Set as Non-HttpOnly

**Security Configuration Issue:**
- Issue: CSRF token cookie set with `httpOnly: false` to allow frontend read
- Files: `src/proxy.ts` (lines 173-178)
- Impact: JavaScript can access token; vulnerable to XSS attacks that steal the token. The double-submit cookie pattern requires frontend access, but this is still risky.
- Current: `httpOnly: false, secure: process.env.NODE_ENV === 'production'`
- Fix approach: Consider storing CSRF token in JavaScript memory or sessionStorage only; validate that secure flag is set in production (confirm via env check in logs)

## Rate Limiting Fails Open Without Alerting

**Silent Degradation When Redis Down:**
- Issue: Rate limiter returns null (allows request) when Redis is unavailable
- Files: `src/lib/utils/rate-limit.ts` (lines 33-38, 51-54)
- Impact: If Redis goes down, rate limiting is completely disabled. API becomes vulnerable to brute-force attacks on login, email send, etc. Only warning is a log line.
- Fix approach: Return 503 Service Unavailable instead of failing open on auth endpoints; alert on Redis connection failures

## Workflow Engine Continues After Step Failures

**Partial Workflow Execution - No Halt Mechanism:**
- Issue: Individual step failures don't stop workflow; missing action definitions are logged but workflow continues
- Files: `src/lib/services/workflow/engine.ts` (lines 169, 188-195)
- Impact: Workflow marked as completed even with critical failures; dependent steps execute with incomplete data; operator unaware of partial failure
- Fix approach: Add step `requiresSuccess` flag to mark blocking steps; update completion logic to mark as failed if any required step fails

## Large Monolithic Components

**Overly Complex Pages (800+ lines):**
- Issue: Multiple UI pages exceed 1000 lines; tightly coupled logic
- Files: 
  - `src/app/intern/(dashboard)/cybersecurity/ir-playbook/page.tsx` (1063 lines)
  - `src/app/intern/(dashboard)/finance/contracts/[id]/page.tsx` (629 lines)
  - `src/app/intern/(dashboard)/settings/tenant/page.tsx` (703 lines)
  - `src/app/intern/(dashboard)/emails/page.tsx` (877 lines)
- Impact: Hard to test, slow to compile, high refactor risk, components resist reuse
- Fix approach: Extract forms into separate components (`ContractForm`, `TenantSettingsForm`); create custom hooks for form state management

## Seed Data Security Concerns

**Hardcoded Placeholder Credentials:**
- Issue: Seed files contain placeholder data (bank IBANs, passwords) that might be used in development
- Files: `src/lib/db/seeds/`, `src/app/intern/(dashboard)/settings/tenant/page.tsx` (lines 505, 528 show placeholder BIC codes)
- Impact: If seed data is accidentally deployed to production or used as template, credentials are visible. No validation prevents reusing seed credentials.
- Fix approach: Never seed production; add SQL constraint to reject seed IBANs/BICS; document seed-data-only markers

## Email Sync Message Parsing Fragility

**Multiple Exception Handlers with Silent Failures:**
- Issue: Message parsing in `email-imap.service.ts` has nested try-catch blocks (lines 84-93) with error increments but limited context
- Files: `src/lib/services/email-imap.service.ts`
- Impact: Malformed emails silently fail to sync; users unaware of missing messages. Error count incremented but no detail on which UID failed or why.
- Fix approach: Log UID and error details; implement retry for transient failures; separate parsing errors from message-not-found

## JSON Repair Fallback in AI Responses

**Truncated Response Handling Not Guaranteed:**
- Issue: `parseJsonFromResponse()` in lead-research service attempts repair but may still fail silently
- Files: `src/lib/services/ai/lead-research.service.ts` (lines 200-228)
- Impact: Truncated AI responses lose data; research result is marked complete but contains incomplete analysis
- Fix approach: Return error instead of throwing; let caller decide whether to retry or use partial data; log truncation as warning with token count

## Missing Idempotency Keys

**Task Queue - No Idempotency for Retries:**
- Issue: TaskQueue operations (create, execute) lack idempotency keys
- Files: `src/lib/services/task-queue.service.ts`
- Impact: If a task is retried, it may execute twice (e.g., duplicate email send, duplicate webhook call). No way to deduplicate based on intent.
- Fix approach: Add optional `idempotencyKey` field to task; check if key exists before processing

## Database SSL Configuration Default

**SSL Disabled by Default for Non-Docker:**
- Issue: `getSslConfig()` defaults to `false` (no SSL) for non-Docker environments
- Files: `src/lib/db/index.ts` (lines 21-33)
- Impact: Production PostgreSQL connections may run over unencrypted TCP if DATABASE_SSL not explicitly set. Risk in cloud deployments.
- Fix approach: Default to `ssl: 'require'` in production; only disable for Docker/local dev with explicit flag

## Email Account Sync Without Bounds

**No Limits on Sync Scope:**
- Issue: `syncAccount()` fetches all messages since last sync (or 30 days) with no batch size limit
- Files: `src/lib/services/email-imap.service.ts` (lines 65-71)
- Impact: Syncing account with thousands of unsync'd emails causes OOM or long hanging request. No pagination/chunking.
- Fix approach: Implement max messages per sync (e.g., 500); return continuation token for client to paginate

## Validation Library Bloat

**Large Validation File (753 lines):**
- Issue: `src/lib/utils/validation.ts` contains all Zod schemas in one file
- Files: `src/lib/utils/validation.ts`
- Impact: Hard to find schemas; slow IDE performance; tightly couples unrelated features; refactoring one schema affects file size checks
- Fix approach: Split into feature-specific files (e.g., `schemas/lead.ts`, `schemas/company.ts`); use barrel exports

## Untyped Error Handlers

**Catch Blocks with `unknown`:**
- Issue: Many error handlers cast caught errors to string without type guards
- Files: Throughout services and API routes
- Impact: Loss of error stack traces; difficulty debugging; generic messages to users
- Current pattern: `catch(err) { const msg = err instanceof Error ? err.message : String(err) }`
- Fix approach: Create standardized error type (AppError extends Error); log full error with context; return structured error response

## Missing Tenant Isolation Audit

**No Verification that All Queries are Tenant-Scoped:**
- Issue: Large codebase without automated checks that queries include tenant filters
- Files: All service files
- Impact: Potential data leak if developer forgets tenant filter in multi-tenant queries. No linting rule prevents this.
- Fix approach: Add ESLint rule or comment-based guard; audit high-risk services (lead, company, opportunity); add integration test for tenant isolation per module

---

*Concerns audit: 2026-04-13*
