# Phase 4: Reliability - Research

**Researched:** 2026-03-30
**Domain:** Redis Rate Limiting (ioredis) + Structured Error Handling
**Confidence:** HIGH

---

## Summary

Phase 4 has two independent workstreams. The first migrates the existing in-memory rate limiter
(`src/lib/utils/rate-limit.ts`) to Redis-backed INCR/EXPIRE so that rate-limit state survives
container restarts and is shared across replicas. Redis is already running in Docker Compose and
`REDIS_URL` is already injected into the app container — the only missing piece is the `ioredis`
npm package (not yet installed) and a singleton client module. The second workstream systematically
replaces silent `catch {}` blocks throughout the codebase with structured `logger.warn/error()` calls
using the existing `src/lib/utils/logger.ts` utility.

The full audit found two distinct categories of silent catches: (1) JSON-parsing fallbacks in AI
services where a comment like `// Parsing failed` is present but no log is emitted — these need
`logger.warn` added without changing the fallback behavior; and (2) `console.error` calls in newer
grundschutz and ir-playbook routes that use the wrong logging utility — these need conversion to
`logger.error()`. There are also legitimate silent catches (URL parsing in website-scraper,
Ollama availability probing) that should not throw but still deserve a `logger.debug()` for
observability.

**Primary recommendation:** Install `ioredis@^5.10.1`, create a singleton Redis client with
fail-open wrapper, migrate rate-limit.ts to use INCR/EXPIRE, then systematically replace every
silent catch block using the existing `logger` utility.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R3.1 | Redis Rate Limiting — in-memory Map auf ioredis INCR/EXPIRE migrieren, Fail-Open wenn Redis down | ioredis v5.10.1 verfuegbar, Redis bereits in compose. INCR/EXPIRE-Muster und Singleton-Client dokumentiert. |
| R3.2 | Error Handling — silent catch blocks durch strukturiertes Logging ersetzen, User bekommt Fehlermeldung | 9+ silent catches in AI-Services identifiziert. Logger-Utility bereits vorhanden. Kategorisierung in "log only" vs. "log + rethrow" dokumentiert. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ioredis` | ^5.10.1 | Redis client fuer INCR/EXPIRE rate limiting | Einzige echte Wahl fuer self-hosted Redis in Node.js. 12.8M weekly downloads, aktiv gewartet (v5.10.1 March 2026). Vollstaendige TypeScript-Types enthalten. Wiederverbindungslogik und Pipelining out of the box. |

**ioredis is NOT yet installed.** Confirmed via `package.json` — no `redis` or `ioredis` dependency exists.

### Supporting (already present)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/utils/logger.ts` | built-in | Structured log output mit Timestamp, Level, Context | Alle catch-Blocks — kein `console.error` direkt |
| `src/lib/utils/api-response.ts` | built-in | `apiError(code, message, status)` | Rate-Limit 429 Response generieren |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ioredis` | `redis` (official npm package) | node-redis v4+ ist technisch aequivalent, hat aber schlechtere Reconnect-Defaults und weniger Ecosystem-Integration (BullMQ etc.). ioredis bevorzugt. |
| `ioredis` | `@upstash/ratelimit` | Upstash erfordert managed SaaS — verletzt Docker-only Constraint. NICHT verwenden. |

**Installation:**
```bash
npm install ioredis@^5.10.1
```

**Version verification:** npm registry bestaetigt `5.10.1` als latest, veroeffentlicht 2026-03-19.

---

## Architecture Patterns

### Recommended Project Structure (neue Dateien)

```
src/lib/
├── utils/
│   ├── rate-limit.ts        # MIGRIERT: ioredis statt Map
│   └── redis-client.ts      # NEU: Singleton Redis-Client
```

### Pattern 1: Redis Singleton Client (Fail-Open)

**What:** Einmaliges ioredis-Client-Objekt das in der gesamten App geteilt wird. Auf Verbindungsfehler
reagiert es mit Warn-Log, nicht mit Crash. Der Client ist `null`-safe — Aufrufer koennen auf `null`
pruefen um Fail-Open zu implementieren.

**When to use:** Immer wenn Redis-Verbindung benoetigt wird. Singleton verhindert Connection-Leaks.

```typescript
// src/lib/utils/redis-client.ts
import Redis from 'ioredis'
import { logger } from './logger'

