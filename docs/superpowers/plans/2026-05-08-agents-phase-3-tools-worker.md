# Agent-System Phase 3 — Tool-Registry + Worker-Service

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tool-Adapter fuer alle 4 Namespaces (memory/workflow/prompt/service) + deterministischen Worker-Service implementieren, der einzelne agent_steps ausfuehrt. CostTracker voll implementieren. Tick-Handler `processAgentTaskQueue` von no-op zu echter Step-Dispatching-Logik.

**Architecture:** Tool-Registry haelt vier Adapter, jeder uebersetzt einen Namespace zu konkreten Calls (MemoryService, WorkflowEngine, AIService, Domain-Services). Worker-Service.executeStep laedt einen Step, expandiert Memory-Refs, dispatcht via Tool-Registry, persistiert Result + CostEvent. Tick-Handler claimt agent_step_run-Tasks atomic via FOR UPDATE SKIP LOCKED und ruft Worker. Kein LLM-Reasoning, kein Orchestrator — alles deterministisch.

**Tech Stack:** Drizzle ORM (FOR UPDATE SKIP LOCKED), bestehende Services (MemoryService aus Phase 2, WorkflowEngine, AIService mit allen Providers, Lead-Research/Website-Scraper).

**Spec-Referenz:** `docs/superpowers/specs/2026-05-08-agent-system-design.md` §5 + §6.5

**Vorbedingungen:** Phase 1 + 2 sind gemerged, Migration `020_agent_system_phase1.sql` ausgefuehrt (manuell oder beim Container-Boot). Branch dieser Phase: `feat/agents-tools-worker`.

---

## File Structure

**Neue Module unter `src/lib/services/agents/tools/`:**
- `memory-adapter.ts` — `memory:search`/`read`/`write`/`list`/`supersede`
- `workflow-adapter.ts` — `workflow:<trigger>` Wrapper um `WorkflowEngine.fire`
- `prompt-adapter.ts` — `prompt:<slug>` Wrapper um `AIService.complete` mit Template-Rendering
- `service-adapter.ts` — `service:<name>` whitelisted Domain-Services
- `bootstrap.ts` — `initializeToolRegistry()` registriert alle 4 Adapter

**Modifiziert:**
- `src/lib/services/agents/cost-tracker.service.ts` — Skeleton → echte Implementation
- `src/lib/services/agents/memory/embedding.ts` — emit `agent_cost_events` für `memory_embed`
- `src/lib/services/agents/worker.service.ts` — Skeleton → echte Implementation
- `src/lib/services/cron.service.ts` — `processAgentTaskQueue` von no-op zu Dispatching
- `src/instrumentation.ts` — `initializeToolRegistry()` beim Boot
- `src/__tests__/unit/services/agents/skeleton-imports.test.ts` — Throw-Tests entfernen für nun-implementierte Methoden

**Tests:**
- `src/__tests__/unit/services/agents/cost-tracker.test.ts`
- `src/__tests__/unit/services/agents/tools/memory-adapter.test.ts`
- `src/__tests__/unit/services/agents/tools/workflow-adapter.test.ts`
- `src/__tests__/unit/services/agents/tools/prompt-adapter.test.ts`
- `src/__tests__/unit/services/agents/tools/service-adapter.test.ts`
- `src/__tests__/integration/services/agents/worker.service.test.ts`

---

### Task 1: `CostTrackerService` echte Implementation

**Files:**
- Modify: `src/lib/services/agents/cost-tracker.service.ts`
- Test: `src/__tests__/unit/services/agents/cost-tracker.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/cost-tracker.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const insertValuesMock = vi.fn().mockResolvedValue(undefined)
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const selectFromWhereMock = vi.fn().mockResolvedValue([
  { spentTokens: 100, spentCents: 5, budgetTokens: 1000, budgetCents: 50 },
])
const selectFromMock = vi.fn(() => ({ where: vi.fn(() => ({ limit: () => selectFromWhereMock })) }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))

vi.mock('@/lib/db', () => ({
  db: { insert: insertMock, update: updateMock, select: selectMock },
}))
vi.mock('@/lib/db/schema', () => ({
  agentCostEvents: { _: 'agentCostEvents' },
  agentGoals: { id: 'id', spentTokens: 'spentTokens', spentCents: 'spentCents' },
  agentRuns: { id: 'id', goalId: 'goalId', inputTokens: 'inputTokens', outputTokens: 'outputTokens', cachedInputTokens: 'cachedInputTokens', costCents: 'costCents' },
}))

describe('CostTrackerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('record schreibt agent_cost_events Eintrag', async () => {
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    await CostTrackerService.record({
      runId: 'r1',
      stepId: 's1',
      goalId: 'g1',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      callRole: 'orchestrator_plan',
      inputTokens: 100,
      outputTokens: 50,
      costCents: 1,
    })
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(insertValuesMock).toHaveBeenCalledTimes(1)
    const args = insertValuesMock.mock.calls[0][0]
    expect(args.provider).toBe('gemini')
    expect(args.callRole).toBe('orchestrator_plan')
    expect(args.inputTokens).toBe(100)
  })

  it('record aktualisiert spent-Counter auf goal und run', async () => {
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    await CostTrackerService.record({
      runId: 'r1', goalId: 'g1', provider: 'gemini', model: 'm',
      callRole: 'smart_worker', inputTokens: 200, outputTokens: 100, costCents: 3,
    })
    // 1 update for goal + 1 update for run
    expect(updateMock).toHaveBeenCalledTimes(2)
  })

  it('checkBudget liefert exceeded=false wenn unter Limit', async () => {
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    const r = await CostTrackerService.checkBudget('g1')
    expect(r.exceeded).toBe(false)
    expect(r.spentCents).toBe(5)
    expect(r.budgetCents).toBe(50)
  })

  it('checkBudget liefert exceeded=true wenn ueber Token-Limit', async () => {
    selectFromWhereMock.mockResolvedValueOnce([
      { spentTokens: 1500, spentCents: 5, budgetTokens: 1000, budgetCents: 50 },
    ])
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    const r = await CostTrackerService.checkBudget('g1')
    expect(r.exceeded).toBe(true)
    expect(r.reason).toBe('tokens')
  })

  it('checkBudget liefert exceeded=true wenn ueber Cents-Limit', async () => {
    selectFromWhereMock.mockResolvedValueOnce([
      { spentTokens: 100, spentCents: 60, budgetTokens: 1000, budgetCents: 50 },
    ])
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    const r = await CostTrackerService.checkBudget('g1')
    expect(r.exceeded).toBe(true)
    expect(r.reason).toBe('cents')
  })

  it('checkBudget mit null-Budget liefert exceeded=false', async () => {
    selectFromWhereMock.mockResolvedValueOnce([
      { spentTokens: 1000000, spentCents: 1000, budgetTokens: null, budgetCents: null },
    ])
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    const r = await CostTrackerService.checkBudget('g1')
    expect(r.exceeded).toBe(false)
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/cost-tracker.test.ts
```

- [ ] **Step 3: Implementation**

Ersetze den kompletten Inhalt von `src/lib/services/agents/cost-tracker.service.ts`:

```ts
/**
 * Cost Tracker — schreibt agent_cost_events und aggregiert Run/Goal-Spend.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.3
 */

import type { CallRole } from './types'

export interface CostEventInput {
  runId?: string
  stepId?: string
  goalId?: string
  provider: string
  model: string
  callRole: CallRole
  inputTokens: number
  cachedInputTokens?: number
  outputTokens: number
  costCents: number
}

export interface BudgetCheckResult {
  exceeded: boolean
  reason: 'tokens' | 'cents' | null
  spentTokens: number
  spentCents: number
  budgetTokens: number | null
  budgetCents: number | null
}

export const CostTrackerService = {
  async record(input: CostEventInput): Promise<void> {
    const { db } = await import('@/lib/db')
    const { agentCostEvents, agentGoals, agentRuns } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const totalTokens = input.inputTokens + input.outputTokens

    await db.insert(agentCostEvents).values({
      runId: input.runId ?? null,
      stepId: input.stepId ?? null,
      goalId: input.goalId ?? null,
      provider: input.provider,
      model: input.model,
      callRole: input.callRole,
      inputTokens: input.inputTokens,
      cachedInputTokens: input.cachedInputTokens ?? 0,
      outputTokens: input.outputTokens,
      costCents: input.costCents,
    })

    if (input.goalId) {
      await db
        .update(agentGoals)
        .set({
          spentTokens: sql`${agentGoals.spentTokens} + ${totalTokens}`,
          spentCents: sql`${agentGoals.spentCents} + ${input.costCents}`,
          updatedAt: sql`now()`,
        })
        .where(eq(agentGoals.id, input.goalId))
    }

    if (input.runId) {
      await db
        .update(agentRuns)
        .set({
          inputTokens: sql`${agentRuns.inputTokens} + ${input.inputTokens}`,
          outputTokens: sql`${agentRuns.outputTokens} + ${input.outputTokens}`,
          cachedInputTokens: sql`${agentRuns.cachedInputTokens} + ${input.cachedInputTokens ?? 0}`,
          costCents: sql`${agentRuns.costCents} + ${input.costCents}`,
          updatedAt: sql`now()`,
        })
        .where(eq(agentRuns.id, input.runId))
    }
  },

  async checkBudget(goalId: string): Promise<BudgetCheckResult> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [row] = await db
      .select({
        spentTokens: agentGoals.spentTokens,
        spentCents: agentGoals.spentCents,
        budgetTokens: agentGoals.budgetTokens,
        budgetCents: agentGoals.budgetCents,
      })
      .from(agentGoals)
      .where(eq(agentGoals.id, goalId))
      .limit(1)

    if (!row) {
      return { exceeded: false, reason: null, spentTokens: 0, spentCents: 0, budgetTokens: null, budgetCents: null }
    }

    const tokensExceeded = row.budgetTokens != null && row.spentTokens >= row.budgetTokens
    const centsExceeded = row.budgetCents != null && row.spentCents >= row.budgetCents

    return {
      exceeded: tokensExceeded || centsExceeded,
      reason: tokensExceeded ? 'tokens' : centsExceeded ? 'cents' : null,
      spentTokens: row.spentTokens,
      spentCents: row.spentCents,
      budgetTokens: row.budgetTokens,
      budgetCents: row.budgetCents,
    }
  },
}
```

- [ ] **Step 4: Skeleton-Throw-Tests entfernen**

In `src/__tests__/unit/services/agents/skeleton-imports.test.ts` den Test entfernen:

```ts
  it('CostTrackerService.record wirft "nicht implementiert"', async () => {
    await expect(
      CostTrackerService.record({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        callRole: 'orchestrator_plan',
        inputTokens: 100,
        outputTokens: 50,
        costCents: 1,
      }),
    ).rejects.toThrow(/nicht implementiert/)
  })
```

- [ ] **Step 5: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/cost-tracker.test.ts src/__tests__/unit/services/agents/skeleton-imports.test.ts
```

Erwartet: 6 cost-tracker + 8 skeleton (war 9) = 14 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/agents/cost-tracker.service.ts src/__tests__/unit/services/agents/cost-tracker.test.ts src/__tests__/unit/services/agents/skeleton-imports.test.ts
git commit -m "feat(agents): CostTrackerService voll implementiert (record + checkBudget)"
```

---

### Task 2: CostTracker-Hook in embedding.ts (Phase-2 Followup)

**Files:**
- Modify: `src/lib/services/agents/memory/embedding.ts`
- Test: `src/__tests__/unit/services/agents/memory/embedding.test.ts`

- [ ] **Step 1: Embedding-Provider erweitern um Cost-Hook**

Ersetze die `embedText`-Funktion in `src/lib/services/agents/memory/embedding.ts`:

```ts
/**
 * Memory Embedding — Gemini text-embedding-004 (768 Dimensionen).
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.4 + §5.3
 */

const GEMINI_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent'
const EXPECTED_DIM = 768
const FETCH_TIMEOUT_MS = 30_000

// Gemini text-embedding-004 ist aktuell free-tier; Cents-Schaetzung 0 fuer
// Tracking-Vollstaendigkeit. Wenn paid: 0.00001 USD per 1k input tokens
// (~0.001 cent fuer typische 100-token-Eingabe). Wir tracken Token-Anzahl,
// Cents = 0 bis ein bezahlter Tier konfiguriert wird.
const EMBED_COST_CENTS_PER_CALL = 0

export interface EmbedTextOptions {
  /** Optional: wenn gesetzt, schreibt CostTrackerService einen agent_cost_events-Eintrag */
  costContext?: {
    runId?: string
    stepId?: string
    goalId?: string
  }
}

export async function embedText(text: string, options?: EmbedTextOptions): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('GOOGLE_AI_API_KEY nicht konfiguriert')
  }
  const response = await fetch(GEMINI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Embedding-Request fehlgeschlagen: ${response.status} ${detail}`)
  }
  const json = (await response.json()) as { embedding?: { values?: number[] } }
  const values = json.embedding?.values
  if (!values || !Array.isArray(values)) {
    throw new Error('Embedding-Response: values fehlen')
  }
  if (values.length !== EXPECTED_DIM) {
    throw new Error(`Embedding-Dimension ${values.length} != erwartete ${EXPECTED_DIM}`)
  }

  // Cost-Tracking (non-fatal — wenn fehlschlaegt, embedding-Result trotzdem zurueck)
  if (options?.costContext) {
    try {
      const { CostTrackerService } = await import('../cost-tracker.service')
      // Token-Schaetzung: ~4 chars per token (Gemini-Tokenizer ist proprietaer,
      // diese Heuristik reicht fuer Aggregation/Throttling)
      const estimatedInputTokens = Math.ceil(text.length / 4)
      await CostTrackerService.record({
        runId: options.costContext.runId,
        stepId: options.costContext.stepId,
        goalId: options.costContext.goalId,
        provider: 'gemini',
        model: 'text-embedding-004',
        callRole: 'memory_embed',
        inputTokens: estimatedInputTokens,
        outputTokens: 0,
        costCents: EMBED_COST_CENTS_PER_CALL,
      })
    } catch {
      // ignore — embedding bleibt valide, nur cost-event fehlt
    }
  }

  return values
}

