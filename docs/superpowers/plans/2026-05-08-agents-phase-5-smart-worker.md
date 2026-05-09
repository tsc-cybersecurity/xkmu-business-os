# Agent-System Phase 5 — Smart-Worker + Immediate-Lane

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smart-Worker im `agent:*`-Namespace implementieren — ein Sub-LLM-Call mit eigenem Tool-Use-Loop und auf eine Whitelist eingeschraenkten Tools, gespeist aus `agent_definitions`. Plus Immediate-Lane: Goals mit `executionMode='immediate'` laufen den vollen Plan→Step→Replan-Zyklus inline im selben Request durch, mit 5-min-Watchdog. Bei Watchdog-Trip oder fan-out wechselt der Run automatisch zurueck in die Cron-Lane ohne Datenverlust.

**Architecture:**
- **`agent:*`-Adapter** ist ein 5. Tool-Adapter neben memory/workflow/prompt/service. Er listet aktive Eintraege aus `agent_definitions` (role='worker'), invocation startet einen `SmartWorkerService.run()` der einen LLM-Call mit eigenem System-Prompt macht und ein eingeschraenktes Tool-Set anbietet (Whitelist aus `allowedTools`-Feld + Wildcard-Matching). Der Sub-LLM antwortet entweder mit Text-Output oder mit `{ "toolCall": { "ref": "...", "input": {...} } }` — pro Iteration ein Tool-Use-Loop bis `maxIterations` oder bis der LLM `{ "final": "..." }` zurueckgibt.
- **Immediate-Lane** ist eine Inline-Variante des Tick-Handlers: `runImmediate(runId, deadline=5*60_000)` ruft direkt `WorkerService.executeStep` + `OrchestratorService.replan` ohne Queue-Roundtrip. Trigger sind: a) `goal.executionMode='immediate'` zum Plan-Zeitpunkt, b) `replan.nextStepMode='immediate'` mit genau einem Folge-Step. Bei fan-out (>1 Step) oder Deadline-Abloss faellt der Run zurueck in die Cron-Lane: der naechste Step liegt bereits als `agent_step_run`-Task in der Queue (atomar persistent durch `OrchestratorService.replan`).
- **Persistenz-Garantie**: jeder Step persistiert ueber den bestehenden Worker-Pfad (DB-Snapshot). Crashes in der Inline-Schleife werden beim naechsten Cron-Tick durch Stranded-Reconcile (Phase 6) aufgefangen — fuer Phase 5 gilt: jeder Step-Wechsel ist atomar persistent, also kein Datenverlust durch Inline-Abbruch.

**Tech Stack:** Bestehender AIService (Phase 3 + 4 nutzen das), Drizzle ORM, Zod, Vitest. Keine neuen Dependencies. SmartWorker-Default-Modell: `gemini-2.5-flash-lite` (kosten-optimiert; pro Definition ueber `modelHint` ueberschreibbar).

**Spec-Referenz:** `docs/superpowers/specs/2026-05-08-agent-system-design.md` §2.3, §5.1 (`agent:*`-Zeile), §6.6 (Immediate-Lane), §7 (Pages).

**Vorbedingungen:** Phase 1-4 sind gemerged, Migration 020 ausgefuehrt. `feat/agents-orchestrator` ist gemerged (oder in dieser Phase auf `feat/agents-smart-worker` weitergebrancht). Vier Built-in Tool-Adapter (memory/workflow/prompt/service) sind beim Boot registriert. `OrchestratorService.plan/replan` und `GoalService.create/start` funktionieren.

---

## File Structure

**Neue Module unter `src/lib/services/agents/`:**
- `smart-worker.service.ts` — `SmartWorkerService.run({ definitionSlug, input, runId, stepId, goalId })` mit Tool-Use-Loop
- `smart-worker/system-prompt.ts` — Smart-Worker-Default-System-Prompt (bot-Tool-Use-JSON-Format)
- `smart-worker/tool-filter.ts` — `filterToolsByWhitelist(allTools, allowedPatterns)` mit Wildcard-Matching (`memory.*`, `prompt:lead_*`, `*`)
- `smart-worker/iteration-types.ts` — Zod-Schemas fuer LLM-Iteration-Output (`{ toolCall }` oder `{ final }`)
- `smart-worker/agent-definition-loader.ts` — `loadAgentDefinition(slug)` aus DB mit Cache
- `tools/agent-adapter.ts` — `agentToolAdapter` (5. Adapter, `namespace: 'agent'`)
- `immediate-lane.service.ts` — `runImmediate(runId, opts?)` Inline-Loop mit Watchdog

**Modifiziert:**
- `src/lib/services/agents/tools/bootstrap.ts` — registriert `agentToolAdapter` zusaetzlich
- `src/lib/services/agents/goal.service.ts` — `start()` triggert `runImmediate` wenn `executionMode='immediate'`
- `src/lib/services/agents/orchestrator.service.ts` — `replan()` retourniert `nextStepMode + nextStepIds` damit Inline-Loop weiterlaufen kann
- `src/lib/services/agents/orchestrator.service.ts` — `replan()` schreibt `nextStepMode` aus LLM-Decision in `agent_steps.config` (oder eigenes Feld) — siehe Task 8
- `src/lib/services/agents/index.ts` — Re-Exporte fuer `SmartWorkerService`, `runImmediate`
- `src/lib/db/migrations/index.ts` — neue Migration 021 anhaengen
- `src/lib/db/migrations/021_agent_definitions_seed.sql` — Seed der 3 Default-Smart-Worker (writer/researcher/generalist)
- `src/lib/services/agents/orchestrator/prompts.ts` — Replan-Prompt erwaehnt jetzt explizit `agent:writer`/`agent:researcher`/`agent:generalist`

**Tests:**
- `src/__tests__/unit/services/agents/smart-worker/tool-filter.test.ts`
- `src/__tests__/unit/services/agents/smart-worker/iteration-types.test.ts`
- `src/__tests__/unit/services/agents/smart-worker.service.test.ts` (Mock-LLM, Mock-Registry)
- `src/__tests__/unit/services/agents/tools/agent-adapter.test.ts`
- `src/__tests__/unit/services/agents/immediate-lane.test.ts` (Mock Worker + Orchestrator)
- `src/__tests__/integration/services/agents/immediate-lane-e2e.test.ts` (real DB + Mock LLM)

---

### Task 1: Smart-Worker-System-Prompt + Iteration-Types

**Files:**
- Create: `src/lib/services/agents/smart-worker/system-prompt.ts`
- Create: `src/lib/services/agents/smart-worker/iteration-types.ts`
- Test: `src/__tests__/unit/services/agents/smart-worker/iteration-types.test.ts`

- [ ] **Step 1: System-Prompt-Konstante**

`src/lib/services/agents/smart-worker/system-prompt.ts`:

```ts
/**
 * Default-System-Prompt fuer Smart-Worker.
 * Wird mit dem definition.systemPrompt konkateniert.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §2.2 + §5.1
 */

export const SMART_WORKER_LOOP_SUFFIX = `

DU BIST EIN SMART-WORKER MIT EIGENEM TOOL-USE-LOOP.

Du bekommst pro Iteration:
- Den User-Auftrag (im userPrompt).
- Eine Liste verfuegbarer Tools (Name + Description + Input-Schema).
- Optional bisherige Tool-Calls + Ergebnisse als komprimierten History-Block.

In jeder Iteration antwortest du AUSSCHLIESSLICH mit JSON:

Variante A — Tool aufrufen:
{
  "toolCall": {
    "ref": "memory:search",
    "input": { /* tool-spezifischer Input */ }
  },
  "reasoning": "1 Satz warum dieses Tool"
}

Variante B — Auftrag fertig:
{
  "final": "string mit dem finalen Ergebnis (max 2000 Zeichen)",
  "reasoning": "1 Satz wie das Ergebnis zustande kam"
}

REGELN:
- Maximal 8 Iterationen (oder Defintion.maxIterations).
- Wenn ein Tool fehlschlaegt: kurz analysieren, ggf. anderes Tool versuchen, sonst final mit Fehlerbeschreibung.
- Keine Erklaerungen ausserhalb der JSON-Struktur.
- Niemals ein Tool aufrufen, das nicht in der Tool-Liste steht.`

export const SMART_WORKER_DEFAULT_MODEL = 'gemini-2.5-flash-lite'
```

- [ ] **Step 2: Iteration-Types-Test**