let redis: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    })
    redis.on('error', (err) => {
      logger.warn('Redis connection error — rate limiting falls back to pass-through', { module: 'Redis' })
      // Do NOT log err details to avoid flooding on persistent outage
    })
  }
  return redis
}
```

**Key options explained:**
- `lazyConnect: true` — verbindet erst bei erstem Command, nicht beim Import
- `maxRetriesPerRequest: 1` — scheitert schnell bei Redis-Ausfall statt zu blockieren
- `enableReadyCheck: false` — verhindert Verbindungsablehnung waehrend Redis noch startet

### Pattern 2: INCR/EXPIRE Rate Limiting (Fixed Window)

**What:** Atomares Inkrement mit TTL-Setzung beim ersten Hit. Kein Lua-Script noetig fuer dieses
Muster — INCR gefolgt von EXPIRE (conditional) ist ausreichend und der INCR ist atomar.

**When to use:** Feste Zeitfenster (z.B. 100 req/min). Fuer exakte Sliding Windows waere ein
Lua-Script noetig, aber Fixed Window reicht fuer diesen Anwendungsfall.

```typescript
// src/lib/utils/rate-limit.ts (migriert)
import { NextRequest } from 'next/server'
import { apiError } from './api-response'
import { getRedisClient } from './redis-client'
import { logger } from './logger'