export const EMBEDDING_DIMENSION = EXPECTED_DIM
```

- [ ] **Step 2: Test fuer cost-hook ergaenzen**

In `src/__tests__/unit/services/agents/memory/embedding.test.ts` einen neuen Test hinzufuegen (nach den bestehenden):

```ts
  it('embedText ruft CostTrackerService.record wenn costContext gesetzt', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: Array.from({ length: 768 }, () => 0) } }),
    }) as unknown as typeof fetch
    const recordMock = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/lib/services/agents/cost-tracker.service', () => ({
      CostTrackerService: { record: recordMock },
    }))
    vi.resetModules()
    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    await embedText('hello world', { costContext: { runId: 'r1', goalId: 'g1' } })
    expect(recordMock).toHaveBeenCalledTimes(1)
    expect(recordMock.mock.calls[0][0]).toMatchObject({
      runId: 'r1',
      goalId: 'g1',
      provider: 'gemini',
      model: 'text-embedding-004',
      callRole: 'memory_embed',
    })
    vi.doUnmock('@/lib/services/agents/cost-tracker.service')
  })

  it('embedText ohne costContext ruft CostTrackerService nicht', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: Array.from({ length: 768 }, () => 0) } }),
    }) as unknown as typeof fetch
    const recordMock = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/lib/services/agents/cost-tracker.service', () => ({
      CostTrackerService: { record: recordMock },
    }))
    vi.resetModules()
    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    await embedText('hello world')
    expect(recordMock).not.toHaveBeenCalled()
    vi.doUnmock('@/lib/services/agents/cost-tracker.service')
  })
```

- [ ] **Step 3: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/embedding.test.ts
```

Erwartet: 5 + 2 = 7 passed (vorher 5).

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/agents/memory/embedding.ts src/__tests__/unit/services/agents/memory/embedding.test.ts
git commit -m "feat(agents): embedText optional CostTracker-Hook (memory_embed)"
```

---

### Task 3: Memory-Tool-Adapter

**Files:**
- Create: `src/lib/services/agents/tools/memory-adapter.ts`
- Test: `src/__tests__/unit/services/agents/tools/memory-adapter.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/tools/memory-adapter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const memoryServiceMock = {
  search: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  list: vi.fn(),
  supersede: vi.fn(),
}

vi.mock('@/lib/services/agents/memory.service', () => ({
  MemoryService: memoryServiceMock,
}))