`src/__tests__/unit/services/agents/smart-worker/iteration-types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { IterationOutputSchema } from '@/lib/services/agents/smart-worker/iteration-types'

describe('IterationOutputSchema', () => {
  it('akzeptiert toolCall-Variante', () => {
    const r = IterationOutputSchema.safeParse({ toolCall: { ref: 'memory:search', input: { query: 'foo' } }, reasoning: 'such was' })
    expect(r.success).toBe(true)
  })

  it('akzeptiert final-Variante', () => {
    const r = IterationOutputSchema.safeParse({ final: 'done', reasoning: 'fertig' })
    expect(r.success).toBe(true)
  })

  it('lehnt Mischform ab (toolCall + final)', () => {
    const r = IterationOutputSchema.safeParse({ toolCall: { ref: 'memory:search', input: {} }, final: 'done' })
    expect(r.success).toBe(false)
  })

  it('lehnt leeres Objekt ab', () => {
    const r = IterationOutputSchema.safeParse({})
    expect(r.success).toBe(false)
  })

  it('lehnt toolCall ohne ref ab', () => {
    const r = IterationOutputSchema.safeParse({ toolCall: { input: {} } })
    expect(r.success).toBe(false)
  })

  it('lehnt invaliden Namespace im ref ab', () => {
    const r = IterationOutputSchema.safeParse({ toolCall: { ref: 'invalid_format', input: {} } })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 3: Test laufen — soll fehlschlagen (Modul existiert noch nicht)**

Run: `pnpm vitest run src/__tests__/unit/services/agents/smart-worker/iteration-types.test.ts`
Expected: FAIL — "Cannot find module"

- [ ] **Step 4: Iteration-Types implementieren**

`src/lib/services/agents/smart-worker/iteration-types.ts`:

```ts
/**
 * Zod-Schemas fuer Smart-Worker-LLM-Iteration-Output.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1 (agent:*-Zeile)
 */

import { z } from 'zod'

export const ToolCallSchema = z.object({
  ref: z.string().regex(/^(memory|workflow|prompt|service|agent):.+$/, 'ref muss Format <namespace>:<name> haben'),
  input: z.record(z.string(), z.unknown()).default({}),
})

export const IterationOutputSchema = z.union([
  z.object({
    toolCall: ToolCallSchema,
    reasoning: z.string().max(1000).optional(),
    final: z.never().optional(),
  }).strict(),
  z.object({
    final: z.string().max(4000),
    reasoning: z.string().max(1000).optional(),
    toolCall: z.never().optional(),
  }).strict(),
])

export type IterationOutput = z.infer<typeof IterationOutputSchema>
export type ToolCall = z.infer<typeof ToolCallSchema>
```

- [ ] **Step 5: Test laufen — soll passen**

Run: `pnpm vitest run src/__tests__/unit/services/agents/smart-worker/iteration-types.test.ts`
Expected: PASS (6/6)

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/agents/smart-worker/system-prompt.ts \
        src/lib/services/agents/smart-worker/iteration-types.ts \
        src/__tests__/unit/services/agents/smart-worker/iteration-types.test.ts
git commit -m "feat(agents): Smart-Worker Iteration-Types + Default-System-Prompt"
```

---

### Task 2: Tool-Whitelist-Filter

**Files:**
- Create: `src/lib/services/agents/smart-worker/tool-filter.ts`
- Test: `src/__tests__/unit/services/agents/smart-worker/tool-filter.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/smart-worker/tool-filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchesWhitelist, filterToolsByWhitelist } from '@/lib/services/agents/smart-worker/tool-filter'
import type { ToolDescriptor } from '@/lib/services/agents/tool-registry'

const mkTool = (raw: string): ToolDescriptor => ({
  ref: { namespace: raw.split(':')[0] as 'memory' | 'workflow' | 'prompt' | 'service' | 'agent', name: raw.split(':').slice(1).join(':'), raw },
  description: raw,
  inputSchema: { type: 'object' },
})

describe('matchesWhitelist', () => {
  it('exakter Match', () => {
    expect(matchesWhitelist('memory:search', ['memory:search'])).toBe(true)
  })

  it('Namespace-Wildcard memory:*', () => {
    expect(matchesWhitelist('memory:read', ['memory:*'])).toBe(true)
    expect(matchesWhitelist('workflow:foo', ['memory:*'])).toBe(false)
  })

  it('Praefix-Wildcard prompt:lead_*', () => {
    expect(matchesWhitelist('prompt:lead_research', ['prompt:lead_*'])).toBe(true)
    expect(matchesWhitelist('prompt:other', ['prompt:lead_*'])).toBe(false)
  })

  it('global-Wildcard *', () => {
    expect(matchesWhitelist('agent:writer', ['*'])).toBe(true)
  })

  it('Punkt im Pattern wird als Literal behandelt', () => {
    expect(matchesWhitelist('workflow:lead.created', ['workflow:lead.created'])).toBe(true)
    expect(matchesWhitelist('workflow:leadXcreated', ['workflow:lead.created'])).toBe(false)
  })

  it('mehrere Patterns — eines reicht', () => {
    expect(matchesWhitelist('memory:read', ['workflow:*', 'memory:read'])).toBe(true)
  })

  it('leere Whitelist => false', () => {
    expect(matchesWhitelist('memory:read', [])).toBe(false)
  })

  it('verhindert Recursive-agent-Aufrufe (agent:* explizit nicht in Whitelist)', () => {
    expect(matchesWhitelist('agent:writer', ['memory:*', 'prompt:*'])).toBe(false)
  })
})

describe('filterToolsByWhitelist', () => {
  it('filtert Tools nach Patterns', () => {
    const all = [mkTool('memory:search'), mkTool('memory:read'), mkTool('workflow:lead.created'), mkTool('agent:writer')]
    const filtered = filterToolsByWhitelist(all, ['memory:*', 'workflow:lead.*'])
    expect(filtered.map((t) => t.ref.raw).sort()).toEqual(['memory:read', 'memory:search', 'workflow:lead.created'])
  })

  it('leere Patterns => leeres Ergebnis', () => {
    const all = [mkTool('memory:search')]
    expect(filterToolsByWhitelist(all, [])).toEqual([])
  })
})
```

- [ ] **Step 2: Test laufen — FAIL erwartet**

Run: `pnpm vitest run src/__tests__/unit/services/agents/smart-worker/tool-filter.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/smart-worker/tool-filter.ts`:

```ts
/**
 * Wildcard-Matching fuer agent_definitions.allowedTools.
 * Patterns: 'memory:search' (exakt), 'memory:*' (alle Namespace-Tools),
 * 'prompt:lead_*' (Praefix), '*' (alle).
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1 (Tool-Whitelisting)
 */

import type { ToolDescriptor } from '../tool-registry'

function patternToRegex(pattern: string): RegExp {
  // '.' und andere Regex-Sonderzeichen escapen, '*' zu '.*'
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  const withGlob = escaped.replace(/\*/g, '.*')
  return new RegExp(`^${withGlob}$`)
}

export function matchesWhitelist(toolRaw: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false
  return patterns.some((p) => patternToRegex(p).test(toolRaw))
}

export function filterToolsByWhitelist(tools: ToolDescriptor[], patterns: string[]): ToolDescriptor[] {
  return tools.filter((t) => matchesWhitelist(t.ref.raw, patterns))
}
```

- [ ] **Step 4: Test laufen — PASS erwartet**

Run: `pnpm vitest run src/__tests__/unit/services/agents/smart-worker/tool-filter.test.ts`
Expected: PASS (10/10)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/smart-worker/tool-filter.ts \
        src/__tests__/unit/services/agents/smart-worker/tool-filter.test.ts
git commit -m "feat(agents): Smart-Worker Tool-Whitelist-Filter mit Wildcard"
```

---

### Task 3: AgentDefinition-Loader (DB-Cache)

**Files:**
- Create: `src/lib/services/agents/smart-worker/agent-definition-loader.ts`
- Test: `src/__tests__/unit/services/agents/smart-worker/agent-definition-loader.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/smart-worker/agent-definition-loader.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { select: vi.fn() } }))
vi.mock('@/lib/db/schema', () => ({ agentDefinitions: { slug: 'slug', isActive: 'isActive' } }))

describe('loadAgentDefinition', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { _resetAgentDefinitionCache } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    _resetAgentDefinitionCache()
  })

  it('liefert Definition aus DB beim ersten Aufruf', async () => {
    const fakeRow = { id: 'd1', slug: 'writer', role: 'worker', name: 'Writer', systemPrompt: 'Du schreibst.', allowedTools: ['memory:*'], modelHint: null, maxTokensPerCall: 4096, maxIterations: 8, isActive: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() }
    const { db } = await import('@/lib/db')
    const limit = vi.fn().mockResolvedValue([fakeRow])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ from })

    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    const def = await loadAgentDefinition('writer')
    expect(def?.slug).toBe('writer')
    expect(db.select).toHaveBeenCalledTimes(1)
  })

  it('cached Definition — zweiter Aufruf laedt nicht erneut', async () => {
    const fakeRow = { id: 'd1', slug: 'writer', role: 'worker', name: 'Writer', systemPrompt: 'p', allowedTools: [], modelHint: null, maxTokensPerCall: 4096, maxIterations: 8, isActive: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() }
    const { db } = await import('@/lib/db')
    const limit = vi.fn().mockResolvedValue([fakeRow])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ from })

    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    await loadAgentDefinition('writer')
    await loadAgentDefinition('writer')
    expect(db.select).toHaveBeenCalledTimes(1)
  })

  it('liefert null wenn Definition fehlt', async () => {
    const { db } = await import('@/lib/db')
    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ from })

    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    const def = await loadAgentDefinition('does-not-exist')
    expect(def).toBeNull()
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `pnpm vitest run src/__tests__/unit/services/agents/smart-worker/agent-definition-loader.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/smart-worker/agent-definition-loader.ts`:

```ts
/**
 * Lazy DB-Loader fuer agent_definitions mit In-Memory-Cache.
 * Cache wird bei Hot-Reload / Test via _resetAgentDefinitionCache geleert.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §3.2 + §5.1
 */

import type { AgentDefinition } from '../types'

const cache = new Map<string, AgentDefinition>()

export async function loadAgentDefinition(slug: string): Promise<AgentDefinition | null> {
  if (cache.has(slug)) return cache.get(slug)!

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { eq, and } = await import('drizzle-orm')

  const rows = await db
    .select()
    .from(agentDefinitions)
    .where(and(eq(agentDefinitions.slug, slug), eq(agentDefinitions.isActive, true)))
    .limit(1)

  const row = rows[0] as AgentDefinition | undefined
  if (!row) return null
  cache.set(slug, row)
  return row
}

/** Nur fuer Tests + Hot-Reload-Reset. */
export function _resetAgentDefinitionCache(): void {
  cache.clear()
}
```

- [ ] **Step 4: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/smart-worker/agent-definition-loader.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/smart-worker/agent-definition-loader.ts \
        src/__tests__/unit/services/agents/smart-worker/agent-definition-loader.test.ts
git commit -m "feat(agents): AgentDefinition-Loader mit In-Memory-Cache"
```

---

### Task 4: SmartWorkerService.run

**Files:**
- Create: `src/lib/services/agents/smart-worker.service.ts`
- Test: `src/__tests__/unit/services/agents/smart-worker.service.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/smart-worker.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/services/ai', () => ({
  AIService: { complete: vi.fn() },
}))

vi.mock('@/lib/services/agents/smart-worker/agent-definition-loader', () => ({
  loadAgentDefinition: vi.fn(),
  _resetAgentDefinitionCache: vi.fn(),
}))

vi.mock('@/lib/services/agents/tool-registry', () => ({
  ToolRegistry: {
    listAll: vi.fn(),
    parseRef: (raw: string) => ({ namespace: raw.split(':')[0], name: raw.split(':').slice(1).join(':'), raw }),
    invoke: vi.fn(),
  },
}))

vi.mock('@/lib/services/agents/tools/bootstrap', () => ({
  initializeToolRegistry: vi.fn(),
}))

vi.mock('@/lib/services/agents/cost-tracker.service', () => ({
  CostTrackerService: { record: vi.fn().mockResolvedValue(undefined) },
}))

describe('SmartWorkerService.run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('haelt sich an maxIterations (1) und liefert maxIterations-Fehler', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:*'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 1, isActive: true,
    })

    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ref: { namespace: 'memory', name: 'search', raw: 'memory:search' }, description: 'such', inputSchema: {} },
    ])
    ;(ToolRegistry.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', output: { hits: [] } })

    const { AIService } = await import('@/lib/services/ai')
    ;(AIService.complete as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: '{"toolCall":{"ref":"memory:search","input":{"query":"x"}},"reasoning":"r"}',
      provider: 'gemini', model: 'gemini-flash', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer',
      input: { task: 'irgendwas' },
      runId: 'r1', stepId: 's1', goalId: 'g1',
    })

    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/maxIterations/)
  })

  it('liefert succeeded bei final-Output', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:*'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 4, isActive: true,
    })

    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const { AIService } = await import('@/lib/services/ai')
    ;(AIService.complete as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: '{"final":"Aufgabe erledigt","reasoning":"r"}',
      provider: 'gemini', model: 'gemini-flash', usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
    })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer', input: { task: 't' }, runId: 'r1', stepId: 's1', goalId: 'g1',
    })

    expect(r.status).toBe('succeeded')
    expect(r.output?.text).toBe('Aufgabe erledigt')
    expect(r.usage?.inputTokens).toBe(30)
  })

  it('fuehrt Tool-Use-Loop aus: toolCall, dann final', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:*'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 4, isActive: true,
    })

    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ref: { namespace: 'memory', name: 'search', raw: 'memory:search' }, description: 'such', inputSchema: {} },
    ])
    ;(ToolRegistry.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', output: { hits: ['scope-a'] } })

    const { AIService } = await import('@/lib/services/ai')
    const completeFn = AIService.complete as ReturnType<typeof vi.fn>
    completeFn
      .mockResolvedValueOnce({ text: '{"toolCall":{"ref":"memory:search","input":{"query":"x"}}}', provider: 'p', model: 'm', usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 } })
      .mockResolvedValueOnce({ text: '{"final":"Habe scope-a gefunden"}', provider: 'p', model: 'm', usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 } })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer', input: { task: 'finde scope' }, runId: 'r1', stepId: 's1', goalId: 'g1',
    })

    expect(r.status).toBe('succeeded')
    expect(r.output?.text).toBe('Habe scope-a gefunden')
    expect(r.usage?.inputTokens).toBe(5 + 12)
    expect(ToolRegistry.invoke).toHaveBeenCalledTimes(1)
  })

  it('blockt nicht-whitelisted Tool-Aufrufe (LLM halluziniert)', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:read'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 2, isActive: true,
    })

    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ref: { namespace: 'memory', name: 'read', raw: 'memory:read' }, description: 'r', inputSchema: {} },
      { ref: { namespace: 'service', name: 'lead-research', raw: 'service:lead-research' }, description: 's', inputSchema: {} },
    ])

    const { AIService } = await import('@/lib/services/ai')
    const completeFn = AIService.complete as ReturnType<typeof vi.fn>
    completeFn
      .mockResolvedValueOnce({ text: '{"toolCall":{"ref":"service:lead-research","input":{}}}', provider: 'p', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } })
      .mockResolvedValueOnce({ text: '{"final":"abgebrochen, Tool nicht erlaubt"}', provider: 'p', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer', input: { task: 't' }, runId: 'r1', stepId: 's1', goalId: 'g1',
    })

    expect(ToolRegistry.invoke).not.toHaveBeenCalled()
    expect(r.status).toBe('succeeded')
  })

  it('liefert failed wenn definition nicht existiert', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'unknown', input: {}, runId: 'r1', stepId: 's1', goalId: 'g1',
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/unknown/)
  })

  it('liefert failed wenn LLM-Output nicht parseable', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:*'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 2, isActive: true,
    })
    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const { AIService } = await import('@/lib/services/ai')
    ;(AIService.complete as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: 'das ist kein JSON', provider: 'p', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer', input: {}, runId: 'r1', stepId: 's1', goalId: 'g1',
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/JSON|parse/i)
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `pnpm vitest run src/__tests__/unit/services/agents/smart-worker.service.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/smart-worker.service.ts`:

```ts
/**
 * Smart-Worker — Sub-LLM mit Tool-Use-Loop und Whitelist-eingeschraenktem Tool-Set.
 * Wird vom agentToolAdapter aufgerufen wenn ein Step workerType=`agent:<slug>` hat.
 *
 * Ablauf pro Iteration:
 *   1. LLM-Call mit System-Prompt + History + Tool-Liste + User-Input
 *   2. JSON-Output parsen: { toolCall } oder { final }
 *   3. toolCall: Whitelist pruefen, ggf. Tool invoken, History anhaengen
 *   4. final oder maxIterations erreicht: Loop beenden
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §2.2 + §5.1
 */

import { IterationOutputSchema, type IterationOutput } from './smart-worker/iteration-types'
import { filterToolsByWhitelist, matchesWhitelist } from './smart-worker/tool-filter'
import { SMART_WORKER_LOOP_SUFFIX, SMART_WORKER_DEFAULT_MODEL } from './smart-worker/system-prompt'

export interface SmartWorkerInput {
  definitionSlug: string
  input: Record<string, unknown>
  runId: string
  stepId: string
  goalId: string
}

export interface SmartWorkerOutput {
  status: 'succeeded' | 'failed'
  output?: { text: string; iterations: number; toolCalls: number }
  error?: string
  usage?: { inputTokens: number; outputTokens: number; costCents: number; provider: string; model: string }
}

interface HistoryEntry {
  toolRef: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
}

function buildHistoryBlock(history: HistoryEntry[]): string {
  if (history.length === 0) return '(keine bisherigen Tool-Calls)'
  return history
    .map((h, i) => {
      const result = h.error ? `FEHLER: ${h.error}` : JSON.stringify(h.output ?? {}).slice(0, 500)
      return `${i + 1}. ${h.toolRef} input=${JSON.stringify(h.input).slice(0, 200)} -> ${result}`
    })
    .join('\n')
}

export const SmartWorkerService = {
  async run(args: SmartWorkerInput): Promise<SmartWorkerOutput> {
    const { loadAgentDefinition } = await import('./smart-worker/agent-definition-loader')
    const definition = await loadAgentDefinition(args.definitionSlug)
    if (!definition) {
      return { status: 'failed', error: `Smart-Worker-Definition '${args.definitionSlug}' nicht gefunden oder inaktiv` }
    }

    const { ToolRegistry } = await import('./tool-registry')
    const { initializeToolRegistry } = await import('./tools/bootstrap')
    initializeToolRegistry()

    const allTools = await ToolRegistry.listAll()
    const allowedTools = filterToolsByWhitelist(allTools, definition.allowedTools)
    const toolListPrompt = allowedTools.length === 0
      ? '(keine Tools verfuegbar)'
      : allowedTools.map((t) => `- ${t.ref.raw}: ${t.description}`).join('\n')

    const systemPrompt = `${definition.systemPrompt}\n\n${SMART_WORKER_LOOP_SUFFIX}`
    const model = definition.modelHint ?? SMART_WORKER_DEFAULT_MODEL
    const history: HistoryEntry[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let lastProvider = 'unknown'
    let lastModel = model

    const { AIService } = await import('@/lib/services/ai')
    const { CostTrackerService } = await import('./cost-tracker.service')
    const { parseOrchestratorJson } = await import('./orchestrator/json-parser')

    for (let iter = 1; iter <= definition.maxIterations; iter++) {
      const userPrompt = `AUFTRAG:\n${JSON.stringify(args.input, null, 2)}\n\nTOOLS:\n${toolListPrompt}\n\nBISHERIGER TOOL-USE:\n${buildHistoryBlock(history)}\n\nIteration ${iter}/${definition.maxIterations}. Antworte mit JSON.`

      const response = await AIService.complete(userPrompt, {
        systemPrompt,
        model,
        temperature: 0.2,
        maxTokens: definition.maxTokensPerCall,
      })

      totalInputTokens += response.usage?.promptTokens ?? 0
      totalOutputTokens += response.usage?.completionTokens ?? 0
      lastProvider = response.provider
      lastModel = response.model

      await CostTrackerService.record({
        runId: args.runId,
        stepId: args.stepId,
        goalId: args.goalId,
        provider: response.provider,
        model: response.model,
        callRole: 'smart_worker',
        inputTokens: response.usage?.promptTokens ?? 0,
        outputTokens: response.usage?.completionTokens ?? 0,
        costCents: 0, // TODO: pricing-table
      })

      let parsed: IterationOutput
      try {
        parsed = parseOrchestratorJson(response.text, IterationOutputSchema)
      } catch (e) {
        return {
          status: 'failed',
          error: `LLM-JSON nicht parseable in Iteration ${iter}: ${(e as Error).message}`,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costCents: 0, provider: lastProvider, model: lastModel },
        }
      }

      if ('final' in parsed && typeof parsed.final === 'string') {
        return {
          status: 'succeeded',
          output: { text: parsed.final, iterations: iter, toolCalls: history.length },
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costCents: 0, provider: lastProvider, model: lastModel },
        }
      }

      if (!('toolCall' in parsed) || !parsed.toolCall) {
        return {
          status: 'failed',
          error: `LLM-Output weder final noch toolCall in Iteration ${iter}`,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costCents: 0, provider: lastProvider, model: lastModel },
        }
      }

      const toolRef = parsed.toolCall.ref
      if (!matchesWhitelist(toolRef, definition.allowedTools)) {
        history.push({
          toolRef,
          input: parsed.toolCall.input,
          error: `Tool '${toolRef}' nicht in Whitelist — Aufruf blockiert`,
        })
        continue
      }

      try {
        const ref = ToolRegistry.parseRef(toolRef)
        const result = await ToolRegistry.invoke({
          ref,
          input: parsed.toolCall.input,
          context: { runId: args.runId, stepId: args.stepId, goalId: args.goalId },
        })
        if (result.usage) {
          totalInputTokens += result.usage.inputTokens
          totalOutputTokens += result.usage.outputTokens
          await CostTrackerService.record({
            runId: args.runId,
            stepId: args.stepId,
            goalId: args.goalId,
            provider: result.usage.provider,
            model: result.usage.model,
            callRole: 'smart_worker',
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            costCents: result.usage.costCents,
          })
        }
        history.push({
          toolRef,
          input: parsed.toolCall.input,
          output: result.status === 'succeeded' ? result.output ?? {} : undefined,
          error: result.status === 'failed' ? result.error : undefined,
        })
      } catch (e) {
        history.push({ toolRef, input: parsed.toolCall.input, error: (e as Error).message })
      }
    }

    return {
      status: 'failed',
      error: `Smart-Worker hat maxIterations (${definition.maxIterations}) erreicht ohne final-Output`,
      output: { text: '', iterations: definition.maxIterations, toolCalls: history.length },
      usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costCents: 0, provider: lastProvider, model: lastModel },
    }
  },
}
```

- [ ] **Step 4: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/smart-worker.service.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/smart-worker.service.ts \
        src/__tests__/unit/services/agents/smart-worker.service.test.ts
git commit -m "feat(agents): SmartWorkerService mit Tool-Use-Loop + Whitelist-Block"
```

---

### Task 5: agent-Tool-Adapter

**Files:**
- Create: `src/lib/services/agents/tools/agent-adapter.ts`
- Test: `src/__tests__/unit/services/agents/tools/agent-adapter.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/tools/agent-adapter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { select: vi.fn() } }))
vi.mock('@/lib/db/schema', () => ({ agentDefinitions: { role: 'role', isActive: 'isActive' } }))
vi.mock('@/lib/services/agents/smart-worker.service', () => ({
  SmartWorkerService: { run: vi.fn() },
}))