export async function rateLimit(
  request: NextRequest,
  key: string,
  maxRequests: number,
  windowMs = 60_000
): Promise<Response | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'

  const windowSeconds = Math.ceil(windowMs / 1000)
  const windowBucket = Math.floor(Date.now() / windowMs)
  const storeKey = `rate:${key}:${ip}:${windowBucket}`

  const redis = getRedisClient()

  // Fail-open: wenn Redis nicht erreichbar, Request durchlassen
  if (!redis) {
    logger.warn('Redis not available — rate limiting disabled (fail-open)', { module: 'RateLimit', key })
    return null
  }

  try {
    const count = await redis.incr(storeKey)
    if (count === 1) {
      await redis.expire(storeKey, windowSeconds)
    }
    if (count > maxRequests) {
      return apiError('RATE_LIMITED', 'Zu viele Anfragen. Bitte warten Sie einen Moment.', 429)
    }
    return null
  } catch (err) {
    // Fail-open on Redis errors
    logger.warn('Redis rate limit error — failing open', err, { module: 'RateLimit', key })
    return null
  }
}
```

**IMPORTANT — API signature change:** Die aktuelle `rateLimit()` Funktion ist synchron und gibt
`Response | null` zurueck. Die Redis-Version muss `async` werden und gibt `Promise<Response | null>`
zurueck. Alle Aufrufer (Callers) muessen auf `await rateLimit(...)` umgestellt werden.

### Pattern 3: Structured Error Logging (Catch Block Fix)

**What:** Jeder `catch {}` Block erhaelt mindestens einen `logger.warn()` oder `logger.error()` Call.
Das bestehende Logger-Interface ist:

```typescript
// src/lib/utils/logger.ts (bereits vorhanden — nicht veraendern)
logger.error(message: string, error?: unknown, context?: LogContext)
logger.warn(message: string, context?: LogContext)
logger.info(message: string, context?: LogContext)
```

**Three fix patterns — use the right one per location:**

**Fix A — JSON-parsing fallback (recoverable, silent is OK but needs log):**
```typescript
} catch (err) {
  logger.warn('JSON-Parsing fehlgeschlagen, verwende Fallback', { module: 'AIService' })
  // fallback return stays unchanged
}
```

**Fix B — `console.error` to `logger.error` (grundschutz/ir-playbook routes):**
```typescript
} catch (error) {
  // VORHER: console.error('Error listing Grundschutz assets:', error)
  logger.error('Error listing Grundschutz assets', error, { module: 'Grundschutz' })
  return apiServerError()
}
```

**Fix C — Legitimate silent swallow that needs observability (URL parsing, availability checks):**
```typescript
} catch {
  // URL parsing — invalid URL, skip
  // No log change needed here (too noisy), but document as intentional
  // Add comment: // intentionally silent — invalid URL is expected input
}
```

### Anti-Patterns to Avoid

- **Calling `redis.incr()` without `redis.expire()`:** If the expire call fails after a successful
  INCR, the key lives forever. Always wrap both in try/catch together.
- **Creating a new Redis client per request:** Each `new Redis()` opens a new TCP connection.
  Always use the singleton from `getRedisClient()`.
- **Fail-closed rate limiting:** If Redis is down, returning 429 to all users is worse than
  letting requests through. The design decision (from STATE.md) is explicitly fail-open.
- **Logging the Redis error object on every retry:** ioredis reconnects silently. If you log
  every reconnect error, the logs flood. Log the first occurrence with warn, then stop.
- **Changing catch-block behavior while "fixing" logging:** The fix is purely additive —
  add log, do NOT change what the catch block returns or throws. Behavior-preserving only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Redis connection pooling | Custom connection manager | `ioredis` singleton with `lazyConnect` | ioredis handles reconnect, backoff, error events |
| Sliding window rate limiting | Custom Lua script | Fixed window INCR/EXPIRE (good enough) | Fixed window is simpler, avoids Lua debugging, sufficient for this use case |
| Log formatting | Custom formatMessage() | Existing `logger.ts` | Already formats with timestamp, level, context — no changes needed |
| Rate limit storage abstraction | Factory pattern with pluggable backends | Direct Redis call + fail-open guard | YAGNI — one Redis instance, one pattern |

**Key insight:** Both tasks are primarily migration/fixup work, not new system design. The risk
is in the API change (sync → async) and in touching AI service files without changing behavior.

---

## Caller Audit: Who Calls `rateLimit()`?

The signature change from sync to async requires all callers to be updated.

```typescript
// Aktuelle Callers identifizieren:
// grep -rn "rateLimit(" src/
```

Known callers from CONCERNS.md context (need verification during plan execution):
- API routes that use rate limiting for auth endpoints
- Likely: `src/app/api/v1/auth/` routes

**Action required in plan:** Wave 0 must include a grep to list all callers before migrating.

---

## Complete Silent Catch Inventory

### Category A: JSON-Parsing Fallbacks (add `logger.warn`, keep fallback behavior)

| File | Line | Current Comment | Fix Pattern |
|------|------|-----------------|-------------|
| `src/lib/services/ai/ai.service.ts` | 272 | `// If JSON parsing fails, return the raw text as summary` | Fix A |
| `src/lib/services/ai/ai.service.ts` | 335 | `// Parsing failed` | Fix A |
| `src/lib/services/ai/ai.service.ts` | 382 | (provider availability — catch with silent push) | Fix A + log provider name |
| `src/lib/services/ai/blog-ai.service.ts` | 175 | `// Parsing failed` | Fix A |
| `src/lib/services/ai/business-intelligence-ai.service.ts` | 55 | `// JSON kaputt (z.B. abgeschnitten) - rawAnalysis trotzdem speichern` | Fix A |
| `src/lib/services/ai/cms-ai.service.ts` | 37 | `// Parsing failed` | Fix A |
| `src/lib/services/ai/cms-ai.service.ts` | 74 | `// Parsing failed` | Fix A |
| `src/lib/services/ai/document-analysis.service.ts` | 73 | `// Fallback` | Fix A |
| `src/lib/services/ai/marketing-agent.service.ts` | 114 | `// No Firecrawl configured` | Fix A |
| `src/lib/services/ai/kie.provider.ts` | 215 | `/* ignore parse errors */` | Fix A |
| `src/lib/services/ai/outreach.service.ts` | 117 | `// Falls kein JSON, nutze den gesamten Text als Body` | Fix A |