describe('Memory-Tool-Adapter', () => {
  beforeEach(() => {
    Object.values(memoryServiceMock).forEach((fn) => fn.mockReset())
  })

  it('list() liefert 5 Memory-Tools', async () => {
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const tools = await memoryToolAdapter.list()
    expect(tools).toHaveLength(5)
    const names = tools.map((t) => t.ref.name)
    expect(names).toEqual(expect.arrayContaining(['search', 'read', 'write', 'list', 'supersede']))
    tools.forEach((t) => expect(t.ref.namespace).toBe('memory'))
  })

  it('invoke memory:search delegiert an MemoryService.search', async () => {
    memoryServiceMock.search.mockResolvedValue([{ id: 'm1', scope: 's', title: 't', summary: null, snippet: 'x', score: 0.5 }])
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const r = await memoryToolAdapter.invoke({
      ref: { namespace: 'memory', name: 'search', raw: 'memory:search' },
      input: { query: 'foo', limit: 5 },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(memoryServiceMock.search).toHaveBeenCalledWith('foo', undefined, 5)
    expect(r.output).toEqual({ hits: [{ id: 'm1', scope: 's', title: 't', summary: null, snippet: 'x', score: 0.5 }] })
  })

  it('invoke memory:write delegiert an MemoryService.write', async () => {
    memoryServiceMock.write.mockResolvedValue({ id: 'new-id', path: '/x/summary.md' })
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const r = await memoryToolAdapter.invoke({
      ref: { namespace: 'memory', name: 'write', raw: 'memory:write' },
      input: { scope: 'projects/test', body: '# Test' },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(memoryServiceMock.write).toHaveBeenCalledWith('projects/test', '# Test', undefined)
    expect(r.output).toEqual({ id: 'new-id', path: '/x/summary.md' })
  })

  it('invoke unbekannter Tool-Name liefert failed', async () => {
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const r = await memoryToolAdapter.invoke({
      ref: { namespace: 'memory', name: 'unknown', raw: 'memory:unknown' },
      input: {},
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/unbekanntes Memory-Tool/)
  })

  it('invoke faengt MemoryService-Errors als failed-Result', async () => {
    memoryServiceMock.read.mockRejectedValue(new Error('not found'))
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const r = await memoryToolAdapter.invoke({
      ref: { namespace: 'memory', name: 'read', raw: 'memory:read' },
      input: { ref: 'memory://projects/x' },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toContain('not found')
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/tools/memory-adapter.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/tools/memory-adapter.ts`:

```ts
/**
 * Memory-Tool-Adapter — exposes MemoryService als 5 Tools im `memory:*`-Namespace.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'
import { MemoryService } from '../memory.service'
import type { MemoryRef } from '../types'

const TOOLS: ToolDescriptor[] = [
  {
    ref: { namespace: 'memory', name: 'search', raw: 'memory:search' },
    description: 'Hybrid-Suche (BM25 + Vector) ueber alle aktiven Memory-Eintraege.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        scope: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 5 },
      },
    },
  },
  {
    ref: { namespace: 'memory', name: 'read', raw: 'memory:read' },
    description: 'Liest einen Memory-Eintrag (Markdown-Body + items.yaml) per ID, scope oder memory:// URI.',
    inputSchema: {
      type: 'object',
      required: ['ref'],
      properties: { ref: { type: 'string' } },
    },
  },
  {
    ref: { namespace: 'memory', name: 'write', raw: 'memory:write' },
    description: 'Schreibt oder aktualisiert einen Memory-Eintrag. Optional Items zum Anhaengen.',
    inputSchema: {
      type: 'object',
      required: ['scope', 'body'],
      properties: {
        scope: { type: 'string' },
        body: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['fact', 'source'],
            properties: {
              fact: { type: 'string' },
              source: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
      },
    },
  },
  {
    ref: { namespace: 'memory', name: 'list', raw: 'memory:list' },
    description: 'Listet alle aktiven Memory-Eintraege einer PARA-Kategorie.',
    inputSchema: {
      type: 'object',
      required: ['para'],
      properties: {
        para: { type: 'string', enum: ['projects', 'areas', 'resources', 'archives'] },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
      },
    },
  },
  {
    ref: { namespace: 'memory', name: 'supersede', raw: 'memory:supersede' },
    description: 'Ersetzt einen items.yaml-Fakt durch einen neuen (never-delete-Pattern).',
    inputSchema: {
      type: 'object',
      required: ['itemId', 'newFact', 'source'],
      properties: {
        itemId: { type: 'string' },
        newFact: { type: 'string' },
        source: { type: 'string' },
      },
    },
  },
]

export const memoryToolAdapter: ToolAdapter = {
  namespace: 'memory',

  async list() {
    return TOOLS
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const { name } = invocation.ref
    const input = invocation.input as Record<string, unknown>

    try {
      switch (name) {
        case 'search': {
          const query = String(input.query ?? '')
          const scope = typeof input.scope === 'string' ? input.scope : undefined
          const limit = typeof input.limit === 'number' ? input.limit : 5
          const hits = await MemoryService.search(query, scope, limit)
          return { status: 'succeeded', output: { hits } }
        }
        case 'read': {
          const ref = String(input.ref ?? '')
          const result = await MemoryService.read(ref)
          return { status: 'succeeded', output: result as unknown as Record<string, unknown> }
        }
        case 'write': {
          const scope = String(input.scope ?? '')
          const body = String(input.body ?? '')
          const items = Array.isArray(input.items)
            ? (input.items as Array<{ fact: string; source: string; confidence?: number }>)
            : undefined
          const result = await MemoryService.write(scope, body, items)
          return { status: 'succeeded', output: result }
        }
        case 'list': {
          const para = String(input.para ?? '') as 'projects' | 'areas' | 'resources' | 'archives'
          const limit = typeof input.limit === 'number' ? input.limit : 20
          const items = await MemoryService.list(para, limit)
          return { status: 'succeeded', output: { items } }
        }
        case 'supersede': {
          const itemId = String(input.itemId ?? '')
          const newFact = String(input.newFact ?? '')
          const source = String(input.source ?? '')
          await MemoryService.supersede(itemId, newFact, source)
          return { status: 'succeeded', output: { itemId } }
        }
        default:
          return { status: 'failed', error: `unbekanntes Memory-Tool: ${name}` }
      }
    } catch (e) {
      return { status: 'failed', error: (e as Error).message }
    }
  },
}

// Helper-Typ fuer Sub-Agenten / Tool-Documentation
export type _MemoryRef = MemoryRef
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/tools/memory-adapter.test.ts
```

Erwartet: 5/5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/tools/memory-adapter.ts src/__tests__/unit/services/agents/tools/memory-adapter.test.ts
git commit -m "feat(agents): memory-tool-adapter (search/read/write/list/supersede)"
```

---

### Task 4: Workflow-Tool-Adapter

**Files:**
- Create: `src/lib/services/agents/tools/workflow-adapter.ts`
- Test: `src/__tests__/unit/services/agents/tools/workflow-adapter.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/tools/workflow-adapter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fireMock = vi.fn()
const dbMock = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([
        { trigger: 'lead.created', name: 'Lead-Pipeline', description: 'Auto-Score' },
        { trigger: 'order.created', name: 'Bestellung', description: null },
      ]),
    })),
  })),
}

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/db/schema', () => ({
  workflows: { trigger: 'trigger', name: 'name', description: 'description', isActive: 'isActive' },
}))
vi.mock('@/lib/services/workflow/engine', () => ({
  WorkflowEngine: { fire: fireMock },
}))

describe('Workflow-Tool-Adapter', () => {
  beforeEach(() => {
    fireMock.mockReset()
  })

  it('list() liefert ein Tool pro aktivem Workflow-Trigger', async () => {
    const { workflowToolAdapter } = await import('@/lib/services/agents/tools/workflow-adapter')
    const tools = await workflowToolAdapter.list()
    expect(tools).toHaveLength(2)
    expect(tools[0].ref.namespace).toBe('workflow')
    expect(tools[0].ref.name).toBe('lead.created')
    expect(tools[0].ref.raw).toBe('workflow:lead.created')
    expect(tools[0].description).toContain('Lead-Pipeline')
  })

  it('invoke ruft WorkflowEngine.fire mit trigger und data', async () => {
    fireMock.mockResolvedValue({ runId: 'wr-1', stepResults: [] })
    const { workflowToolAdapter } = await import('@/lib/services/agents/tools/workflow-adapter')
    const r = await workflowToolAdapter.invoke({
      ref: { namespace: 'workflow', name: 'lead.created', raw: 'workflow:lead.created' },
      input: { data: { leadId: 'l1' } },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(fireMock).toHaveBeenCalledWith('lead.created', { leadId: 'l1' })
    expect(r.output).toEqual({ runId: 'wr-1', stepResults: [] })
  })

  it('invoke faengt Engine-Errors als failed-Result', async () => {
    fireMock.mockRejectedValue(new Error('Workflow konnte nicht starten'))
    const { workflowToolAdapter } = await import('@/lib/services/agents/tools/workflow-adapter')
    const r = await workflowToolAdapter.invoke({
      ref: { namespace: 'workflow', name: 'lead.created', raw: 'workflow:lead.created' },
      input: { data: {} },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toContain('konnte nicht starten')
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/tools/workflow-adapter.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/tools/workflow-adapter.ts`:

```ts
/**
 * Workflow-Tool-Adapter — jeder aktive workflows.trigger wird als Tool aufrufbar.
 * Namespace: `workflow:*` — z.B. `workflow:lead.created`.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'

export const workflowToolAdapter: ToolAdapter = {
  namespace: 'workflow',

  async list(): Promise<ToolDescriptor[]> {
    const { db } = await import('@/lib/db')
    const { workflows } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const rows = await db
      .select({
        trigger: workflows.trigger,
        name: workflows.name,
        description: workflows.description,
      })
      .from(workflows)
      .where(eq(workflows.isActive, true))

    // Eindeutige Trigger (mehrere workflows koennen denselben trigger haben)
    const seen = new Set<string>()
    const tools: ToolDescriptor[] = []
    for (const row of rows) {
      if (seen.has(row.trigger)) continue
      seen.add(row.trigger)
      tools.push({
        ref: { namespace: 'workflow', name: row.trigger, raw: `workflow:${row.trigger}` },
        description: `Triggert Workflow '${row.name}'${row.description ? ` — ${row.description}` : ''}`,
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'object', description: 'Trigger-Data, wird an WorkflowEngine.fire weitergegeben' },
          },
        },
      })
    }
    return tools
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const trigger = invocation.ref.name
    const input = invocation.input as { data?: Record<string, unknown> }
    const data = input.data ?? {}

    try {
      const { WorkflowEngine } = await import('@/lib/services/workflow/engine')
      const result = await WorkflowEngine.fire(trigger, data)
      return { status: 'succeeded', output: result as unknown as Record<string, unknown> }
    } catch (e) {
      return { status: 'failed', error: (e as Error).message }
    }
  },
}
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/tools/workflow-adapter.test.ts
```

Erwartet: 3/3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/tools/workflow-adapter.ts src/__tests__/unit/services/agents/tools/workflow-adapter.test.ts
git commit -m "feat(agents): workflow-tool-adapter (jeder Trigger = 1 Tool)"
```

---

### Task 5: Prompt-Tool-Adapter

**Files:**
- Create: `src/lib/services/agents/tools/prompt-adapter.ts`
- Test: `src/__tests__/unit/services/agents/tools/prompt-adapter.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/tools/prompt-adapter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const aiCompleteMock = vi.fn()
const dbMock = {
  select: vi.fn(),
}

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/db/schema', () => ({
  aiPromptTemplates: { slug: 'slug', name: 'name', description: 'description', systemPrompt: 'systemPrompt', userPrompt: 'userPrompt', isActive: 'isActive' },
  customAiPrompts: { slug: 'slug', name: 'name', description: 'description', systemPrompt: 'systemPrompt', userPrompt: 'userPrompt', isActive: 'isActive' },
}))
vi.mock('@/lib/services/ai', () => ({
  AIService: { complete: aiCompleteMock },
}))

function mockPromptListResponse(rows: Array<{ slug: string; name: string; description: string | null }>) {
  dbMock.select.mockReturnValueOnce({
    from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
  })
  dbMock.select.mockReturnValueOnce({
    from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
  })
}

function mockPromptByName(row: { systemPrompt: string; userPrompt: string } | null) {
  dbMock.select.mockReturnValueOnce({
    from: vi.fn(() => ({
      where: vi.fn(() => ({ limit: () => Promise.resolve(row ? [row] : []) })),
    })),
  })
  if (!row) {
    dbMock.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: () => Promise.resolve([]) })),
      })),
    })
  }
}

describe('Prompt-Tool-Adapter', () => {
  beforeEach(() => {
    aiCompleteMock.mockReset()
    dbMock.select.mockReset()
  })

  it('list() liefert je ein Tool pro aktivem Template + Custom-Prompt', async () => {
    mockPromptListResponse([
      { slug: 'lead_research', name: 'Lead-Recherche', description: 'KI-Analyse' },
      { slug: 'company_research', name: 'Firma', description: null },
    ])
    const { promptToolAdapter } = await import('@/lib/services/agents/tools/prompt-adapter')
    const tools = await promptToolAdapter.list()
    expect(tools).toHaveLength(2)
    expect(tools[0].ref.raw).toBe('prompt:lead_research')
    expect(tools[0].description).toContain('Lead-Recherche')
  })

  it('invoke rendert userPrompt mit variables und ruft AIService.complete', async () => {
    mockPromptByName({
      systemPrompt: 'Du bist Recherche-Assistent.',
      userPrompt: 'Analysiere {{company}} im Bereich {{topic}}.',
    })
    aiCompleteMock.mockResolvedValue({
      text: 'Acme ist top.',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
    })
    const { promptToolAdapter } = await import('@/lib/services/agents/tools/prompt-adapter')
    const r = await promptToolAdapter.invoke({
      ref: { namespace: 'prompt', name: 'lead_research', raw: 'prompt:lead_research' },
      input: { variables: { company: 'Acme GmbH', topic: 'B2B' } },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(aiCompleteMock).toHaveBeenCalledTimes(1)
    const callArgs = aiCompleteMock.mock.calls[0]
    expect(callArgs[0]).toContain('Acme GmbH')
    expect(callArgs[0]).toContain('B2B')
    expect(callArgs[1].systemPrompt).toContain('Recherche-Assistent')
    expect(r.output).toEqual({ text: 'Acme ist top.', provider: 'gemini', model: 'gemini-2.5-flash' })
    expect(r.usage).toEqual({
      inputTokens: 50,
      outputTokens: 20,
      costCents: 0,
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    })
  })

  it('invoke wirft failed bei unbekanntem slug', async () => {
    mockPromptByName(null)
    const { promptToolAdapter } = await import('@/lib/services/agents/tools/prompt-adapter')
    const r = await promptToolAdapter.invoke({
      ref: { namespace: 'prompt', name: 'unknown_slug', raw: 'prompt:unknown_slug' },
      input: { variables: {} },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/Prompt-Slug 'unknown_slug' nicht gefunden/)
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/tools/prompt-adapter.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/tools/prompt-adapter.ts`:

```ts
/**
 * Prompt-Tool-Adapter — jeder aktive Eintrag in aiPromptTemplates oder
 * customAiPrompts wird als Tool aufrufbar im `prompt:*`-Namespace.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'

interface PromptListRow {
  slug: string
  name: string
  description: string | null
}

interface PromptDetailRow {
  systemPrompt: string
  userPrompt: string
}

function renderTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key]
    if (value == null) return ''
    return typeof value === 'string' ? value : JSON.stringify(value)
  })
}

export const promptToolAdapter: ToolAdapter = {
  namespace: 'prompt',

  async list(): Promise<ToolDescriptor[]> {
    const { db } = await import('@/lib/db')
    const { aiPromptTemplates, customAiPrompts } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const templateRows = (await db
      .select({
        slug: aiPromptTemplates.slug,
        name: aiPromptTemplates.name,
        description: aiPromptTemplates.description,
      })
      .from(aiPromptTemplates)
      .where(eq(aiPromptTemplates.isActive, true))) as PromptListRow[]

    const customRows = (await db
      .select({
        slug: customAiPrompts.slug,
        name: customAiPrompts.name,
        description: customAiPrompts.description,
      })
      .from(customAiPrompts)
      .where(eq(customAiPrompts.isActive, true))) as PromptListRow[]

    const seen = new Set<string>()
    const tools: ToolDescriptor[] = []
    for (const row of [...templateRows, ...customRows]) {
      if (seen.has(row.slug)) continue
      seen.add(row.slug)
      tools.push({
        ref: { namespace: 'prompt', name: row.slug, raw: `prompt:${row.slug}` },
        description: `Prompt-Template '${row.name}'${row.description ? ` — ${row.description}` : ''}`,
        inputSchema: {
          type: 'object',
          properties: {
            variables: {
              type: 'object',
              description: 'Schluessel-Wert-Paare fuer {{platzhalter}}-Substitution im userPrompt',
            },
            options: {
              type: 'object',
              description: 'AI-Options: { providerId, model, temperature, maxTokens }',
            },
          },
        },
      })
    }
    return tools
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const slug = invocation.ref.name
    const input = invocation.input as {
      variables?: Record<string, unknown>
      options?: { providerId?: string; model?: string; temperature?: number; maxTokens?: number }
    }
    const variables = input.variables ?? {}

    try {
      const { db } = await import('@/lib/db')
      const { aiPromptTemplates, customAiPrompts } = await import('@/lib/db/schema')
      const { eq, and } = await import('drizzle-orm')

      const [tplRow] = (await db
        .select({
          systemPrompt: aiPromptTemplates.systemPrompt,
          userPrompt: aiPromptTemplates.userPrompt,
        })
        .from(aiPromptTemplates)
        .where(and(eq(aiPromptTemplates.slug, slug), eq(aiPromptTemplates.isActive, true)))
        .limit(1)) as PromptDetailRow[]

      let row: PromptDetailRow | undefined = tplRow

      if (!row) {
        const [customRow] = (await db
          .select({
            systemPrompt: customAiPrompts.systemPrompt,
            userPrompt: customAiPrompts.userPrompt,
          })
          .from(customAiPrompts)
          .where(and(eq(customAiPrompts.slug, slug), eq(customAiPrompts.isActive, true)))
          .limit(1)) as PromptDetailRow[]
        row = customRow
      }

      if (!row) {
        return { status: 'failed', error: `Prompt-Slug '${slug}' nicht gefunden oder inaktiv` }
      }

      const renderedUser = renderTemplate(row.userPrompt, variables)
      const renderedSystem = renderTemplate(row.systemPrompt, variables)

      const { AIService } = await import('@/lib/services/ai')
      const response = await AIService.complete(renderedUser, {
        systemPrompt: renderedSystem,
        providerId: input.options?.providerId,
        model: input.options?.model,
        temperature: input.options?.temperature,
        maxTokens: input.options?.maxTokens,
      })

      return {
        status: 'succeeded',
        output: { text: response.text, provider: response.provider, model: response.model },
        usage: {
          inputTokens: response.usage?.promptTokens ?? 0,
          outputTokens: response.usage?.completionTokens ?? 0,
          costCents: 0, // TODO: Pricing-Tabelle pro provider/model
          provider: response.provider,
          model: response.model,
        },
      }
    } catch (e) {
      return { status: 'failed', error: (e as Error).message }
    }
  },
}
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/tools/prompt-adapter.test.ts
```

Erwartet: 3/3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/tools/prompt-adapter.ts src/__tests__/unit/services/agents/tools/prompt-adapter.test.ts
git commit -m "feat(agents): prompt-tool-adapter (slug-basiert mit AIService)"
```

---

### Task 6: Service-Tool-Adapter

**Files:**
- Create: `src/lib/services/agents/tools/service-adapter.ts`
- Test: `src/__tests__/unit/services/agents/tools/service-adapter.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/tools/service-adapter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const leadResearchMock = vi.fn()

vi.mock('@/lib/services/ai', () => ({
  LeadResearchService: { researchLead: leadResearchMock },
  WebsiteScraperService: { scrape: vi.fn().mockResolvedValue({ markdown: '# Hello' }) },
}))

describe('Service-Tool-Adapter', () => {
  beforeEach(() => {
    leadResearchMock.mockReset()
  })

  it('list() liefert die fest registrierten Service-Tools', async () => {
    const { serviceToolAdapter } = await import('@/lib/services/agents/tools/service-adapter')
    const tools = await serviceToolAdapter.list()
    expect(tools.length).toBeGreaterThanOrEqual(2)
    const names = tools.map((t) => t.ref.name)
    expect(names).toContain('lead-research')
    expect(names).toContain('website-scraper')
  })

  it('invoke service:website-scraper delegiert', async () => {
    const { serviceToolAdapter } = await import('@/lib/services/agents/tools/service-adapter')
    const r = await serviceToolAdapter.invoke({
      ref: { namespace: 'service', name: 'website-scraper', raw: 'service:website-scraper' },
      input: { url: 'https://example.com' },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(r.output).toEqual({ markdown: '# Hello' })
  })

  it('invoke unbekannter service-Name liefert failed', async () => {
    const { serviceToolAdapter } = await import('@/lib/services/agents/tools/service-adapter')
    const r = await serviceToolAdapter.invoke({
      ref: { namespace: 'service', name: 'unknown-service', raw: 'service:unknown-service' },
      input: {},
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/unbekannter Service/)
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/tools/service-adapter.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/tools/service-adapter.ts`:

```ts
/**
 * Service-Tool-Adapter — whitelisted Domain-Services im `service:*`-Namespace.
 * Anders als prompt/workflow-adapter ist die Liste hier statisch (Code-Whitelist),
 * weil Domain-Services TypeScript-Funktionen mit spezifischen Signaturen sind.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'

interface ServiceEntry {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (input: Record<string, unknown>) => Promise<unknown>
}

const SERVICES: ServiceEntry[] = [
  {
    name: 'lead-research',
    description: 'Tiefe Lead-Recherche (Firma + Kontaktperson) via AI + Web-Sources.',
    inputSchema: {
      type: 'object',
      required: ['leadId'],
      properties: { leadId: { type: 'string' }, depth: { type: 'string', enum: ['quick', 'deep'], default: 'deep' } },
    },
    handler: async (input) => {
      const { LeadResearchService } = await import('@/lib/services/ai')
      return LeadResearchService.researchLead({
        leadId: String(input.leadId),
        depth: (input.depth as 'quick' | 'deep') ?? 'deep',
      } as Parameters<typeof LeadResearchService.researchLead>[0])
    },
  },
  {
    name: 'website-scraper',
    description: 'Scraped eine URL und liefert Markdown + Metadaten zurueck.',
    inputSchema: {
      type: 'object',
      required: ['url'],
      properties: { url: { type: 'string' } },
    },
    handler: async (input) => {
      const { WebsiteScraperService } = await import('@/lib/services/ai')
      return WebsiteScraperService.scrape(String(input.url))
    },
  },
]

export const serviceToolAdapter: ToolAdapter = {
  namespace: 'service',

  async list(): Promise<ToolDescriptor[]> {
    return SERVICES.map((s) => ({
      ref: { namespace: 'service', name: s.name, raw: `service:${s.name}` },
      description: s.description,
      inputSchema: s.inputSchema,
    }))
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const name = invocation.ref.name
    const entry = SERVICES.find((s) => s.name === name)
    if (!entry) {
      return { status: 'failed', error: `unbekannter Service: ${name}` }
    }
    try {
      const output = await entry.handler(invocation.input as Record<string, unknown>)
      return {
        status: 'succeeded',
        output: (output ?? {}) as Record<string, unknown>,
      }
    } catch (e) {
      return { status: 'failed', error: (e as Error).message }
    }
  },
}
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/tools/service-adapter.test.ts
```

Erwartet: 3/3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/tools/service-adapter.ts src/__tests__/unit/services/agents/tools/service-adapter.test.ts
git commit -m "feat(agents): service-tool-adapter (lead-research, website-scraper)"
```

---

### Task 7: Tool-Registry Bootstrap

**Files:**
- Create: `src/lib/services/agents/tools/bootstrap.ts`
- Modify: `src/instrumentation.ts`
- Modify: `src/lib/services/agents/index.ts` (Re-Export)

- [ ] **Step 1: Bootstrap-Modul**

`src/lib/services/agents/tools/bootstrap.ts`:

```ts
/**
 * Tool-Registry Bootstrap — registriert die 4 Built-in Adapter.
 * Idempotent: mehrfacher Aufruf ueberschreibt nur, registriert keine Duplikate.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import { ToolRegistry } from '../tool-registry'
import { memoryToolAdapter } from './memory-adapter'
import { workflowToolAdapter } from './workflow-adapter'
import { promptToolAdapter } from './prompt-adapter'
import { serviceToolAdapter } from './service-adapter'

let initialized = false

export function initializeToolRegistry(): void {
  if (initialized) return
  ToolRegistry.register(memoryToolAdapter)
  ToolRegistry.register(workflowToolAdapter)
  ToolRegistry.register(promptToolAdapter)
  ToolRegistry.register(serviceToolAdapter)
  initialized = true
}

export function isToolRegistryInitialized(): boolean {
  return initialized
}
```

- [ ] **Step 2: instrumentation.ts erweitern**

In `src/instrumentation.ts`, NACH dem MemoryWatcher-Block und VOR dem APPOINTMENT_TOKEN_SECRET-Check, einfuegen:

```ts
  // Tool-Registry initialisieren (Phase 3)
  try {
    const { initializeToolRegistry } = await import('@/lib/services/agents/tools/bootstrap')
    initializeToolRegistry()
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[instrumentation] ToolRegistry konnte nicht initialisiert werden:', (e as Error).message)
  }
```

- [ ] **Step 3: Re-Export in agents/index.ts**

In `src/lib/services/agents/index.ts` ergaenze:

```ts
export { initializeToolRegistry, isToolRegistryInitialized } from './tools/bootstrap'
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/tools/bootstrap.ts src/instrumentation.ts src/lib/services/agents/index.ts
git commit -m "feat(agents): Tool-Registry Bootstrap mit 4 Built-in Adaptern"
```

---

### Task 8: Worker-Service.executeStep

**Files:**
- Modify: `src/lib/services/agents/worker.service.ts`
- Modify: `src/__tests__/unit/services/agents/skeleton-imports.test.ts` (Throw-Test entfernen)

- [ ] **Step 1: Implementation**

Ersetze den kompletten Inhalt von `src/lib/services/agents/worker.service.ts`:

```ts
/**
 * Worker Service — fuehrt einzelne agent_steps deterministisch aus.
 * Phase 3: deterministisch, kein Smart-Worker (kommt in Phase 5).
 *
 * Ablauf:
 *   1. Lade Step + Run + Goal
 *   2. Budget-Check via CostTracker
 *   3. Expandiere contextRefs via MemoryService.expandRefs (im Step.config einmischen)
 *   4. Resolve Tool via ToolRegistry.parseRef + invoke
 *   5. Persistiere Result (resultJson, resultSummary, status)
 *   6. Cost-Event schreiben
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.5
 */

import type { WorkerResult } from './types'

const RESULT_SUMMARY_MAX = 500

function deriveResultSummary(output: unknown, error?: string): string {
  if (error) return `FEHLER: ${error}`.slice(0, RESULT_SUMMARY_MAX)
  if (output == null) return ''
  if (typeof output === 'string') return output.slice(0, RESULT_SUMMARY_MAX)
  if (typeof output === 'object') {
    // Versuche text-Felder zu finden
    const obj = output as Record<string, unknown>
    if (typeof obj.text === 'string') return obj.text.slice(0, RESULT_SUMMARY_MAX)
    if (typeof obj.summary === 'string') return obj.summary.slice(0, RESULT_SUMMARY_MAX)
    return JSON.stringify(output).slice(0, RESULT_SUMMARY_MAX)
  }
  return String(output).slice(0, RESULT_SUMMARY_MAX)
}

export const WorkerService = {
  async executeStep(stepId: string): Promise<WorkerResult> {
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')
    const { ToolRegistry } = await import('./tool-registry')
    const { initializeToolRegistry } = await import('./tools/bootstrap')
    const { MemoryService } = await import('./memory.service')
    const { CostTrackerService } = await import('./cost-tracker.service')

    initializeToolRegistry()

    const [step] = await db.select().from(agentSteps).where(eq(agentSteps.id, stepId)).limit(1)
    if (!step) {
      throw new Error(`agent_step ${stepId} nicht gefunden`)
    }

    // Budget-Check
    const budget = await CostTrackerService.checkBudget(step.goalId)
    if (budget.exceeded) {
      const errMsg = `Budget exceeded: ${budget.reason} (${budget.spentTokens}/${budget.budgetTokens} tokens, ${budget.spentCents}/${budget.budgetCents} cents)`
      await db
        .update(agentSteps)
        .set({
          status: 'failed',
          error: errMsg,
          finishedAt: sql`now()`,
          updatedAt: sql`now()`,
          resultSummary: errMsg.slice(0, RESULT_SUMMARY_MAX),
        })
        .where(eq(agentSteps.id, stepId))
      return { status: 'failed', error: errMsg, resultSummary: errMsg.slice(0, RESULT_SUMMARY_MAX) }
    }

    // Step auf running setzen
    await db
      .update(agentSteps)
      .set({ status: 'running', startedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(agentSteps.id, stepId))

    // Refs expandieren — Inhalt fliesst in input.expandedRefs ein
    const refs = Array.isArray(step.contextRefs) ? (step.contextRefs as string[]) : []
    let expanded: Array<{ ref: string; title: string | null; body: string }> = []
    if (refs.length > 0) {
      try {
        expanded = await MemoryService.expandRefs(
          refs.filter((r): r is `memory://${string}` => r.startsWith('memory://')),
        )
      } catch {
        // expansion-Fehler nicht-fatal; tool kann ohne refs laufen
      }
    }

    // Tool resolve + invoke
    const ref = ToolRegistry.parseRef(step.workerType)
    const config = (step.config as Record<string, unknown>) ?? {}
    const toolInput: Record<string, unknown> = {
      ...config,
      _expandedRefs: expanded.length > 0 ? expanded : undefined,
    }

    const startTime = Date.now()
    const result = await ToolRegistry.invoke({
      ref,
      input: toolInput,
      context: { runId: step.runId, stepId: step.id, goalId: step.goalId },
    })
    const durationMs = Date.now() - startTime

    // Cost-Event
    if (result.usage) {
      await CostTrackerService.record({
        runId: step.runId,
        stepId: step.id,
        goalId: step.goalId,
        provider: result.usage.provider,
        model: result.usage.model,
        callRole: 'smart_worker',
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costCents: result.usage.costCents,
      })
    }

    // Persist Step-Result
    if (result.status === 'succeeded') {
      const resultSummary = deriveResultSummary(result.output)
      await db
        .update(agentSteps)
        .set({
          status: 'succeeded',
          finishedAt: sql`now()`,
          updatedAt: sql`now()`,
          resultJson: (result.output ?? {}) as Record<string, unknown>,
          resultSummary,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          costCents: result.usage?.costCents ?? 0,
        })
        .where(eq(agentSteps.id, stepId))

      return {
        status: 'succeeded',
        resultJson: result.output as Record<string, unknown> | undefined,
        resultSummary,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        costCents: result.usage?.costCents,
      }
    }

    const errMsg = result.error ?? 'Unbekannter Fehler'
    const resultSummary = deriveResultSummary(null, errMsg)
    await db
      .update(agentSteps)
      .set({
        status: 'failed',
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
        error: errMsg,
        resultSummary,
      })
      .where(eq(agentSteps.id, stepId))

    return { status: 'failed', error: errMsg, resultSummary }
  },
}

// durationMs reserved for future telemetry
void 0
```

- [ ] **Step 2: Skeleton-Throw-Test entfernen**

In `src/__tests__/unit/services/agents/skeleton-imports.test.ts` den Test entfernen:

```ts
  it('WorkerService.executeStep wirft "nicht implementiert"', async () => {
    await expect(WorkerService.executeStep('step-1')).rejects.toThrow(/nicht implementiert/)
  })
```

- [ ] **Step 3: Tests pruefen**

```bash
npm run typecheck
npm run test:unit -- src/__tests__/unit/services/agents/skeleton-imports.test.ts
```

Erwartet: typecheck clean, skeleton-Tests 7/7 (war 8 vor diesem Task, also -1).

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/agents/worker.service.ts src/__tests__/unit/services/agents/skeleton-imports.test.ts
git commit -m "feat(agents): WorkerService.executeStep (deterministisch via ToolRegistry)"
```

---

### Task 9: `processAgentTaskQueue` echte Implementation

**Files:**
- Modify: `src/lib/services/cron.service.ts`

- [ ] **Step 1: processAgentTaskQueue erweitern**

In `src/lib/services/cron.service.ts` ersetze die no-op `processAgentTaskQueue`-Funktion durch:

```ts
/**
 * Verarbeitet anstehende Agent-Tasks aus der task_queue.
 * Phase 3: dispatcht agent_step_run-Tasks an WorkerService.executeStep.
 * Atomic Claim via FOR UPDATE SKIP LOCKED — kein Doppelaufruf, parallel-safe.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.4
 */
async function processAgentTaskQueue(): Promise<void> {
  const { sql } = await import('drizzle-orm')
  const { db } = await import('@/lib/db')
  const { logger: log } = await import('@/lib/utils/logger')

  // Atomic claim — bis zu 10 Tasks parallel
  const claimResult = (await db.execute(sql`
    UPDATE task_queue SET status='running', executed_at=NOW()
    WHERE id IN (
      SELECT id FROM task_queue
      WHERE type IN ('agent_step_run', 'agent_replan', 'agent_continuation')
        AND status='pending'
        AND scheduled_for <= NOW()
      ORDER BY priority ASC, scheduled_for ASC
      LIMIT 10
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, payload, reference_id
  `)) as unknown as Array<{ id: string; type: string; payload: Record<string, unknown> | null; reference_id: string | null }>

  if (claimResult.length === 0) return

  const { WorkerService } = await import('@/lib/services/agents/worker.service')

  await Promise.allSettled(
    claimResult.map(async (task) => {
      try {
        if (task.type === 'agent_step_run') {
          const stepId = task.reference_id ?? (task.payload?.stepId as string | undefined)
          if (!stepId) {
            throw new Error('agent_step_run ohne stepId in reference_id oder payload.stepId')
          }
          const result = await WorkerService.executeStep(stepId)
          await db.execute(sql`
            UPDATE task_queue
            SET status='completed', result=${JSON.stringify(result)}::jsonb
            WHERE id=${task.id}
          `)
        } else {
          // agent_replan und agent_continuation: Phase 4/6, hier no-op markieren
          await db.execute(sql`
            UPDATE task_queue
            SET status='completed', result=${JSON.stringify({ skipped: 'phase>3 not yet implemented' })}::jsonb
            WHERE id=${task.id}
          `)
        }
      } catch (e) {
        const msg = (e as Error).message
        log.error(`Agent task ${task.id} failed: ${msg}`, e, { module: 'AgentTickHandler' })
        await db.execute(sql`
          UPDATE task_queue
          SET status='failed', error=${msg}
          WHERE id=${task.id}
        `)
      }
    }),
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/cron.service.ts
git commit -m "feat(agents): processAgentTaskQueue dispatcht agent_step_run an Worker"
```

---

### Task 10: Worker Integration-Test

**Files:**
- Create: `src/__tests__/integration/services/agents/worker.service.test.ts`

- [ ] **Step 1: Integration-Test**

`src/__tests__/integration/services/agents/worker.service.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt' : null

describe.skipIf(skip !== null)('WorkerService Integration', () => {
  let tmpRoot: string
  let goalId: string
  let runId: string

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-worker-test-'))
    vi.stubEnv('AGENT_MEMORY_DIR', tmpRoot)
    vi.stubEnv('GOOGLE_AI_API_KEY', '')

    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns } = await import('@/lib/db/schema')
    const [goal] = await db
      .insert(agentGoals)
      .values({ title: 'Worker-Test', status: 'running' })
      .returning({ id: agentGoals.id })
    goalId = goal.id
    const [run] = await db
      .insert(agentRuns)
      .values({ goalId, status: 'executing' })
      .returning({ id: agentRuns.id })
    runId = run.id
  }, 60_000)

  afterAll(async () => {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps, agentCostEvents } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(agentCostEvents).where(eq(agentCostEvents.goalId, goalId))
    await db.delete(agentSteps).where(eq(agentSteps.goalId, goalId))
    await db.delete(agentRuns).where(eq(agentRuns.id, runId))
    await db.delete(agentGoals).where(eq(agentGoals.id, goalId))
    await fs.rm(tmpRoot, { recursive: true, force: true })
    vi.unstubAllEnvs()
  })

  it('executeStep memory:write erstellt File und setzt step status=succeeded', async () => {
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { WorkerService } = await import('@/lib/services/agents')

    const [step] = await db
      .insert(agentSteps)
      .values({
        runId,
        goalId,
        stepKey: 'write-test',
        workerType: 'memory:write',
        config: { scope: 'projects/worker-test', body: '# Worker-Test\nIntegrationsbody' },
        status: 'pending',
      })
      .returning({ id: agentSteps.id })

    const result = await WorkerService.executeStep(step.id)
    expect(result.status).toBe('succeeded')

    const [row] = await db.select().from(agentSteps).where(eq(agentSteps.id, step.id)).limit(1)
    expect(row.status).toBe('succeeded')
    expect(row.resultSummary).toBeTruthy()
    expect(row.finishedAt).not.toBeNull()
  })

  it('executeStep mit unbekanntem Tool setzt status=failed', async () => {
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { WorkerService } = await import('@/lib/services/agents')

    const [step] = await db
      .insert(agentSteps)
      .values({
        runId,
        goalId,
        stepKey: 'fail-test',
        workerType: 'memory:nonexistent',
        config: {},
        status: 'pending',
      })
      .returning({ id: agentSteps.id })

    const result = await WorkerService.executeStep(step.id)
    expect(result.status).toBe('failed')

    const [row] = await db.select().from(agentSteps).where(eq(agentSteps.id, step.id)).limit(1)
    expect(row.status).toBe('failed')
    expect(row.error).toMatch(/unbekanntes Memory-Tool/)
  })

  it('executeStep memory:list lieferte Items zurueck', async () => {
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { WorkerService } = await import('@/lib/services/agents')

    const [step] = await db
      .insert(agentSteps)
      .values({
        runId,
        goalId,
        stepKey: 'list-test',
        workerType: 'memory:list',
        config: { para: 'projects', limit: 10 },
        status: 'pending',
      })
      .returning({ id: agentSteps.id })

    const result = await WorkerService.executeStep(step.id)
    expect(result.status).toBe('succeeded')

    const [row] = await db.select().from(agentSteps).where(eq(agentSteps.id, step.id)).limit(1)
    expect(row.status).toBe('succeeded')
    const resultJson = row.resultJson as { items: Array<{ scope: string }> } | null
    expect(resultJson?.items).toBeDefined()
    expect(resultJson?.items?.some((i) => i.scope === 'projects/worker-test')).toBe(true)
  })

  it('Budget-Exceed setzt step direkt auf failed ohne Tool-Invocation', async () => {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentSteps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { WorkerService } = await import('@/lib/services/agents')

    // Budget exhausted setzen
    await db
      .update(agentGoals)
      .set({ budgetCents: 1, spentCents: 100 })
      .where(eq(agentGoals.id, goalId))

    const [step] = await db
      .insert(agentSteps)
      .values({
        runId,
        goalId,
        stepKey: 'budget-test',
        workerType: 'memory:list',
        config: { para: 'projects' },
        status: 'pending',
      })
      .returning({ id: agentSteps.id })

    const result = await WorkerService.executeStep(step.id)
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/Budget exceeded/)

    // Budget reset fuer ggf. weitere Tests
    await db.update(agentGoals).set({ budgetCents: null, spentCents: 0 }).where(eq(agentGoals.id, goalId))
  })
})
```

- [ ] **Step 2: Run mit DATABASE_URL**

```bash
npm run test:integration -- src/__tests__/integration/services/agents/worker.service.test.ts
```

Erwartet (mit DATABASE_URL): 4/4 passed. Ohne: skipped.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/integration/services/agents/worker.service.test.ts
git commit -m "test(agents): Worker Integration-Test (4 Cases incl. Budget-Stop)"
```

---

### Task 11: Final-Verification

**Files:** keine

- [ ] **Step 1: Voller Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 2: Voller Unit-Test-Lauf**

```bash
npm run test:unit
```

Erwartet: alle bisherigen Tests + neue (~24 neue Unit-Tests gegenueber Phase 2 Ende).

- [ ] **Step 3: Integration-Tests (mit DATABASE_URL)**

```bash
npm run test:integration -- src/__tests__/integration/services/agents/
```

Erwartet: alle Memory + Worker Tests gruen.

- [ ] **Step 4: Push**

```bash
git push -u origin feat/agents-tools-worker
```

CI-Auto-Bump triggert beim Merge auf main.

---

## Self-Review-Notiz

**Spec-Coverage Phase 3** (`docs/superpowers/specs/2026-05-08-agent-system-design.md` §5 + §6.5):
- §5.1 Tool-Kategorien (memory/workflow/prompt/service/agent) → Tasks 3-6 (4 Adapter; agent:* erst in Phase 5 mit Smart-Worker)
- §5.2 Cost-Tracking-Hooks → Task 1 + Task 2
- §5.3 Cost-Tracking-Integration → Task 1
- §6.5 Drei Task-Handler → Task 9 (agent_step_run; replan/continuation phase>3)
- DoD: Manueller `agent_steps`-Insert mit `workerType='prompt:lead_research'` → Tick fuehrt aus → Task 10 testet das mit memory:write/list als Stand-In
- Test: 5 Tool-Calls → 5 Adapter-Unit-Tests + 4 Worker-Integration-Cases

**Was bewusst NICHT in Phase 3:**
- Smart-Worker mit eigenem LLM (`agent:*` namespace) → Phase 5
- Orchestrator-Loop mit Re-Plan (`agent_replan`-Handler) → Phase 4
- Stranded-Run-Reconcile (`agent_continuation`-Handler) → Phase 6
- UI fuer Goals/Runs/Steps → Phase 7

---

## Geschätzter Aufwand

11 Tasks à 10-30 min = **~3-5 Stunden** Implementation. Realistisch 1-2 Arbeitstage.