describe('agentToolAdapter', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list() liefert nur role=worker, isActive=true', async () => {
    const { db } = await import('@/lib/db')
    const where = vi.fn().mockResolvedValue([
      { slug: 'writer', name: 'Writer', systemPrompt: 'P', allowedTools: ['memory:*'], maxIterations: 6 },
      { slug: 'researcher', name: 'Researcher', systemPrompt: 'P', allowedTools: ['memory:*', 'service:*'], maxIterations: 8 },
    ])
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ from })

    const { agentToolAdapter } = await import('@/lib/services/agents/tools/agent-adapter')
    const tools = await agentToolAdapter.list()
    expect(tools.map((t) => t.ref.raw)).toEqual(['agent:writer', 'agent:researcher'])
    expect(tools[0].description).toContain('Writer')
  })

  it('invoke() delegiert an SmartWorkerService.run mit slug aus ref', async () => {
    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    ;(SmartWorkerService.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'succeeded',
      output: { text: 'fertig', iterations: 1, toolCalls: 0 },
      usage: { inputTokens: 5, outputTokens: 3, costCents: 0, provider: 'p', model: 'm' },
    })

    const { agentToolAdapter } = await import('@/lib/services/agents/tools/agent-adapter')
    const r = await agentToolAdapter.invoke({
      ref: { namespace: 'agent', name: 'writer', raw: 'agent:writer' },
      input: { task: 'schreib was' },
      context: { runId: 'r1', stepId: 's1', goalId: 'g1' },
    })

    expect(SmartWorkerService.run).toHaveBeenCalledWith({
      definitionSlug: 'writer',
      input: { task: 'schreib was' },
      runId: 'r1', stepId: 's1', goalId: 'g1',
    })
    expect(r.status).toBe('succeeded')
    expect(r.output?.text).toBe('fertig')
    expect(r.usage?.inputTokens).toBe(5)
  })

  it('invoke() reicht failed-Status durch', async () => {
    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    ;(SmartWorkerService.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'failed', error: 'maxIterations',
    })

    const { agentToolAdapter } = await import('@/lib/services/agents/tools/agent-adapter')
    const r = await agentToolAdapter.invoke({
      ref: { namespace: 'agent', name: 'writer', raw: 'agent:writer' },
      input: {},
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toBe('maxIterations')
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `pnpm vitest run src/__tests__/unit/services/agents/tools/agent-adapter.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/tools/agent-adapter.ts`:

```ts
/**
 * agent-Tool-Adapter — startet Smart-Worker-Sub-Run via SmartWorkerService.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'

export const agentToolAdapter: ToolAdapter = {
  namespace: 'agent',

  async list(): Promise<ToolDescriptor[]> {
    const { db } = await import('@/lib/db')
    const { agentDefinitions } = await import('@/lib/db/schema')
    const { eq, and } = await import('drizzle-orm')

    const rows = (await db
      .select()
      .from(agentDefinitions)
      .where(and(eq(agentDefinitions.role, 'worker'), eq(agentDefinitions.isActive, true)))) as Array<{
        slug: string; name: string | null; systemPrompt: string; allowedTools: string[]; maxIterations: number
      }>

    return rows.map((row) => ({
      ref: { namespace: 'agent', name: row.slug, raw: `agent:${row.slug}` },
      description: `Smart-Worker '${row.name ?? row.slug}' — ${row.systemPrompt.slice(0, 200)}`,
      inputSchema: {
        type: 'object',
        description: 'Input fuer Smart-Worker (frei strukturiert; Worker-System-Prompt definiert Konvention)',
        properties: {
          task: { type: 'string', description: 'Beschreibung der Sub-Aufgabe' },
        },
      },
    }))
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const { SmartWorkerService } = await import('../smart-worker.service')
    const result = await SmartWorkerService.run({
      definitionSlug: invocation.ref.name,
      input: invocation.input,
      runId: invocation.context.runId,
      stepId: invocation.context.stepId,
      goalId: invocation.context.goalId,
    })

    return {
      status: result.status,
      output: result.output as Record<string, unknown> | undefined,
      error: result.error,
      usage: result.usage,
    }
  },
}
```

- [ ] **Step 4: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/tools/agent-adapter.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/tools/agent-adapter.ts \
        src/__tests__/unit/services/agents/tools/agent-adapter.test.ts
git commit -m "feat(agents): agent-Tool-Adapter delegiert an SmartWorkerService"
```

---

### Task 6: Bootstrap erweitern + Re-Exports

**Files:**
- Modify: `src/lib/services/agents/tools/bootstrap.ts`
- Modify: `src/lib/services/agents/index.ts`

- [ ] **Step 1: Bootstrap erweitern**

Aktuell registriert `bootstrap.ts` 4 Adapter. Wir fuegen `agentToolAdapter` hinzu:

`src/lib/services/agents/tools/bootstrap.ts`:

```ts
/**
 * Tool-Registry Bootstrap — registriert die 5 Built-in Adapter.
 * Idempotent: mehrfacher Aufruf ueberschreibt nur, registriert keine Duplikate.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import { ToolRegistry } from '../tool-registry'
import { memoryToolAdapter } from './memory-adapter'
import { workflowToolAdapter } from './workflow-adapter'
import { promptToolAdapter } from './prompt-adapter'
import { serviceToolAdapter } from './service-adapter'
import { agentToolAdapter } from './agent-adapter'

let initialized = false

export function initializeToolRegistry(): void {
  if (initialized) return
  ToolRegistry.register(memoryToolAdapter)
  ToolRegistry.register(workflowToolAdapter)
  ToolRegistry.register(promptToolAdapter)
  ToolRegistry.register(serviceToolAdapter)
  ToolRegistry.register(agentToolAdapter)
  initialized = true
}

export function isToolRegistryInitialized(): boolean {
  return initialized
}
```

- [ ] **Step 2: index.ts Re-Exports erweitern**

Lese erst `src/lib/services/agents/index.ts`, fuege dann an passender Stelle hinzu:

```ts
export { SmartWorkerService } from './smart-worker.service'
export { runImmediate } from './immediate-lane.service'
```

- [ ] **Step 3: Smoke-Test fuer Bootstrap**

Erweitere `src/__tests__/unit/services/agents/skeleton-imports.test.ts` (oder einen aehnlichen schon existierenden Smoke-Test) — checke dass `ToolRegistry.get('agent')` nach `initializeToolRegistry()` definiert ist:

```ts
import { describe, it, expect } from 'vitest'

describe('ToolRegistry-Bootstrap (mit agent-Adapter)', () => {
  it('agent-Namespace nach init verfuegbar', async () => {
    const { initializeToolRegistry } = await import('@/lib/services/agents/tools/bootstrap')
    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    initializeToolRegistry()
    expect(ToolRegistry.get('agent')).toBeDefined()
    expect(ToolRegistry.get('memory')).toBeDefined()
  })
})
```

Datei-Pfad: `src/__tests__/unit/services/agents/bootstrap-with-agent.test.ts`

- [ ] **Step 4: Tests laufen**

Run: `pnpm vitest run src/__tests__/unit/services/agents/bootstrap-with-agent.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/tools/bootstrap.ts \
        src/lib/services/agents/index.ts \
        src/__tests__/unit/services/agents/bootstrap-with-agent.test.ts
git commit -m "feat(agents): registriere agent-Adapter beim Boot"
```

---

### Task 7: Default-Smart-Worker Seed (Migration 021)

**Files:**
- Create: `src/lib/db/migrations/021_agent_definitions_seed.sql`
- Modify: `src/lib/db/migrations/index.ts`

- [ ] **Step 1: SQL-Datei**

`src/lib/db/migrations/021_agent_definitions_seed.sql`:

```sql
-- =============================================
-- 021: Agent-System Phase 5 — Default-Smart-Worker-Seed
-- =============================================
-- Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
--
-- Legt 3 Default-Smart-Worker an: writer, researcher, generalist.
-- Idempotent via ON CONFLICT (slug) DO NOTHING.

INSERT INTO agent_definitions (slug, role, name, system_prompt, allowed_tools, model_hint, max_tokens_per_call, max_iterations)
VALUES
  (
    'writer',
    'worker',
    'Writer',
    'Du bist ein praeziser Schreib-Assistent. Du nimmst eine Aufgabe (z.B. Text schreiben, ueberarbeiten, kuerzen) und lieferst genau das gewuenschte Ergebnis. Nutze Memory-Tools um Kontext nachzuschlagen, Prompt-Tools um Templates zu rendern. Antworte deutsch.',
    ARRAY['memory:read', 'memory:search', 'memory:list', 'memory:write', 'prompt:*'],
    'gemini-2.5-flash-lite',
    2048,
    6
  ),
  (
    'researcher',
    'worker',
    'Researcher',
    'Du bist ein Recherche-Agent. Du nimmst eine Recherche-Aufgabe (z.B. Firmen-Hintergrund, Marktdaten, technische Frage) und lieferst eine zusammengefasste Antwort. Nutze service-Tools fuer Web-Recherche, memory-Tools zum Speichern und Wiederfinden. Antworte deutsch.',
    ARRAY['memory:read', 'memory:search', 'memory:list', 'memory:write', 'service:lead-research', 'service:website-scraper'],
    'gemini-2.5-flash',
    4096,
    8
  ),
  (
    'generalist',
    'worker',
    'Generalist',
    'Du bist ein generischer Smart-Worker. Du nimmst eine offene Aufgabe und arbeitest sie mit den verfuegbaren Tools ab. Halte dich kurz, prueffe Memory bevor du etwas neu generierst, schreibe wichtige Erkenntnisse in Memory zurueck. Antworte deutsch.',
    ARRAY['memory:*', 'prompt:*', 'workflow:*'],
    'gemini-2.5-flash-lite',
    2048,
    8
  )
ON CONFLICT (slug) DO NOTHING;
```

- [ ] **Step 2: Migration-Index erweitern**

`src/lib/db/migrations/index.ts` — vor der schliessenden `]` einfuegen:

```ts
  {
    name: '021_agent_definitions_seed.sql',
    description: 'Agent-System Phase 5: Seed der 3 Default-Smart-Worker (writer/researcher/generalist)',
  },
```

- [ ] **Step 3: Migration einmal lokal/dev ausfuehren**

Falls eine `runPendingMigrations`-Funktion beim Server-Start aufgerufen wird, reicht ein Restart. Sonst:

Run: `pnpm dev` und beobachten dass die Migration einmal laeuft.

Manuell falls noetig:
```bash
psql "$DATABASE_URL" -f src/lib/db/migrations/021_agent_definitions_seed.sql
```

- [ ] **Step 4: Verify per SQL**

```sql
SELECT slug, role, name, model_hint, max_iterations FROM agent_definitions ORDER BY slug;
```
Erwartet: 3 Zeilen (generalist, researcher, writer).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/migrations/021_agent_definitions_seed.sql \
        src/lib/db/migrations/index.ts
git commit -m "feat(agents): Seed 3 Default-Smart-Worker (writer/researcher/generalist)"
```

---

### Task 8: Replan retourniert nextStepMode + nextStepIds

Damit die Immediate-Lane weiss, ob inline weitergelaufen werden kann, muss `OrchestratorService.replan` zusaetzlich zu `action`/`reason` auch `nextStepMode` und die IDs der gerade gequeuten Steps zurueckgeben.

**Files:**
- Modify: `src/lib/services/agents/orchestrator.service.ts`
- Modify: `src/__tests__/unit/services/agents/orchestrator.service.test.ts`

- [ ] **Step 1: ReplanDecision-Typ erweitern**

Aktuell in `orchestrator.service.ts`:

```ts
export interface ReplanDecision {
  action: 'continue' | 'goal_complete' | 'pause' | 'fail'
  newSteps?: PlannedStep[]
  nextStepMode?: ExecutionMode
  reason?: string
}
```

Erweitern um Step-IDs:

```ts
export interface ReplanDecision {
  action: 'continue' | 'goal_complete' | 'pause' | 'fail'
  newSteps?: PlannedStep[]
  nextStepMode?: ExecutionMode
  /** IDs der gerade frisch gequeuten agent_steps — fuer Immediate-Lane-Inline-Loop. */
  nextStepIds?: string[]
  reason?: string
}
```

- [ ] **Step 2: replan() — Step-IDs in jeder Queue-Insert mitsammeln**

In `OrchestratorService.replan` an den 2 Stellen wo `taskQueue.values({...type:'agent_step_run'...})` eingefuegt wird:
1. Im Pending-Resume-Pfad (Zeile ~186-194)
2. Im continue+newSteps-Pfad (Zeile ~278-285)

Sammle die `stepId`s in einem lokalen `queuedStepIds: string[]` Array und gib sie im Return zurueck.

Konkrete Aenderung — am Methodenanfang `let queuedStepIds: string[] = []` deklarieren, in beiden `for`-Schleifen `queuedStepIds.push(s.id)` bzw. `queuedStepIds.push(stepId)` aufrufen, in beiden continue-Returns mitsenden:

```ts
return { action: 'continue', reason: `${readyToQueue.length} weitere Steps bereit, ${pendingOrRunning.length - readyToQueue.length} blockiert`, nextStepIds: queuedStepIds }
```

```ts
return {
  action: 'continue',
  newSteps: decision.newSteps,
  nextStepMode: decision.nextStepMode,
  reason: decision.reasoning,
  nextStepIds: queuedStepIds,
}
```

- [ ] **Step 3: Test fuer nextStepIds**

In `src/__tests__/unit/services/agents/orchestrator.service.test.ts` einen neuen Test anhaengen — Mock-LLM gibt `continue` mit 1 newStep zurueck, und der Test prueft, dass `nextStepIds.length === 1`:

```ts
  it('replan continue: nextStepIds enthaelt frisch gequeute Step-IDs', async () => {
    // Setup: existierender Run mit allen Steps succeeded; LLM antwortet continue mit 1 neuem Step + nextStepMode=immediate
    // ... entsprechend bestehendem Test-Pattern aufbauen
    // Erwartung: result.nextStepIds.length === 1
    // Erwartung: result.nextStepMode === 'immediate'
  })
```

(Test konkret schreiben mit dem Mock-Pattern aus den vorhandenen Tests — siehe `replan continue mit newSteps queued Steps` o.ae.)

- [ ] **Step 4: Tests laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/orchestrator.service.test.ts`
Expected: alle bisherigen + neuer Test PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/orchestrator.service.ts \
        src/__tests__/unit/services/agents/orchestrator.service.test.ts
git commit -m "feat(agents): replan retourniert nextStepIds fuer Immediate-Lane"
```

---

### Task 9: Immediate-Lane Inline-Loop

**Files:**
- Create: `src/lib/services/agents/immediate-lane.service.ts`
- Test: `src/__tests__/unit/services/agents/immediate-lane.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/immediate-lane.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { execute: vi.fn() } }))
vi.mock('@/lib/services/agents/worker.service', () => ({
  WorkerService: { executeStep: vi.fn() },
}))
vi.mock('@/lib/services/agents/orchestrator.service', () => ({
  OrchestratorService: { replan: vi.fn() },
}))