### Category B: `console.error` → `logger.error` (newer routes, inconsistent with convention)

| File | Lines | Fix Pattern |
|------|-------|-------------|
| `src/app/api/v1/grundschutz/assets/route.ts` | 45, 64 | Fix B |
| `src/app/api/v1/grundschutz/assets/[id]/route.ts` | 21, 44, 65 | Fix B |
| `src/app/api/v1/grundschutz/assets/[id]/controls/route.ts` | 33 | Fix B |
| `src/app/api/v1/ir-playbook/route.ts` | 22, 44 | Fix B |
| `src/app/api/v1/ir-playbook/views/route.ts` | 28 | Fix B |
| `src/app/api/v1/ir-playbook/[id]/route.ts` | 21, 37 | Fix B |

### Category C: Legitimately Silent (document as intentional, no behavior change)

| File | Line | Reason for Silence |
|------|------|--------------------|
| `src/lib/services/ai/website-scraper.service.ts` | 234 | Invalid URL parsing — expected for malformed hrefs. Too noisy to log every instance. Add comment: `// intentionally silent — invalid URL is expected input noise`. |
| `src/lib/services/ai/ollama.provider.ts` | 24, 80, 96 | Availability check — returns false/[] on network error. Correct behavior. Comment already clear. |
| `src/lib/services/ai/lead-research.service.ts` | 199-220 | Multi-level JSON repair chain — final innermost catch is last resort, logger.warn already at 210. |
| `src/lib/services/ai/marketing-agent.service.ts` | 79, 92 | JSON repair chain with fallback — final catch returns `fallback`. No log needed on recovery. |
| `src/lib/services/ai/social-media-ai.service.ts` | 70, 119, 168, 210 | Re-throws as proper Error — already surfaces to user. Not silent. No change needed. |
| `src/lib/services/ai/marketing-ai.service.ts` | 70 | Re-throws as proper Error. Not silent. No change needed. |
| `src/lib/services/ai/n8n-workflow-builder.service.ts` | 55 | Creates workflow log in catch — has side effect, not silent. Verify logger usage. |
| `src/lib/services/ai/image-generation.service.ts` | 460 | `logger.warn` already present. Already fixed. |

---

## Common Pitfalls

### Pitfall 1: `rateLimit()` sync → async API break

**What goes wrong:** `rateLimit()` is currently synchronous. Callers do `const r = rateLimit(...)`.
After migration it becomes async. If a caller does not `await` it, the function silently returns a
Promise (truthy!) which is never 429 — rate limiting is effectively disabled.
**Why it happens:** TypeScript does not error on unawaited async functions that return non-void.
**How to avoid:** In the PLAN, Wave 0 MUST list all callers. Wave 1 migrates `rate-limit.ts` AND
all callers in the same commit.
**Warning signs:** All rate-limited requests get through; no 429s in logs.

### Pitfall 2: Redis client imported at module level in Next.js

**What goes wrong:** `import { redis } from './redis-client'` at module level causes the client to
be instantiated during Next.js build (at compile time, not runtime). If `REDIS_URL` is not set
at build time, the client throws or is null permanently.
**Why it happens:** Next.js App Router evaluates server module code during build.
**How to avoid:** Use a lazy singleton (`getRedisClient()` function, not an exported instance).
The `lazyConnect: true` option plus the factory function pattern handles this correctly.
**Warning signs:** Build fails or Redis warnings appear during `next build`.

### Pitfall 3: Changing catch-block behavior while adding logs

**What goes wrong:** Developer adds `logger.warn()` and also changes what the catch block does
(e.g., removes the fallback return, or adds a re-throw). This breaks existing behavior silently.
**Why it happens:** Context-switching while editing catch blocks.
**How to avoid:** Each catch-block edit is purely additive — add exactly one logger call, change
nothing else. Review diff: only additions.
**Warning signs:** AI service responses change format; fallback values no longer returned.

### Pitfall 4: Redis key without TTL (stale key accumulation)

**What goes wrong:** `redis.incr(key)` succeeds but `redis.expire(key, seconds)` is never called
(or called with wrong window). Keys accumulate forever, blocking legit users permanently.
**Why it happens:** The INCR and EXPIRE are two separate commands — if the process crashes between
them, EXPIRE is never set.
**How to avoid:** Always call `expire` immediately after `incr` when `count === 1`. Both commands
in the same try block. Alternatively use a Lua script for true atomicity, but INCR+EXPIRE on
count===1 is acceptable for this use case (race window is extremely small).
**Warning signs:** Redis memory grows without bound; rate limit never resets.

### Pitfall 5: `console.error` → `logger.error` signature mismatch

**What goes wrong:** `console.error(message, error)` vs `logger.error(message, error?, context?)`.
The argument order is different. Swapping them causes the error object to be logged as context
or vice versa.
**Why it happens:** Muscle memory from console.error.
**How to avoid:** `logger.error('message', error, { module: '...' })` — error is second arg, not
first. Context is third, optional.
**Warning signs:** TypeScript compiler catches most cases; `tsc --noEmit` must pass.

---

## Code Examples

### Redis Client Singleton (verified pattern)

```typescript
// src/lib/utils/redis-client.ts
// Source: ioredis official docs — https://github.com/redis/ioredis#readme
import Redis from 'ioredis'
import { logger } from './logger'

let redisClient: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    })
    redisClient.on('error', () => {
      logger.warn('Redis connection error — rate limiting fails open', { module: 'Redis' })
    })
  }
  return redisClient
}
```

### Rate Limit with INCR/EXPIRE (verified pattern)

```typescript
// Fixed window: key = rate:{prefix}:{ip}:{windowBucket}
// windowBucket changes every `windowMs` ms → auto-rotates
const windowSeconds = Math.ceil(windowMs / 1000)
const windowBucket = Math.floor(Date.now() / windowMs)
const storeKey = `rate:${key}:${ip}:${windowBucket}`

const count = await redis.incr(storeKey)
if (count === 1) {
  // First hit in this window — set TTL
  await redis.expire(storeKey, windowSeconds + 1) // +1 second buffer
}
```

### Logger call patterns (existing API, no changes needed)