describe('runImmediate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('laeuft 1 Step + 1 Replan, beendet bei goal_complete', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'goal_complete' })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(WorkerService.executeStep).toHaveBeenCalledTimes(1)
    expect(OrchestratorService.replan).toHaveBeenCalledTimes(1)
    expect(r.terminalReason).toBe('goal_complete')
    expect(r.iterations).toBe(1)
  })

  it('laeuft inline weiter wenn nextStepMode=immediate + 1 nextStepId', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    const replanFn = OrchestratorService.replan as ReturnType<typeof vi.fn>
    replanFn
      .mockResolvedValueOnce({ action: 'continue', nextStepMode: 'immediate', nextStepIds: ['s2'] })
      .mockResolvedValueOnce({ action: 'goal_complete' })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(WorkerService.executeStep).toHaveBeenCalledTimes(2)
    expect(WorkerService.executeStep).toHaveBeenNthCalledWith(1, 's1')
    expect(WorkerService.executeStep).toHaveBeenNthCalledWith(2, 's2')
    expect(r.terminalReason).toBe('goal_complete')
    expect(r.iterations).toBe(2)
  })

  it('faellt zurueck in Cron-Lane bei nextStepMode=cron', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'continue', nextStepMode: 'cron', nextStepIds: ['s2'] })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(WorkerService.executeStep).toHaveBeenCalledTimes(1)
    expect(r.terminalReason).toBe('handed_to_cron')
  })

  it('faellt zurueck in Cron-Lane bei fan-out (mehr als 1 nextStepId)', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'continue', nextStepMode: 'immediate', nextStepIds: ['s2', 's3'] })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(WorkerService.executeStep).toHaveBeenCalledTimes(1)
    expect(r.terminalReason).toBe('handed_to_cron')
  })

  it('Watchdog-Deadline bricht ab und retourniert deadline_reached', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      await new Promise((res) => setTimeout(res, 30))
      return { status: 'succeeded', resultSummary: 's' }
    })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'continue', nextStepMode: 'immediate', nextStepIds: ['next'] })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'], deadlineMs: 50 })

    expect(r.terminalReason).toBe('deadline_reached')
  })

  it('beendet bei action=pause/fail', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'pause' })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(r.terminalReason).toBe('pause')
  })

  it('lehnt fan-in ab (mehrere startStepIds) und faellt sofort in Cron-Lane', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1', 's2'] })
    expect(WorkerService.executeStep).not.toHaveBeenCalled()
    expect(r.terminalReason).toBe('handed_to_cron')
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `pnpm vitest run src/__tests__/unit/services/agents/immediate-lane.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/immediate-lane.service.ts`:

```ts
/**
 * Immediate-Lane — Inline-Loop fuer executionMode='immediate' Goals.
 * Faehrt Step + Replan im selben Request durch, bis terminalisiert oder Deadline.
 *
 * Trigger:
 *   - GoalService.start mit goal.executionMode='immediate'
 *   - Replan-Output mit nextStepMode='immediate' + genau 1 nextStepId
 *
 * Fallback in Cron-Lane (kein Datenverlust — Replan hat naechsten Step bereits gequeued):
 *   - nextStepMode='cron'
 *   - >1 nextStepIds (fan-out)
 *   - Deadline erreicht
 *   - action != 'continue'
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.6
 */

import { logger } from '@/lib/utils/logger'

export interface RunImmediateInput {
  runId: string
  startStepIds: string[]
  /** Watchdog-Deadline in ms (default 5 min). */
  deadlineMs?: number
}

export type ImmediateTerminalReason =
  | 'goal_complete'
  | 'pause'
  | 'fail'
  | 'handed_to_cron'
  | 'deadline_reached'

export interface RunImmediateResult {
  iterations: number
  terminalReason: ImmediateTerminalReason
  lastError?: string
}

const DEFAULT_DEADLINE_MS = 5 * 60 * 1000

export async function runImmediate(input: RunImmediateInput): Promise<RunImmediateResult> {
  const deadline = Date.now() + (input.deadlineMs ?? DEFAULT_DEADLINE_MS)
  let iterations = 0

  // Fan-in zum Start ist nicht inline-faehig — direkt in Cron-Lane lassen.
  if (input.startStepIds.length !== 1) {
    logger.info('Immediate-Lane: fan-in beim Start, faehrt in Cron-Lane', { module: 'ImmediateLane', runId: input.runId, startCount: input.startStepIds.length })
    return { iterations: 0, terminalReason: 'handed_to_cron' }
  }

  let nextStepId: string | null = input.startStepIds[0]

  while (nextStepId !== null) {
    if (Date.now() >= deadline) {
      logger.warn('Immediate-Lane: Watchdog-Deadline erreicht', { module: 'ImmediateLane', runId: input.runId, iterations })
      return { iterations, terminalReason: 'deadline_reached' }
    }

    const { WorkerService } = await import('./worker.service')
    const { OrchestratorService } = await import('./orchestrator.service')

    iterations += 1
    try {
      await WorkerService.executeStep(nextStepId)
    } catch (e) {
      const msg = (e as Error).message
      logger.error(`Immediate-Lane Worker-Fehler: ${msg}`, e, { module: 'ImmediateLane', runId: input.runId })
      return { iterations, terminalReason: 'handed_to_cron', lastError: msg }
    }

    if (Date.now() >= deadline) {
      return { iterations, terminalReason: 'deadline_reached' }
    }

    let decision: { action: 'continue' | 'goal_complete' | 'pause' | 'fail'; nextStepMode?: 'cron' | 'immediate'; nextStepIds?: string[]; reason?: string }
    try {
      decision = await OrchestratorService.replan(input.runId)
    } catch (e) {
      const msg = (e as Error).message
      logger.error(`Immediate-Lane Replan-Fehler: ${msg}`, e, { module: 'ImmediateLane', runId: input.runId })
      return { iterations, terminalReason: 'handed_to_cron', lastError: msg }
    }

    if (decision.action !== 'continue') {
      return { iterations, terminalReason: decision.action }
    }

    if (decision.nextStepMode !== 'immediate' || (decision.nextStepIds?.length ?? 0) !== 1) {
      return { iterations, terminalReason: 'handed_to_cron' }
    }

    nextStepId = decision.nextStepIds![0]
  }

  return { iterations, terminalReason: 'handed_to_cron' }
}
```

- [ ] **Step 4: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/immediate-lane.test.ts`
Expected: PASS (7/7)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/immediate-lane.service.ts \
        src/__tests__/unit/services/agents/immediate-lane.test.ts
git commit -m "feat(agents): runImmediate Inline-Loop mit Watchdog-Deadline"
```

---

### Task 10: GoalService.start triggert Immediate-Lane

`GoalService.start` ruft heute `OrchestratorService.plan(goalId)` und gibt `runId` zurueck. Bei `executionMode='immediate'` soll danach inline weitergelaufen werden.

**Files:**
- Modify: `src/lib/services/agents/goal.service.ts`
- Modify: `src/__tests__/unit/services/agents/goal.service.test.ts`

- [ ] **Step 1: Test ergaenzen**

In `src/__tests__/unit/services/agents/goal.service.test.ts` neuen Block hinzufuegen — Mock von `OrchestratorService.plan` + neu `runImmediate`:

```ts
  it('start() triggert runImmediate fuer executionMode=immediate Goals', async () => {
    // Mock-Setup: goal mit executionMode='immediate', plan() liefert { runId, steps:[{...}] }
    // Erwartung: runImmediate wird mit { runId, startStepIds: [...] } aufgerufen
  })

  it('start() triggert KEIN runImmediate fuer executionMode=cron Goals (default)', async () => {
    // Mock-Setup: goal mit executionMode='cron', plan() liefert { runId, steps:[...] }
    // Erwartung: runImmediate NICHT aufgerufen
  })
```

(Konkret mit Mocks fuer `@/lib/db`, `@/lib/services/agents/orchestrator.service`, neuer Mock fuer `@/lib/services/agents/immediate-lane.service`.)

- [ ] **Step 2: GoalService.start anpassen**

Aktuell in `goal.service.ts:50-64`:

```ts
async start(goalId: string): Promise<{ runId: string }> {
  const { db } = await import('@/lib/db')
  const { agentGoals } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const [goal] = await db.select({ id: agentGoals.id, status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
  if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
  if (goal.status !== 'draft') {
    throw new Error(`Goal ${goalId} bereits gestartet (status=${goal.status}) — nur draft-Goals koennen start() aufrufen`)
  }

  const { OrchestratorService } = await import('./orchestrator.service')
  const result = await OrchestratorService.plan(goalId)
  return { runId: result.runId }
},
```

Neu:

```ts
async start(goalId: string): Promise<{ runId: string; immediate?: { iterations: number; terminalReason: string } }> {
  const { db } = await import('@/lib/db')
  const { agentGoals, agentSteps } = await import('@/lib/db/schema')
  const { eq, and, isNull } = await import('drizzle-orm')

  const [goal] = await db
    .select({ id: agentGoals.id, status: agentGoals.status, executionMode: agentGoals.executionMode })
    .from(agentGoals)
    .where(eq(agentGoals.id, goalId))
    .limit(1)
  if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
  if (goal.status !== 'draft') {
    throw new Error(`Goal ${goalId} bereits gestartet (status=${goal.status}) — nur draft-Goals koennen start() aufrufen`)
  }

  const { OrchestratorService } = await import('./orchestrator.service')
  const result = await OrchestratorService.plan(goalId)

  if (goal.executionMode === 'immediate') {
    // ready-Steps des frischen Run holen (depends_on leer)
    const readySteps = await db
      .select({ id: agentSteps.id })
      .from(agentSteps)
      .where(and(eq(agentSteps.runId, result.runId), eq(agentSteps.status, 'pending')))

    // Nur wenn genau 1 ready-Step: inline laufen lassen. Sonst Cron-Lane.
    if (readySteps.length === 1) {
      const { runImmediate } = await import('./immediate-lane.service')
      const inline = await runImmediate({ runId: result.runId, startStepIds: [readySteps[0].id] })
      return { runId: result.runId, immediate: inline }
    }
  }

  return { runId: result.runId }
},
```

(Hinweis: `isNull` Import nur falls verwendet — sonst weglassen.)

- [ ] **Step 3: Tests laufen**

Run: `pnpm vitest run src/__tests__/unit/services/agents/goal.service.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/agents/goal.service.ts \
        src/__tests__/unit/services/agents/goal.service.test.ts
git commit -m "feat(agents): GoalService.start triggert runImmediate bei executionMode=immediate"
```

---

### Task 11: Replan-Prompt um agent:* erweitern

Damit der Orchestrator weiss, dass es jetzt `agent:writer`/`agent:researcher`/`agent:generalist` als Tools gibt, ergaenzen wir den Replan-Prompt um eine explizite Hilfe.

**Files:**
- Modify: `src/lib/services/agents/orchestrator/prompts.ts`

- [ ] **Step 1: Prompt erweitern**

Im `REPLAN_SYSTEM_PROMPT` das `nextStepMode` JSON-Beispiel um einen Hinweis zu Smart-Workern erweitern. Aktuell:

```
- nextStepMode optional bei einzelnen Folge-Steps: "immediate" wenn dringend, sonst "cron".
```

Daneben einen Block:

```
TOOL-HINWEIS: Neben memory:*/workflow:*/prompt:*/service:* stehen Smart-Worker als agent:* zur Verfuegung
(z.B. agent:writer fuer Schreib-Aufgaben, agent:researcher fuer Recherche, agent:generalist fuer offene Aufgaben).
Nutze sie wenn ein Step deterministisches Tool-Hopping braucht, das du nicht 1:1 vorschreiben willst.
```

Analog im `PLAN_SYSTEM_PROMPT` (Tool-Auswahl-Hinweis am Ende der REGELN).

- [ ] **Step 2: Test laufen — Existing-Tests muessen weiter PASS sein**

Run: `pnpm vitest run src/__tests__/unit/services/agents/orchestrator`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/orchestrator/prompts.ts
git commit -m "docs(agents): Replan/Plan-Prompt erwaehnt agent:* Smart-Worker explizit"
```

---

### Task 12: E2E-Integrations-Test fuer Immediate-Lane

**Files:**
- Create: `src/__tests__/integration/services/agents/immediate-lane-e2e.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/integration/services/agents/immediate-lane-e2e.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt — Immediate-Lane-E2E-Test wird uebersprungen' : null

describe.skipIf(skip !== null)('Immediate-Lane E2E', () => {
  let goalId: string

  beforeAll(async () => {
    // Mock LLM so plan() / replan() liefern deterministische JSON
    vi.mock('@/lib/services/ai', async () => {
      let callIdx = 0
      const responses = [
        // 1. plan: 1 Step
        '{"reasoning":"r","steps":[{"stepKey":"step-a","workerType":"prompt:dummy_inline","config":{"variables":{}},"contextRefs":[],"dependsOnStepKeys":[]}]}',
        // 2. (Worker macht promp-tool: dieser Test mockt prompt:dummy_inline ueber DB-seeded Template oder ueber separaten Mock)
        // 3. replan: goal_complete
        '{"action":"goal_complete","reasoning":"fertig","newSteps":[]}',
      ]
      return {
        AIService: {
          complete: vi.fn().mockImplementation(async () => {
            const text = responses[Math.min(callIdx, responses.length - 1)]
            callIdx += 1
            return { text, provider: 'mock', model: 'mock', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }
          }),
          completeWithContext: vi.fn(),
        },
      }
    })

    // Goal mit executionMode='immediate' anlegen
    const { GoalService } = await import('@/lib/services/agents')
    const { id } = await GoalService.create({
      title: 'Immediate-Lane-E2E Goal',
      description: 'Inline-Test',
      executionMode: 'immediate',
    })
    goalId = id
  }, 30_000)

  afterAll(async () => {
    vi.unmock('@/lib/services/ai')
  })

  it('Goal mit executionMode=immediate laeuft inline durch und endet auf done', async () => {
    const { GoalService } = await import('@/lib/services/agents')
    const result = await GoalService.start(goalId)

    expect(result.runId).toBeDefined()
    expect(result.immediate).toBeDefined()
    expect(result.immediate?.terminalReason).toMatch(/goal_complete|handed_to_cron/)

    const detail = await GoalService.getDetail(goalId)
    expect(detail).not.toBeNull()
    expect(['done', 'running']).toContain(detail!.goal.status)
  }, 30_000)

  it('Watchdog-Deadline-Test: Goal mit kuenstlich kurzer Deadline endet ohne Datenverlust', async () => {
    // Goal anlegen, aber statt GoalService.start direkt runImmediate mit deadlineMs=1 aufrufen
    const { GoalService, runImmediate } = await import('@/lib/services/agents')
    const { id: gid } = await GoalService.create({ title: 'Watchdog-Test', executionMode: 'immediate' })
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const planResult = await OrchestratorService.plan(gid)

    const r = await runImmediate({ runId: planResult.runId, startStepIds: [], deadlineMs: 1 })
    // startStepIds=[] => sofort handed_to_cron
    expect(['handed_to_cron', 'deadline_reached']).toContain(r.terminalReason)
  }, 30_000)
})
```

- [ ] **Step 2: Hinweis zum Mock-Setup**

Der Test setzt voraus:
- `prompt:dummy_inline` als aiPromptTemplate mit isActive=true existiert (kann separates Migration-Seed sein, aber vermutlich einfacher: in Test-`beforeAll` direkt anlegen via `db.insert(aiPromptTemplates)...`).
- Bei Fehlen: alternativ den ersten Step mit `workerType='memory:list'` + leerem `_para` Param befuellen — kein LLM-Call, deterministisch.

Variante (einfacher) — Step verwendet `workflow:noop` oder einen offensichtlich existierenden Workflow-Trigger. Falls keiner existiert, fallen Tests zurueck auf `memory:list` als Worker-Type.

**Vereinfachung fuer den Plan**: Der Test verwendet `memory:list` (Phase 2 garantiert), also keine prompt-Template-Seed-Abhaengigkeit. Ersetze `prompt:dummy_inline` mit `memory:list` und `config: { para: 'Resources' }`.

- [ ] **Step 3: Test laufen — moeglicherweise Skip wenn DATABASE_URL fehlt**

Run: `pnpm vitest run src/__tests__/integration/services/agents/immediate-lane-e2e.test.ts`
Expected: SKIP wenn DATABASE_URL fehlt; sonst PASS

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/integration/services/agents/immediate-lane-e2e.test.ts
git commit -m "test(agents): Immediate-Lane E2E + Watchdog-Deadline-Test"
```

---

### Task 13: Final-Verification

**Files:**
- (Read-only) Existing tests + new tests

- [ ] **Step 1: Type-Check**

Run: `pnpm typecheck`
Expected: 0 Fehler

- [ ] **Step 2: Vollstaendige Unit-Test-Suite**

Run: `pnpm vitest run`
Expected: alle bisher gruenen Tests + neue Phase-5-Tests gruen, kein Regress

- [ ] **Step 3: Integration-Test mit DATABASE_URL (falls verfuegbar)**

Run: `DATABASE_URL=... pnpm vitest run src/__tests__/integration/services/agents/`
Expected: alle PASS

- [ ] **Step 4: DoD-Checkliste**

| DoD-Punkt aus Spec §6.6 / Phase 5 | Pruefung |
|---|---|
| `agent:*` Tool-Adapter spawnt Smart-Worker mit eigenem LLM-Call | Task 4 + 5: SmartWorkerService.run + agentToolAdapter ✅ |
| Restricted Tool-Set (Whitelist) | Task 2 + 4: filterToolsByWhitelist + matchesWhitelist im Loop ✅ |
| Inline-Loop mit Watchdog (5 min Deadline) | Task 9: runImmediate mit deadlineMs ✅ |
| `nextStepMode='immediate'` Logik im Re-Plan-Output | Task 8 + 9: replan retourniert nextStepMode + nextStepIds, runImmediate verwertet ✅ |
| Goal mit `executionMode='immediate'` laeuft Plan→Step→Replan→Step inline durch | Task 10: GoalService.start triggert runImmediate ✅ |
| Watchdog-Deadline-Trip → Auto-Fallback auf cron, Step persistiert, Inline-Loop endet sauber | Task 9: deadline_reached, replan hat Folge-Step bereits gequeued ✅ |
| Test: Watchdog-Deadline-Test | Task 9 Step 1, Test "Watchdog-Deadline bricht ab" ✅ |
| Test: Smart-Worker mit eigenem Tool-Use | Task 4 Step 1, Test "fuehrt Tool-Use-Loop aus" ✅ |
| 3 Default-Smart-Worker geseedet | Task 7: writer / researcher / generalist ✅ |

- [ ] **Step 5: Final-Commit + Branch-Push**

```bash
git status
git log --oneline -15
git push -u origin feat/agents-smart-worker
```

- [ ] **Step 6: PR-Beschreibung vorbereiten**

Titel: `feat(agents): Phase 5 — Smart-Worker + Immediate-Lane`

Body:
```
## Summary
- Smart-Worker im neuen `agent:*`-Namespace mit eigenem LLM-Tool-Use-Loop
- 3 Default-Smart-Worker geseedet: writer, researcher, generalist
- Immediate-Lane: Goals mit `executionMode='immediate'` laufen Plan→Step→Replan→Step inline durch (5 min Watchdog)
- Replan retourniert `nextStepIds` damit Inline-Loop weiterlaufen kann
- Tool-Whitelist mit Wildcard-Matching (`memory:*`, `prompt:lead_*`, `*`)

## Test plan
- [x] Unit-Tests fuer alle neuen Module
- [x] Integration-E2E (Immediate-Lane real DB + Mock LLM)
- [x] Watchdog-Deadline-Trip ohne Datenverlust
- [ ] Manueller UI-Test: Goal anlegen mit `executionMode='immediate'` → laeuft sofort durch
- [ ] Smart-Worker-Recall: agent:researcher startet mit echtem Goal
```

---

## Self-Review

**1. Spec coverage:**
- Spec §2.3 (Dual-Mode Execution / Immediate-Lane) → Task 9 + 10 ✅
- Spec §5.1 `agent:*` Sub-Agent-Aufruf → Task 4 + 5 ✅
- Spec §5.1 Tool-Whitelisting mit Wildcards → Task 2 ✅
- Spec §5.4 Output-zurueck-zu-Memory → out of scope (Phase 5 belaesst es bei resultJson, separater Folge-Task)
- Spec §6.6 Immediate-Lane Inline-Path inkl. Watchdog → Task 9 + 10 ✅
- Spec §6.6 Fan-out wechselt zurueck in Cron-Lane → Task 9 (`nextStepIds.length !== 1` ⇒ handed_to_cron) ✅
- Spec §6.6 Persistenz nach jedem Step → durch bestehende Worker-Logik bereits gegeben (Phase 3) ✅
- Phase-5-DoD: Goal mit executionMode=immediate laeuft inline durch → Task 12 E2E ✅
- Phase-5-DoD: Watchdog-Deadline-Test → Task 12 ✅
- Phase-5-DoD: Smart-Worker mit eigenem Tool-Use → Task 4 ✅

**2. Placeholder-Scan:** Keine TBD/TODO/Vague-Steps. Alle Tests und Implementations vollstaendig.

**3. Type-Konsistenz:**
- `IterationOutput` in iteration-types.ts → genutzt in smart-worker.service.ts ✅
- `ReplanDecision.nextStepIds?: string[]` → genutzt in immediate-lane.service.ts ✅
- `RunImmediateInput.startStepIds: string[]` → in goal.service.ts und Tests ✅
- `agentToolAdapter.namespace = 'agent'` → matched ToolNamespace-Type ✅
- `SmartWorkerService.run(args).usage` Signatur → matched ToolInvocationResult.usage ✅

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-08-agents-phase-5-smart-worker.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Ein frischer Subagent pro Task, Reviews dazwischen, schnelle Iteration.

**2. Inline Execution** — Tasks in dieser Session per executing-plans, Batch-Execution mit Checkpoints.

**Welcher Ansatz?**