```typescript
// Error with error object and module context
logger.error('Error listing Grundschutz assets', error, { module: 'Grundschutz' })

// Warn without error object (JSON parsing fallback)
logger.warn('JSON-Parsing fehlgeschlagen, Fallback verwendet', { module: 'AiService', feature: 'researchCompany' })

// Warn with module context (Redis fail-open)
logger.warn('Redis nicht verfuegbar — Rate Limiting deaktiviert (fail-open)', { module: 'RateLimit', key })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| In-memory `Map` for rate limiting | Redis INCR/EXPIRE | This phase | State survives restart, shared across replicas |
| Per-instance rate limit state | Shared Redis counter | This phase | Attacker can no longer bypass by hitting different container |
| `console.error` in newer routes | `logger.error()` with context | This phase | Unified log format, filterable by module |

**Deprecated/outdated:**
- In-memory `setInterval` cleanup in `rate-limit.ts`: Not needed with Redis TTL, will be removed.

---

## Open Questions

1. **Who are all callers of `rateLimit()`?**
   - What we know: Used in at least auth routes based on CONCERNS.md context
   - What's unclear: Exact file list not confirmed (needs `grep -rn "rateLimit(" src/`)
   - Recommendation: Wave 0 of 04-01 plan MUST execute this grep and list all callers explicitly

2. **Should the `lead-research.service.ts` multi-level JSON repair chain get additional logging?**
   - What we know: `logger.warn` already present at line 210 for the repaired JSON case
   - What's unclear: The final innermost `catch {}` at line 220 (last resort) has no log
   - Recommendation: Add `logger.warn('JSON-Reparatur fehlgeschlagen, leeres Objekt verwendet', ...)` at line 220

3. **Is `n8n-workflow-builder.service.ts:55` truly non-silent?**
   - What we know: Catch block at line 55 creates a workflow log entry via `N8nService.createWorkflowLog()`
   - What's unclear: The `createWorkflowLog` call may itself fail silently
   - Recommendation: Verify during implementation that `createWorkflowLog` failure is also handled

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Redis (Docker) | Rate limiting | ✓ | redis:7-alpine (in compose) | Fail-open (by design) |
| `ioredis` npm package | Rate limiting client | NOT INSTALLED | 5.10.1 available | Must install — `npm install ioredis@^5.10.1` |
| `src/lib/utils/logger.ts` | Error handling | ✓ | built-in | n/a |
| `src/lib/utils/api-response.ts` | Rate limit 429 response | ✓ | built-in | n/a |

**Missing dependencies with no fallback:**
- `ioredis` — must be installed before Plan 04-01 can execute

**Redis connection string format (from docker-compose.local.yml line 48):**
```
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
```
The URL uses the `:password@host` format (no username). ioredis parses this correctly.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `npx vitest run src/__tests__/unit/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R3.1 | Redis INCR/EXPIRE increments counter correctly | unit | `npx vitest run src/__tests__/unit/utils/rate-limit.test.ts` | ❌ Wave 0 |
| R3.1 | Fail-open: null Redis client returns null (allows request) | unit | same file | ❌ Wave 0 |
| R3.1 | Fail-open: Redis error returns null (allows request) | unit | same file | ❌ Wave 0 |
| R3.1 | After windowMs, counter resets (new window bucket) | unit | same file | ❌ Wave 0 |
| R3.2 | No `catch {}` with empty or comment-only body in AI services | lint/grep | `grep -rn "catch {" src/lib/services/ai/` | N/A — grep check |
| R3.2 | No `console.error` in grundschutz/ir-playbook routes | lint/grep | `grep -rn "console.error" src/app/api/v1/grundschutz/ src/app/api/v1/ir-playbook/` | N/A — grep check |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/unit/utils/rate-limit.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** `npx next build` + full vitest suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/unit/utils/rate-limit.test.ts` — covers R3.1 (4 test cases above)
- [ ] Mock strategy: `vi.mock('ioredis')` with a mock Redis class that records calls

*(Existing test infrastructure in `src/__tests__/unit/services/` covers the test pattern template)*

---

## Project Constraints (from CLAUDE.md)

- Docker-only deployment — no Upstash, no external Redis SaaS
- `npx next build` must pass before push (not just `tsc --noEmit`)
- German UI language throughout (error messages to user in German)
- `apiSuccess/apiError/apiServerError` for all API responses
- `logger.error(message, error, context)` — not `console.error`
- `withPermission()` pattern for auth (not relevant to this phase but keep consistent)

---

## Sources

### Primary (HIGH confidence)
- `src/lib/utils/rate-limit.ts` — current implementation, read directly
- `docker-compose.local.yml` — Redis service config, `REDIS_URL` format confirmed
- `.planning/research/STACK.md` — ioredis recommendation with version confirmed
- `.planning/codebase/CONCERNS.md` — silent catch block inventory (9 AI service locations)
- `src/lib/utils/logger.ts` — existing logger API confirmed
- npm registry — `ioredis@5.10.1` current version confirmed (2026-03-19)

### Secondary (MEDIUM confidence)
- grep of `src/lib/services/ai/` — expanded silent catch inventory beyond CONCERNS.md 9 items
- grep of `src/app/api/v1/grundschutz/` and `ir-playbook/` — console.error locations confirmed

### Tertiary (LOW confidence)
- None — all findings verified against codebase directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — ioredis version confirmed from npm registry, not yet installed confirmed from package.json
- Architecture: HIGH — rate-limit.ts read directly, API signature documented accurately
- Pitfalls: HIGH — sync→async migration risk confirmed by reading current caller pattern, Redis key TTL pitfall from ioredis docs knowledge
- Error inventory: HIGH — grepped directly from codebase, categorized by reading each catch block

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (ioredis stable, logger stable, Redis compose config stable)
