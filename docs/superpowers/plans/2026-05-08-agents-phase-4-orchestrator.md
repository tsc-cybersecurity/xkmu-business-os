# Agent-System Phase 4 — Orchestrator-Loop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hauptagent (Orchestrator) implementieren — initial Plan-LLM-Call zerlegt ein Goal in agent_steps, nach jedem Worker-Result laeuft ein Re-Plan-LLM-Call, der entscheidet `continue`/`goal_complete`/`pause`/`fail`. End-to-End: User legt Goal an → Orchestrator plant → Worker fuehren aus → Re-Plan-Loop bis `done`. Plus Minimal-UI fuer Goal-CRUD.

**Architecture:** Zwei LLM-Calls pro Run (plan + replan-Iterationen). Orchestrator sieht NUR: Goal-Title/Description, Tool-Liste (Names+Descriptions), Plan-Liste mit `resultSummary` (max 500 chars/step), Memory-Refs als Strings. Niemals volle Bodies/Outputs. JSON-Mode via System-Prompt-Anweisung + JSON-Parser-Helper. Default-Modell: `gemini-2.5-flash` (plan), `gemini-2.5-flash-lite` (replan). Goal-Status-Machine: draft → planning → running → done/failed/paused/cancelled.

**Tech Stack:** Bestehender AIService (Phase 3 nutzt das schon), Drizzle ORM, Next.js 16 App Router fuer UI, Recharts (Phase 7 nicht hier), shadcn/ui Cards/Badges/Buttons.

**Spec-Referenz:** `docs/superpowers/specs/2026-05-08-agent-system-design.md` §2 + §6

**Vorbedingungen:** Phase 1 + 2 + 3 sind gemerged, Migration 020 ausgefuehrt, Tool-Adapter sind beim Boot registriert. Branch dieser Phase: `feat/agents-orchestrator`.

---

## File Structure

**Neue Module unter `src/lib/services/agents/orchestrator/`:**
- `prompts.ts` — System-Prompts (plan + replan) als Konstanten
- `json-parser.ts` — `parseOrchestratorJson()` extrahiert JSON aus LLM-Output (mit Markdown-Code-Block-Fallback)
- `plan-types.ts` — Zod-Schemas fuer Orchestrator-JSON-Outputs

**Modifiziert:**
- `src/lib/services/agents/orchestrator.service.ts` — Skeleton → echte Implementation (plan + replan)
- `src/lib/services/agents/index.ts` — Re-Export `GoalService`
- `src/lib/services/cron.service.ts` — `processAgentTaskQueue` erweitert: `agent_replan`-Handler delegiert an OrchestratorService.replan
- `src/__tests__/unit/services/agents/skeleton-imports.test.ts` — Throw-Tests entfernen fuer plan/replan

**Neue Module:**
- `src/lib/services/agents/goal.service.ts` — Goal-Lifecycle (create, start, pause, resume, cancel)

**Neue API-Routes** unter `src/app/api/agents/goals/`:
- `route.ts` — `GET` (list) + `POST` (create + start)
- `[id]/route.ts` — `GET` (detail with run + steps) + `PATCH` (pause/resume/cancel)

**Neue UI** unter `src/app/intern/(dashboard)/agents/goals/`:
- `page.tsx` — Goal-Liste
- `new/page.tsx` — Goal-Form
- `[id]/page.tsx` — Goal-Detail mit Status-Polling

**Neue Components** unter `src/components/agents/goals/`:
- `goal-form.tsx` — Title/Description/Budget/ExecutionMode
- `goal-list-table.tsx` — Liste mit Status-Badges
- `goal-detail-view.tsx` — Plan-Tree + Step-Status + Cost
- `goal-status-poller.tsx` — Hook fuer Auto-Refresh waehrend `running`

**Tests:**
- `src/__tests__/unit/services/agents/orchestrator/json-parser.test.ts`
- `src/__tests__/unit/services/agents/orchestrator/plan-types.test.ts`
- `src/__tests__/unit/services/agents/orchestrator.service.test.ts` (Mock-LLM)
- `src/__tests__/unit/services/agents/goal.service.test.ts`
- `src/__tests__/integration/services/agents/orchestrator-e2e.test.ts` (Mock-LLM, real DB)

---

### Task 1: System-Prompts + Plan-Types

**Files:**
- Create: `src/lib/services/agents/orchestrator/prompts.ts`
- Create: `src/lib/services/agents/orchestrator/plan-types.ts`
- Test: `src/__tests__/unit/services/agents/orchestrator/plan-types.test.ts`

- [ ] **Step 1: Plan-Types**

`src/lib/services/agents/orchestrator/plan-types.ts`:

```ts
/**
 * Zod-Schemas fuer Orchestrator-JSON-Outputs.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.5
 */

import { z } from 'zod'

export const PlannedStepSchema = z.object({
  stepKey: z.string().min(1).max(200),
  workerType: z.string().regex(/^(memory|workflow|prompt|service|agent):.+$/, 'workerType muss Format <namespace>:<name> haben'),
  config: z.record(z.string(), z.unknown()).default({}),
  contextRefs: z.array(z.string()).default([]),
  dependsOnStepKeys: z.array(z.string()).default([]),
  nextStepMode: z.enum(['cron', 'immediate']).optional(),
})
export type PlannedStep = z.infer<typeof PlannedStepSchema>

export const InitialPlanSchema = z.object({
  reasoning: z.string().max(2000).default(''),
  steps: z.array(PlannedStepSchema).min(1).max(20),
})
export type InitialPlan = z.infer<typeof InitialPlanSchema>

export const ReplanDecisionSchema = z.object({
  action: z.enum(['continue', 'goal_complete', 'pause', 'fail']),
  reasoning: z.string().max(2000).default(''),
  newSteps: z.array(PlannedStepSchema).default([]),
  nextStepMode: z.enum(['cron', 'immediate']).optional(),
})
export type ReplanDecision = z.infer<typeof ReplanDecisionSchema>
```

- [ ] **Step 2: Failing Test**

`src/__tests__/unit/services/agents/orchestrator/plan-types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { InitialPlanSchema, ReplanDecisionSchema, PlannedStepSchema } from '@/lib/services/agents/orchestrator/plan-types'

describe('Orchestrator Plan-Types', () => {
  it('PlannedStepSchema akzeptiert valides workerType', () => {
    const r = PlannedStepSchema.parse({
      stepKey: 'research-acme',
      workerType: 'service:lead-research',
      config: { companyName: 'Acme' },
      contextRefs: [],
      dependsOnStepKeys: [],
    })
    expect(r.stepKey).toBe('research-acme')
  })

  it('PlannedStepSchema lehnt workerType ohne Namespace ab', () => {
    expect(() => PlannedStepSchema.parse({
      stepKey: 'x',
      workerType: 'invalid',
    })).toThrow(/workerType/)
  })

  it('PlannedStepSchema setzt Defaults fuer optionale Felder', () => {
    const r = PlannedStepSchema.parse({
      stepKey: 'x',
      workerType: 'memory:list',
    })
    expect(r.config).toEqual({})
    expect(r.contextRefs).toEqual([])
    expect(r.dependsOnStepKeys).toEqual([])
  })

  it('InitialPlanSchema verlangt mind. 1 Step', () => {
    expect(() => InitialPlanSchema.parse({ reasoning: '', steps: [] })).toThrow()
  })

  it('InitialPlanSchema akzeptiert max. 20 Steps', () => {
    const steps = Array.from({ length: 20 }, (_, i) => ({
      stepKey: `step-${i}`,
      workerType: 'memory:list',
    }))
    const r = InitialPlanSchema.parse({ reasoning: 'test', steps })
    expect(r.steps).toHaveLength(20)
  })

  it('InitialPlanSchema lehnt 21 Steps ab', () => {
    const steps = Array.from({ length: 21 }, (_, i) => ({
      stepKey: `step-${i}`,
      workerType: 'memory:list',
    }))
    expect(() => InitialPlanSchema.parse({ reasoning: '', steps })).toThrow()
  })

  it('ReplanDecisionSchema akzeptiert continue + newSteps', () => {
    const r = ReplanDecisionSchema.parse({
      action: 'continue',
      reasoning: 'Brauche mehr Daten',
      newSteps: [{ stepKey: 'next', workerType: 'memory:read' }],
    })
    expect(r.action).toBe('continue')
    expect(r.newSteps).toHaveLength(1)
  })

  it('ReplanDecisionSchema akzeptiert goal_complete ohne newSteps', () => {
    const r = ReplanDecisionSchema.parse({
      action: 'goal_complete',
      reasoning: 'Alles fertig',
    })
    expect(r.action).toBe('goal_complete')
    expect(r.newSteps).toEqual([])
  })

  it('ReplanDecisionSchema lehnt unbekannte action ab', () => {
    expect(() => ReplanDecisionSchema.parse({ action: 'unknown' })).toThrow()
  })
})
```

- [ ] **Step 3: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/orchestrator/plan-types.test.ts
```

- [ ] **Step 4: Test wird gruen mit dem Schema aus Step 1**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/orchestrator/plan-types.test.ts
```

Erwartet: 9/9 passed.

- [ ] **Step 5: System-Prompts**

`src/lib/services/agents/orchestrator/prompts.ts`:

```ts
/**
 * Orchestrator System-Prompts.
 * Klare JSON-Output-Anweisung — wir parsen mit Zod, also strikte Form noetig.
 */

export const PLAN_SYSTEM_PROMPT = `Du bist der Orchestrator-Agent eines KI-getriebenen Business-OS. Dein Job:
1. Du bekommst ein Goal (Titel + Beschreibung).
2. Du bekommst eine Liste verfuegbarer Tools (jedes mit namespace:name + Kurzbeschreibung).
3. Du bekommst optional Memory-Refs aus dem Wissensspeicher.
4. Du erstellst einen Plan: 1-15 Steps, die das Goal in atomare Tool-Aufrufe zerlegen.

REGELN:
- Antworte AUSSCHLIESSLICH mit valider JSON gemaess dem Schema.
- Keine Erklaerungen ausserhalb der JSON.
- workerType MUSS das Format <namespace>:<name> haben (memory|workflow|prompt|service|agent).
- stepKey ist ein eindeutiger kurzer Slug (z.B. "research-acme", "draft-summary").
- dependsOnStepKeys: andere Steps die fertig sein muessen bevor dieser laeuft (kann leer sein fuer parallele Steps).
- contextRefs: Memory-Refs als "memory://<scope>" Strings — der Worker bekommt die Inhalte beim Start expandiert.
- Halte den Plan minimal. YAGNI. Keine Spekulations-Steps.

JSON-SCHEMA:
{
  "reasoning": "1-3 Saetze warum dieser Plan das Goal erreicht",
  "steps": [
    {
      "stepKey": "string",
      "workerType": "namespace:name",
      "config": { /* tool-spezifische Inputs */ },
      "contextRefs": ["memory://..."],
      "dependsOnStepKeys": ["other-step-key"]
    }
  ]
}`

export const REPLAN_SYSTEM_PROMPT = `Du bist der Orchestrator-Agent. Ein Run laeuft, einige Steps sind fertig.

Du bekommst:
- Das Goal (Titel + Beschreibung).
- Den aktuellen Run-State: alle Steps mit Status + resultSummary (max 500 chars).
- Die Tool-Liste (gleiche wie initial).

Entscheide: weiter? fertig? pausieren? fehlschlagen?

REGELN:
- Antworte AUSSCHLIESSLICH mit valider JSON gemaess dem Schema.
- action: "continue" | "goal_complete" | "pause" | "fail"
- Bei "continue": newSteps mit weiteren Steps (Plan-Erweiterung).
- Bei "goal_complete": kein newSteps noetig — Run wird auf succeeded gesetzt.
- Bei "pause": Run wird angehalten, User kann manuell resumen.
- Bei "fail": Run wird beendet, Goal auf failed.
- nextStepMode optional bei einzelnen Folge-Steps: "immediate" wenn dringend, sonst "cron".

JSON-SCHEMA:
{
  "action": "continue|goal_complete|pause|fail",
  "reasoning": "1-3 Saetze warum diese Entscheidung",
  "newSteps": [ /* nur wenn action=continue, sonst leer */ ],
  "nextStepMode": "cron|immediate"
}`

export const ORCHESTRATOR_DEFAULT_MODEL_PLAN = 'gemini-2.5-flash'
export const ORCHESTRATOR_DEFAULT_MODEL_REPLAN = 'gemini-2.5-flash-lite'
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/agents/orchestrator/plan-types.ts src/lib/services/agents/orchestrator/prompts.ts src/__tests__/unit/services/agents/orchestrator/plan-types.test.ts
git commit -m "feat(agents): Orchestrator System-Prompts + Zod Plan-Types"
```

---

### Task 2: JSON-Parser-Helper

**Files:**
- Create: `src/lib/services/agents/orchestrator/json-parser.ts`
- Test: `src/__tests__/unit/services/agents/orchestrator/json-parser.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/orchestrator/json-parser.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { parseOrchestratorJson } from '@/lib/services/agents/orchestrator/json-parser'

const TestSchema = z.object({ action: z.string(), count: z.number() })

describe('Orchestrator JSON-Parser', () => {
  it('parst reines JSON', () => {
    const r = parseOrchestratorJson('{"action":"continue","count":3}', TestSchema)
    expect(r).toEqual({ action: 'continue', count: 3 })
  })

  it('parst JSON aus Markdown-Code-Block ```json', () => {
    const input = '```json\n{"action":"goal_complete","count":0}\n```'
    const r = parseOrchestratorJson(input, TestSchema)
    expect(r.action).toBe('goal_complete')
  })

  it('parst JSON aus Markdown-Code-Block ohne language-tag', () => {
    const input = '```\n{"action":"pause","count":1}\n```'
    const r = parseOrchestratorJson(input, TestSchema)
    expect(r.action).toBe('pause')
  })

  it('extrahiert JSON aus gemischtem Text', () => {
    const input = 'Hier ist mein Plan:\n{"action":"continue","count":2}\nLgr,\nLLM'
    const r = parseOrchestratorJson(input, TestSchema)
    expect(r.action).toBe('continue')
    expect(r.count).toBe(2)
  })

  it('wirft bei nicht-parsebarem Input', () => {
    expect(() => parseOrchestratorJson('keine JSON hier', TestSchema)).toThrow(/JSON/)
  })

  it('wirft bei Schema-Violation', () => {
    expect(() => parseOrchestratorJson('{"action":"x","count":"not-a-number"}', TestSchema)).toThrow()
  })

  it('parst tief-verschachtelte JSON mit Klammer-Matching', () => {
    const input = '{"action":"continue","count":5,"nested":{"deep":{"value":1}}}'
    const Schema = z.object({ action: z.string(), count: z.number(), nested: z.object({ deep: z.object({ value: z.number() }) }) })
    const r = parseOrchestratorJson(input, Schema)
    expect(r.nested.deep.value).toBe(1)
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/orchestrator/json-parser.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/orchestrator/json-parser.ts`:

```ts
/**
 * Orchestrator-JSON-Parser — extrahiert JSON aus LLM-Output.
 * Robust gegen Markdown-Code-Blocks und Prosa-Begleittext.
 */

import type { z } from 'zod'

/**
 * Sucht das erste {...}-Objekt im Text mit Klammer-Matching.
 * Ignoriert {} innerhalb von Strings.
 */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === '\\') { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function stripMarkdownCodeBlock(text: string): string {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  return match ? match[1] : text
}

export function parseOrchestratorJson<T>(raw: string, schema: z.ZodType<T>): T {
  const stripped = stripMarkdownCodeBlock(raw).trim()

  // Versuch 1: direkt parsen
  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    // Versuch 2: erstes JSON-Object aus dem Text extrahieren
    const extracted = extractFirstJsonObject(stripped)
    if (!extracted) {
      throw new Error(`Kein JSON-Objekt im LLM-Output gefunden: ${raw.slice(0, 200)}`)
    }
    try {
      parsed = JSON.parse(extracted)
    } catch (e) {
      throw new Error(`JSON-Parsing fehlgeschlagen: ${(e as Error).message}`)
    }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`JSON-Schema-Violation: ${issues}`)
  }
  return result.data
}
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/orchestrator/json-parser.test.ts
```

Erwartet: 7/7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/orchestrator/json-parser.ts src/__tests__/unit/services/agents/orchestrator/json-parser.test.ts
git commit -m "feat(agents): JSON-Parser-Helper mit Markdown-Block + Klammer-Matching"
```

---

### Task 3: OrchestratorService.plan() Implementation

**Files:**
- Modify: `src/lib/services/agents/orchestrator.service.ts`
- Test: `src/__tests__/unit/services/agents/orchestrator.service.test.ts`

- [ ] **Step 1: Failing Test (mockt AIService + DB)**

`src/__tests__/unit/services/agents/orchestrator.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const aiCompleteMock = vi.fn()
const insertReturningMock = vi.fn()
const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }))
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))

vi.mock('@/lib/db', () => ({
  db: { insert: insertMock, update: updateMock, select: selectMock },
}))
vi.mock('@/lib/db/schema', () => ({
  agentGoals: { id: 'id', title: 'title', description: 'description', status: 'status' },
  agentRuns: { id: 'id', goalId: 'goalId', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId', goalId: 'goalId', stepKey: 'stepKey' },
  taskQueue: { id: 'id', type: 'type', status: 'status', referenceType: 'referenceType', referenceId: 'referenceId' },
}))
vi.mock('@/lib/services/ai', () => ({
  AIService: { complete: aiCompleteMock },
}))
vi.mock('@/lib/services/agents/tool-registry', () => ({
  ToolRegistry: {
    listAll: vi.fn().mockResolvedValue([
      { ref: { namespace: 'memory', name: 'search', raw: 'memory:search' }, description: 'Search', inputSchema: {} },
      { ref: { namespace: 'service', name: 'lead-research', raw: 'service:lead-research' }, description: 'Lead-Research', inputSchema: {} },
    ]),
  },
}))
vi.mock('@/lib/services/agents/tools/bootstrap', () => ({
  initializeToolRegistry: vi.fn(),
}))
vi.mock('@/lib/services/agents/cost-tracker.service', () => ({
  CostTrackerService: { record: vi.fn().mockResolvedValue(undefined), checkBudget: vi.fn().mockResolvedValue({ exceeded: false }) },
}))

describe('OrchestratorService.plan', () => {
  beforeEach(() => {
    aiCompleteMock.mockReset()
    insertMock.mockClear()
    insertValuesMock.mockClear()
    insertReturningMock.mockReset()
    selectLimitMock.mockReset()
  })

  it('plan() ruft LLM, parst JSON, persistiert run + steps + queues task', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'Acme recherchieren', description: 'Mach das' }])
    insertReturningMock.mockResolvedValueOnce([{ id: 'run-1' }])
    insertReturningMock.mockResolvedValueOnce([{ id: 'step-1' }, { id: 'step-2' }])
    insertReturningMock.mockResolvedValueOnce([{ id: 'tq-1' }])
    insertReturningMock.mockResolvedValueOnce([{ id: 'tq-2' }])

    aiCompleteMock.mockResolvedValueOnce({
      text: JSON.stringify({
        reasoning: 'Plan: Recherche dann Summary.',
        steps: [
          { stepKey: 'research', workerType: 'service:lead-research', config: { companyName: 'Acme' }, contextRefs: [], dependsOnStepKeys: [] },
          { stepKey: 'summary', workerType: 'memory:write', config: { scope: 'projects/acme', body: '#Acme' }, contextRefs: [], dependsOnStepKeys: ['research'] },
        ],
      }),
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
    })

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const r = await OrchestratorService.plan('g1')

    expect(aiCompleteMock).toHaveBeenCalledTimes(1)
    expect(r.runId).toBe('run-1')
    expect(r.steps).toHaveLength(2)
    expect(r.steps[0].stepKey).toBe('research')
    // 1 run + 1 multi-row steps + 1 step-task (research, no deps) — summary depends on research, not queued yet
    // Insert calls: run (1), steps (1), task_queue (1 for research only)
    expect(insertMock.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('plan() wirft wenn Goal nicht gefunden', async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await expect(OrchestratorService.plan('unknown')).rejects.toThrow(/nicht gefunden/)
  })

  it('plan() wirft bei ungueltigem JSON-Output', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'X', description: '' }])
    aiCompleteMock.mockResolvedValueOnce({
      text: 'kein JSON',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    })
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await expect(OrchestratorService.plan('g1')).rejects.toThrow(/JSON/)
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/orchestrator.service.test.ts
```

- [ ] **Step 3: plan() Implementation**

In `src/lib/services/agents/orchestrator.service.ts` ersetze die `plan`-Methode (komplett, statt Skeleton-Throw):

```ts
import type { ExecutionMode, PlannedStep } from './types'
import { InitialPlanSchema, type InitialPlan } from './orchestrator/plan-types'
import { PLAN_SYSTEM_PROMPT, REPLAN_SYSTEM_PROMPT, ORCHESTRATOR_DEFAULT_MODEL_PLAN, ORCHESTRATOR_DEFAULT_MODEL_REPLAN } from './orchestrator/prompts'
import { parseOrchestratorJson } from './orchestrator/json-parser'

export interface ReplanDecision {
  action: 'continue' | 'goal_complete' | 'pause' | 'fail'
  newSteps?: PlannedStep[]
  nextStepMode?: ExecutionMode
  reason?: string
}

async function buildToolListPrompt(): Promise<string> {
  const { ToolRegistry } = await import('./tool-registry')
  const { initializeToolRegistry } = await import('./tools/bootstrap')
  initializeToolRegistry()
  const tools = await ToolRegistry.listAll()
  if (tools.length === 0) return '(keine Tools verfuegbar)'
  return tools.map((t) => `- ${t.ref.raw}: ${t.description}`).join('\n')
}

async function callLLM(systemPrompt: string, userPrompt: string, model: string, costContext: { runId: string; goalId: string; callRole: 'orchestrator_plan' | 'orchestrator_replan' }): Promise<string> {
  const { AIService } = await import('@/lib/services/ai')
  const { CostTrackerService } = await import('./cost-tracker.service')

  const response = await AIService.complete(userPrompt, {
    systemPrompt,
    model,
    temperature: 0.2,
    maxTokens: 2048,
  })

  await CostTrackerService.record({
    runId: costContext.runId,
    goalId: costContext.goalId,
    provider: response.provider,
    model: response.model,
    callRole: costContext.callRole,
    inputTokens: response.usage?.promptTokens ?? 0,
    outputTokens: response.usage?.completionTokens ?? 0,
    costCents: 0, // TODO: pricing-table
  })

  return response.text
}

export const OrchestratorService = {
  async plan(goalId: string): Promise<{ runId: string; steps: PlannedStep[] }> {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps, taskQueue } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    // Goal laden
    const [goal] = await db
      .select({ id: agentGoals.id, title: agentGoals.title, description: agentGoals.description })
      .from(agentGoals)
      .where(eq(agentGoals.id, goalId))
      .limit(1)
    if (!goal) {
      throw new Error(`Goal ${goalId} nicht gefunden`)
    }

    // Goal-Status auf 'planning'
    await db.update(agentGoals).set({ status: 'planning', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))

    // Run anlegen (status='planning')
    const [run] = await db
      .insert(agentRuns)
      .values({ goalId, status: 'planning' })
      .returning({ id: agentRuns.id })

    // Tool-Liste fuer System-Prompt
    const toolList = await buildToolListPrompt()
    const userPrompt = `GOAL:\n  Titel: ${goal.title}\n  Beschreibung: ${goal.description ?? '(keine)'}\n\nVERFUEGBARE TOOLS:\n${toolList}\n\nErstelle den Plan als JSON.`

    // LLM-Call
    const rawText = await callLLM(PLAN_SYSTEM_PROMPT, userPrompt, ORCHESTRATOR_DEFAULT_MODEL_PLAN, {
      runId: run.id,
      goalId,
      callRole: 'orchestrator_plan',
    })

    // JSON parsen
    let plan: InitialPlan
    try {
      plan = parseOrchestratorJson(rawText, InitialPlanSchema)
    } catch (e) {
      // Run als failed markieren
      await db.update(agentRuns).set({
        status: 'failed',
        lastError: (e as Error).message,
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentRuns.id, run.id))
      await db.update(agentGoals).set({ status: 'failed', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
      throw e
    }

    // Steps in DB schreiben
    const stepRows = plan.steps.map((s) => ({
      runId: run.id,
      goalId,
      stepKey: s.stepKey,
      workerType: s.workerType,
      config: s.config,
      contextRefs: s.contextRefs,
      dependsOnStepKeys: s.dependsOnStepKeys,
      status: 'pending' as const,
    }))
    const insertedSteps = await db.insert(agentSteps).values(stepRows).returning({ id: agentSteps.id, stepKey: agentSteps.stepKey })

    // Plan-JSON + status auf Run schreiben
    await db.update(agentRuns).set({
      planJson: plan as unknown as Record<string, unknown>,
      status: 'executing',
      updatedAt: sql`now()`,
    }).where(eq(agentRuns.id, run.id))

    await db.update(agentGoals).set({ status: 'running', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))

    // Steps ohne unaufgeloeste Dependencies queuen
    const stepKeyToId = new Map(insertedSteps.map((s) => [s.stepKey, s.id]))
    const readySteps = plan.steps.filter((s) => s.dependsOnStepKeys.length === 0)
    for (const s of readySteps) {
      const stepId = stepKeyToId.get(s.stepKey)
      if (!stepId) continue
      await db.insert(taskQueue).values({
        type: 'agent_step_run',
        status: 'pending',
        priority: 2,
        payload: { stepId, runId: run.id, goalId },
        referenceType: 'agent_step',
        referenceId: stepId,
      }).returning({ id: taskQueue.id })
    }

    return { runId: run.id, steps: plan.steps }
  },

  async replan(_runId: string): Promise<ReplanDecision> {
    throw new Error('OrchestratorService.replan: wird in Task 4 implementiert')
  },
}
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/orchestrator.service.test.ts
```

Erwartet: 3/3 passed.

- [ ] **Step 5: Skeleton-Throw-Test fuer plan entfernen**

In `src/__tests__/unit/services/agents/skeleton-imports.test.ts` den Test entfernen:

```ts
  it('OrchestratorService.plan wirft "nicht implementiert"', async () => {
    await expect(OrchestratorService.plan('goal-1')).rejects.toThrow(/nicht implementiert/)
  })
```

```bash
npm run test:unit -- src/__tests__/unit/services/agents/skeleton-imports.test.ts
```

Erwartet: 6/6 (war 7).

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/agents/orchestrator.service.ts src/__tests__/unit/services/agents/orchestrator.service.test.ts src/__tests__/unit/services/agents/skeleton-imports.test.ts
git commit -m "feat(agents): OrchestratorService.plan (LLM-Call + Plan-Persistenz + Step-Queue)"
```

---

### Task 4: OrchestratorService.replan() Implementation

**Files:**
- Modify: `src/lib/services/agents/orchestrator.service.ts`

- [ ] **Step 1: replan() im selben File ergaenzen**

Ersetze die `replan`-Stub-Methode in `src/lib/services/agents/orchestrator.service.ts` durch:

```ts
  async replan(runId: string): Promise<ReplanDecision> {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps, taskQueue } = await import('@/lib/db/schema')
    const { eq, and, sql } = await import('drizzle-orm')
    const { ReplanDecisionSchema } = await import('./orchestrator/plan-types')
    const { MemoryService } = await import('./memory.service')

    // Run + Goal laden
    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1)
    if (!run) throw new Error(`Run ${runId} nicht gefunden`)

    const [goal] = await db
      .select({ id: agentGoals.id, title: agentGoals.title, description: agentGoals.description })
      .from(agentGoals)
      .where(eq(agentGoals.id, run.goalId))
      .limit(1)
    if (!goal) throw new Error(`Goal ${run.goalId} nicht gefunden`)

    // Pruefe ob alle Steps terminal sind ODER ob noch pending/running existieren
    const allSteps = await db
      .select({ id: agentSteps.id, stepKey: agentSteps.stepKey, status: agentSteps.status, workerType: agentSteps.workerType, dependsOnStepKeys: agentSteps.dependsOnStepKeys })
      .from(agentSteps)
      .where(eq(agentSteps.runId, runId))
    const pendingOrRunning = allSteps.filter((s) => s.status === 'pending' || s.status === 'running')

    // Falls noch pending/running existieren, sind moeglicherweise Dependencies aufgeloest worden — neue ready-Tasks queuen
    if (pendingOrRunning.length > 0) {
      const succeededKeys = new Set(allSteps.filter((s) => s.status === 'succeeded').map((s) => s.stepKey))
      const readyToQueue = pendingOrRunning.filter((s) => {
        if (s.status !== 'pending') return false
        const deps = (s.dependsOnStepKeys as string[]) ?? []
        return deps.every((d) => succeededKeys.has(d))
      })
      // Pruefe ob diese Steps schon eine Task-Queue-Row haben
      for (const s of readyToQueue) {
        const existingTasks = await db
          .select({ id: taskQueue.id })
          .from(taskQueue)
          .where(and(eq(taskQueue.referenceId, s.id), eq(taskQueue.type, 'agent_step_run')))
          .limit(1)
        if (existingTasks.length === 0) {
          await db.insert(taskQueue).values({
            type: 'agent_step_run',
            status: 'pending',
            priority: 2,
            payload: { stepId: s.id, runId, goalId: run.goalId },
            referenceType: 'agent_step',
            referenceId: s.id,
          })
        }
      }
      return { action: 'continue', reason: `${readyToQueue.length} weitere Steps bereit, ${pendingOrRunning.length - readyToQueue.length} blockiert` }
    }

    // Alle Steps terminal — LLM entscheidet
    const compactedHistory = await MemoryService.compactRunHistory(runId, 5)
    const { ToolRegistry } = await import('./tool-registry')
    const { initializeToolRegistry } = await import('./tools/bootstrap')
    initializeToolRegistry()
    const tools = await ToolRegistry.listAll()
    const toolList = tools.length === 0 ? '(keine Tools verfuegbar)' : tools.map((t) => `- ${t.ref.raw}: ${t.description}`).join('\n')

    const userPrompt = `GOAL:\n  Titel: ${goal.title}\n  Beschreibung: ${goal.description ?? '(keine)'}\n\nRUN-STATE:\n${compactedHistory || '(keine Steps)'}\n\nVERFUEGBARE TOOLS:\n${toolList}\n\nWelche Aktion?`

    const rawText = await callLLM(REPLAN_SYSTEM_PROMPT, userPrompt, ORCHESTRATOR_DEFAULT_MODEL_REPLAN, {
      runId,
      goalId: run.goalId,
      callRole: 'orchestrator_replan',
    })

    let decision: { action: ReplanDecision['action']; reasoning: string; newSteps: PlannedStep[]; nextStepMode?: 'cron' | 'immediate' }
    try {
      decision = parseOrchestratorJson(rawText, ReplanDecisionSchema)
    } catch (e) {
      await db.update(agentRuns).set({
        status: 'failed',
        lastError: `Replan JSON-Parse: ${(e as Error).message}`,
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentRuns.id, runId))
      await db.update(agentGoals).set({ status: 'failed', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
      throw e
    }

    if (decision.action === 'goal_complete') {
      await db.update(agentRuns).set({
        status: 'succeeded',
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentRuns.id, runId))
      await db.update(agentGoals).set({
        status: 'done',
        completedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentGoals.id, run.goalId))
      return { action: 'goal_complete', reason: decision.reasoning }
    }

    if (decision.action === 'pause') {
      await db.update(agentGoals).set({ status: 'paused', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
      return { action: 'pause', reason: decision.reasoning }
    }

    if (decision.action === 'fail') {
      await db.update(agentRuns).set({
        status: 'failed',
        lastError: decision.reasoning,
        finishedAt: sql`now()`,
        updatedAt: sql`now()`,
      }).where(eq(agentRuns.id, runId))
      await db.update(agentGoals).set({ status: 'failed', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
      return { action: 'fail', reason: decision.reasoning }
    }

    // continue: neue Steps anlegen und ggf. queuen
    if (decision.newSteps && decision.newSteps.length > 0) {
      const stepRows = decision.newSteps.map((s) => ({
        runId,
        goalId: run.goalId,
        stepKey: s.stepKey,
        workerType: s.workerType,
        config: s.config,
        contextRefs: s.contextRefs,
        dependsOnStepKeys: s.dependsOnStepKeys,
        status: 'pending' as const,
      }))
      const inserted = await db.insert(agentSteps).values(stepRows).returning({ id: agentSteps.id, stepKey: agentSteps.stepKey })
      const stepKeyToId = new Map(inserted.map((i) => [i.stepKey, i.id]))
      const readySteps = decision.newSteps.filter((s) => s.dependsOnStepKeys.length === 0)
      for (const s of readySteps) {
        const stepId = stepKeyToId.get(s.stepKey)
        if (!stepId) continue
        await db.insert(taskQueue).values({
          type: 'agent_step_run',
          status: 'pending',
          priority: 2,
          payload: { stepId, runId, goalId: run.goalId },
          referenceType: 'agent_step',
          referenceId: stepId,
        })
      }
    } else {
      // continue ohne newSteps + alle Steps terminal -> Goal vermutlich done, aber LLM unschluessig.
      // Pause statt blind goal_complete.
      await db.update(agentGoals).set({ status: 'paused', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
      return { action: 'pause', reason: 'Replan continue ohne newSteps und keine pending steps -> manuell pruefen' }
    }

    return {
      action: 'continue',
      newSteps: decision.newSteps,
      nextStepMode: decision.nextStepMode,
      reason: decision.reasoning,
    }
  },
```

- [ ] **Step 2: Skeleton-Throw-Test fuer replan entfernen**

In `src/__tests__/unit/services/agents/skeleton-imports.test.ts`:

```ts
  it('OrchestratorService.replan wirft "nicht implementiert"', async () => {
    await expect(OrchestratorService.replan('run-1')).rejects.toThrow(/nicht implementiert/)
  })
```

Diesen Test entfernen.

- [ ] **Step 3: Tests pruefen**

```bash
npm run typecheck
npm run test:unit -- src/__tests__/unit/services/agents/skeleton-imports.test.ts
```

Erwartet: typecheck clean, skeleton-imports 5/5 (war 6).

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/agents/orchestrator.service.ts src/__tests__/unit/services/agents/skeleton-imports.test.ts
git commit -m "feat(agents): OrchestratorService.replan (Decision-Loop + State-Transitions)"
```

---

### Task 5: Goal-Lifecycle-Service

**Files:**
- Create: `src/lib/services/agents/goal.service.ts`
- Test: `src/__tests__/unit/services/agents/goal.service.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/goal.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const planMock = vi.fn()
const insertReturningMock = vi.fn()
const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }))
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectOrderByMock = vi.fn().mockResolvedValue([])
const selectFromMock = vi.fn(() => ({ where: selectWhereMock, orderBy: selectOrderByMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))

vi.mock('@/lib/db', () => ({ db: { insert: insertMock, update: updateMock, select: selectMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentGoals: { id: 'id', status: 'status', createdAt: 'createdAt' },
  agentRuns: { id: 'id', goalId: 'goalId', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId' },
}))
vi.mock('@/lib/services/agents/orchestrator.service', () => ({
  OrchestratorService: { plan: planMock },
}))

describe('GoalService', () => {
  beforeEach(() => {
    insertMock.mockClear()
    insertReturningMock.mockReset()
    selectLimitMock.mockReset()
    planMock.mockReset()
    updateSetMock.mockClear()
  })

  it('create() legt Goal mit status=draft an', async () => {
    insertReturningMock.mockResolvedValueOnce([{ id: 'g1' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    const r = await GoalService.create({
      title: 'Test',
      description: 'beschr',
      executionMode: 'cron',
      budgetCents: 100,
    })
    expect(r.id).toBe('g1')
    const args = insertValuesMock.mock.calls[0][0]
    expect(args.title).toBe('Test')
    expect(args.status).toBe('draft')
    expect(args.executionMode).toBe('cron')
    expect(args.budgetCents).toBe(100)
  })

  it('start() ruft OrchestratorService.plan und liefert runId zurueck', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'draft' }])
    planMock.mockResolvedValueOnce({ runId: 'run-1', steps: [] })
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    const r = await GoalService.start('g1')
    expect(r.runId).toBe('run-1')
    expect(planMock).toHaveBeenCalledWith('g1')
  })

  it('start() wirft wenn Goal nicht in draft-Status', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'running' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await expect(GoalService.start('g1')).rejects.toThrow(/draft|gestartet/)
  })

  it('pause() setzt Goal-Status auf paused', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'running' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await GoalService.pause('g1')
    expect(updateSetMock).toHaveBeenCalled()
    const args = updateSetMock.mock.calls[0][0]
    expect(args.status).toBe('paused')
  })

  it('resume() setzt paused-Goal auf running', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'paused' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await GoalService.resume('g1')
    const args = updateSetMock.mock.calls[0][0]
    expect(args.status).toBe('running')
  })

  it('cancel() setzt Goal-Status auf cancelled (auch von running)', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'running' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await GoalService.cancel('g1')
    const args = updateSetMock.mock.calls[0][0]
    expect(args.status).toBe('cancelled')
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/goal.service.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/goal.service.ts`:

```ts
/**
 * GoalService — Goal-Lifecycle (CRUD + Start/Pause/Resume/Cancel).
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.1
 */

import type { ExecutionMode, GoalStatus } from './types'

export interface CreateGoalInput {
  title: string
  description?: string
  executionMode?: ExecutionMode
  budgetTokens?: number
  budgetCents?: number
  priority?: 1 | 2 | 3
  requirePlanApproval?: boolean
  createdByUserId?: string
}

export interface GoalListItem {
  id: string
  title: string
  status: GoalStatus
  priority: number
  spentCents: number
  createdAt: Date
}

export const GoalService = {
  async create(input: CreateGoalInput): Promise<{ id: string }> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')

    const [row] = await db
      .insert(agentGoals)
      .values({
        title: input.title,
        description: input.description ?? null,
        executionMode: input.executionMode ?? 'cron',
        status: 'draft',
        budgetTokens: input.budgetTokens ?? null,
        budgetCents: input.budgetCents ?? null,
        priority: input.priority ?? 2,
        requirePlanApproval: input.requirePlanApproval ?? false,
        createdByUserId: input.createdByUserId ?? null,
      })
      .returning({ id: agentGoals.id })
    return { id: row.id }
  },

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

  async pause(goalId: string): Promise<void> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const [goal] = await db.select({ status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
    if (goal.status !== 'running' && goal.status !== 'planning') {
      throw new Error(`pause() nur fuer running/planning Goals erlaubt (aktuell: ${goal.status})`)
    }

    await db.update(agentGoals).set({ status: 'paused', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  },

  async resume(goalId: string): Promise<void> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const [goal] = await db.select({ status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
    if (goal.status !== 'paused') {
      throw new Error(`resume() nur fuer paused Goals (aktuell: ${goal.status})`)
    }

    await db.update(agentGoals).set({ status: 'running', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  },

  async cancel(goalId: string): Promise<void> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const [goal] = await db.select({ status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
    if (goal.status === 'done' || goal.status === 'failed' || goal.status === 'cancelled') {
      throw new Error(`Goal ${goalId} bereits terminal (status=${goal.status})`)
    }

    await db.update(agentGoals).set({ status: 'cancelled', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  },

  async list(limit = 50): Promise<GoalListItem[]> {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { desc } = await import('drizzle-orm')

    const rows = await db
      .select({
        id: agentGoals.id,
        title: agentGoals.title,
        status: agentGoals.status,
        priority: agentGoals.priority,
        spentCents: agentGoals.spentCents,
        createdAt: agentGoals.createdAt,
      })
      .from(agentGoals)
      .orderBy(desc(agentGoals.createdAt))
      .limit(limit)

    return rows as GoalListItem[]
  },

  async getDetail(goalId: string) {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps } = await import('@/lib/db/schema')
    const { eq, desc } = await import('drizzle-orm')

    const [goal] = await db.select().from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    if (!goal) return null

    const runs = await db.select().from(agentRuns).where(eq(agentRuns.goalId, goalId)).orderBy(desc(agentRuns.createdAt))
    const latestRunId = runs[0]?.id ?? null
    const steps = latestRunId
      ? await db.select().from(agentSteps).where(eq(agentSteps.runId, latestRunId)).orderBy(agentSteps.createdAt)
      : []

    return { goal, runs, steps, latestRunId }
  },
}
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/goal.service.test.ts
```

Erwartet: 6/6 passed.

- [ ] **Step 5: index.ts erweitern**

In `src/lib/services/agents/index.ts` ergaenzen:

```ts
export { GoalService } from './goal.service'
export type { CreateGoalInput, GoalListItem } from './goal.service'
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/agents/goal.service.ts src/lib/services/agents/index.ts src/__tests__/unit/services/agents/goal.service.test.ts
git commit -m "feat(agents): GoalService (create/start/pause/resume/cancel/list/detail)"
```

---

### Task 6: processAgentTaskQueue erweitert um agent_replan

**Files:**
- Modify: `src/lib/services/cron.service.ts`

- [ ] **Step 1: agent_replan dispatch im Tick-Handler**

In `src/lib/services/cron.service.ts` finde den `processAgentTaskQueue`-Block (aus Phase 3). Im else-Branch (`agent_replan` und `agent_continuation` als skip) ersetze:

```ts
        } else {
          // agent_replan und agent_continuation: Phase 4/6, hier no-op markieren
          await db.execute(sql`
            UPDATE task_queue
            SET status='completed', result=${JSON.stringify({ skipped: 'phase>3 not yet implemented' })}::jsonb
            WHERE id=${task.id}
          `)
        }
```

durch:

```ts
        } else if (task.type === 'agent_replan') {
          const runId = task.reference_id ?? (task.payload?.runId as string | undefined)
          if (!runId) {
            throw new Error('agent_replan ohne runId in reference_id oder payload.runId')
          }
          const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
          const decision = await OrchestratorService.replan(runId)
          await db.execute(sql`
            UPDATE task_queue
            SET status='completed', result=${JSON.stringify(decision)}::jsonb
            WHERE id=${task.id}
          `)
        } else {
          // agent_continuation: Phase 6
          await db.execute(sql`
            UPDATE task_queue
            SET status='completed', result=${JSON.stringify({ skipped: 'phase>4 not yet implemented' })}::jsonb
            WHERE id=${task.id}
          `)
        }
```

Plus: Nach erfolgreichem `agent_step_run`-Dispatch (im if-Branch des Worker-Calls) ein `agent_replan`-Task fuer den selben Run queuen, um das Re-Plan-Loop zu triggern.

Finde den existing if-Branch:

```ts
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
        }
```

ersetze durch:

```ts
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
          // Re-Plan triggern: nach jedem Step entscheidet Orchestrator weiter
          const runId = (task.payload?.runId as string | undefined)
          if (runId) {
            await db.execute(sql`
              INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
              VALUES ('agent_replan', 'pending', 2, ${JSON.stringify({ runId })}::jsonb, 'agent_run', ${runId})
            `)
          }
        } else if (task.type === 'agent_replan') {
```

(Wichtig: das ist der gleiche else-if-Branch wie oben — die zwei Edits muessen zusammenpassen. Das Endergebnis ist eine sequenzielle Kette: step-run → queue replan → next tick verarbeitet replan → ggf. neue steps + wieder replan-queue.)

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/cron.service.ts
git commit -m "feat(agents): Tick-Handler queued agent_replan nach jedem Step + dispatcht Replan an Orchestrator"
```

---

### Task 7: Goal-API-Routes

**Files:**
- Create: `src/app/api/agents/goals/route.ts`
- Create: `src/app/api/agents/goals/[id]/route.ts`

- [ ] **Step 1: List + Create Route**

`src/app/api/agents/goals/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { GoalService } from '@/lib/services/agents'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const goals = await GoalService.list(100)
  return NextResponse.json({ goals })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON-Body erwartet' }, { status: 400 })
  }
  const input = body as Record<string, unknown>

  if (typeof input.title !== 'string' || input.title.trim().length === 0) {
    return NextResponse.json({ error: 'title ist erforderlich' }, { status: 400 })
  }

  const created = await GoalService.create({
    title: input.title.trim(),
    description: typeof input.description === 'string' ? input.description : undefined,
    executionMode: input.executionMode === 'immediate' ? 'immediate' : 'cron',
    budgetTokens: typeof input.budgetTokens === 'number' ? input.budgetTokens : undefined,
    budgetCents: typeof input.budgetCents === 'number' ? input.budgetCents : undefined,
    priority: typeof input.priority === 'number' && [1, 2, 3].includes(input.priority) ? (input.priority as 1 | 2 | 3) : undefined,
    requirePlanApproval: typeof input.requirePlanApproval === 'boolean' ? input.requirePlanApproval : undefined,
    createdByUserId: session.user?.id,
  })

  // Sofort starten wenn input.startNow !== false
  if (input.startNow !== false) {
    try {
      const start = await GoalService.start(created.id)
      return NextResponse.json({ id: created.id, runId: start.runId, started: true }, { status: 201 })
    } catch (e) {
      // Goal angelegt aber Start fehlgeschlagen — Goal bleibt im draft
      return NextResponse.json(
        { id: created.id, started: false, startError: (e as Error).message },
        { status: 201 },
      )
    }
  }
  return NextResponse.json({ id: created.id, started: false }, { status: 201 })
}
```

- [ ] **Step 2: Detail + Patch Route**

`src/app/api/agents/goals/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { GoalService } from '@/lib/services/agents'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params
  const detail = await GoalService.getDetail(id)
  if (!detail) return NextResponse.json({ error: 'Goal nicht gefunden' }, { status: 404 })
  return NextResponse.json(detail)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON-Body erwartet' }, { status: 400 })
  }
  const input = body as { action?: string }

  try {
    if (input.action === 'pause') {
      await GoalService.pause(id)
    } else if (input.action === 'resume') {
      await GoalService.resume(id)
    } else if (input.action === 'cancel') {
      await GoalService.cancel(id)
    } else if (input.action === 'start') {
      const r = await GoalService.start(id)
      return NextResponse.json({ runId: r.runId })
    } else {
      return NextResponse.json({ error: "action muss eines von 'pause'|'resume'|'cancel'|'start' sein" }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agents/goals/route.ts src/app/api/agents/goals/[id]/route.ts
git commit -m "feat(agents): API-Routes /api/agents/goals (list/create/detail/patch)"
```

---

### Task 8: UI-Komponenten

**Files:**
- Create: `src/components/agents/goals/goal-form.tsx`
- Create: `src/components/agents/goals/goal-list-table.tsx`
- Create: `src/components/agents/goals/goal-detail-view.tsx`

- [ ] **Step 1: GoalForm**

`src/components/agents/goals/goal-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export function GoalForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [executionMode, setExecutionMode] = useState<'cron' | 'immediate'>('cron')
  const [budgetCents, setBudgetCents] = useState<number | ''>('')
  const [budgetTokens, setBudgetTokens] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length === 0) {
      toast.error('Titel erforderlich')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/agents/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          executionMode,
          budgetCents: budgetCents === '' ? undefined : Number(budgetCents),
          budgetTokens: budgetTokens === '' ? undefined : Number(budgetTokens),
          startNow: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Fehler' }))
        throw new Error(err.error ?? 'Goal konnte nicht angelegt werden')
      }
      const data = (await res.json()) as { id: string; started: boolean; startError?: string }
      if (data.startError) {
        toast.error(`Goal angelegt, aber Start fehlgeschlagen: ${data.startError}`)
      } else {
        toast.success('Goal angelegt und gestartet')
      }
      router.push(`/intern/agents/goals/${data.id}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      <div>
        <Label htmlFor="title">Titel *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Recherchiere Acme GmbH" required />
      </div>
      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detaillierte Aufgabe — was genau soll der Hauptagent tun?"
          rows={4}
        />
      </div>
      <div>
        <Label htmlFor="executionMode">Ausfuehrungs-Modus</Label>
        <Select value={executionMode} onValueChange={(v) => setExecutionMode(v as 'cron' | 'immediate')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cron">Cron (Standard, schrittweise via Tick)</SelectItem>
            <SelectItem value="immediate">Immediate (Inline, fuer dringende Goals)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="budgetCents">Budget (Cents)</Label>
          <Input id="budgetCents" type="number" min={0} value={budgetCents} onChange={(e) => setBudgetCents(e.target.value === '' ? '' : Number(e.target.value))} placeholder="z.B. 50" />
        </div>
        <div>
          <Label htmlFor="budgetTokens">Budget (Tokens)</Label>
          <Input id="budgetTokens" type="number" min={0} value={budgetTokens} onChange={(e) => setBudgetTokens(e.target.value === '' ? '' : Number(e.target.value))} placeholder="z.B. 50000" />
        </div>
      </div>
      <Button type="submit" disabled={submitting}>{submitting ? 'Speichere ...' : 'Anlegen + Starten'}</Button>
    </form>
  )
}
```

- [ ] **Step 2: GoalListTable**

`src/components/agents/goals/goal-list-table.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface GoalRow {
  id: string
  title: string
  status: string
  priority: number
  spentCents: number
  createdAt: string
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  planning: 'secondary',
  running: 'default',
  paused: 'secondary',
  done: 'default',
  failed: 'destructive',
  cancelled: 'outline',
}

export function GoalListTable() {
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/agents/goals')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { goals: GoalRow[] }
        if (!cancelled) setGoals(json.goals ?? [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <p className="text-sm text-muted-foreground">Lade …</p>
  if (error) return <p className="text-sm text-destructive">Fehler: {error}</p>
  if (goals.length === 0) return <p className="text-sm text-muted-foreground italic">Noch keine Goals — lege links eines an.</p>

  return (
    <div className="space-y-2">
      {goals.map((g) => (
        <Card key={g.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <Link href={`/intern/agents/goals/${g.id}`} className="font-medium hover:underline">
                {g.title}
              </Link>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(g.createdAt).toLocaleString('de-DE')} · Prio {g.priority} · {(g.spentCents / 100).toFixed(2)} EUR
              </div>
            </div>
            <Badge variant={STATUS_COLORS[g.status] ?? 'outline'}>{g.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: GoalDetailView**

`src/components/agents/goals/goal-detail-view.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface DetailData {
  goal: {
    id: string
    title: string
    description: string | null
    status: string
    spentCents: number
    spentTokens: number
    budgetCents: number | null
    budgetTokens: number | null
    createdAt: string
    completedAt: string | null
  }
  runs: Array<{ id: string; status: string; startedAt: string; finishedAt: string | null; lastError: string | null }>
  steps: Array<{
    id: string
    stepKey: string
    workerType: string
    status: string
    resultSummary: string | null
    error: string | null
    startedAt: string | null
    finishedAt: string | null
  }>
  latestRunId: string | null
}

const STEP_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  running: 'secondary',
  succeeded: 'default',
  failed: 'destructive',
  skipped: 'outline',
}

const TERMINAL_STATUS = new Set(['done', 'failed', 'cancelled'])

export function GoalDetailView({ goalId }: { goalId: string }) {
  const [data, setData] = useState<DetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/agents/goals/${goalId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as DetailData
      setData(json)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    void load()
  }, [goalId])

  // Status-Polling: solange Goal nicht terminal, alle 5s reload
  useEffect(() => {
    if (!data) return
    if (TERMINAL_STATUS.has(data.goal.status)) return
    const handle = setInterval(() => { void load() }, 5_000)
    return () => clearInterval(handle)
  }, [data?.goal.status, goalId])

  async function action(act: 'pause' | 'resume' | 'cancel' | 'start') {
    setActing(true)
    try {
      const res = await fetch(`/api/agents/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: act }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      toast.success(`Aktion '${act}' ausgefuehrt`)
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setActing(false)
    }
  }

  if (error) return <p className="text-destructive">Fehler: {error}</p>
  if (!data) return <p className="text-muted-foreground">Lade …</p>

  const { goal, steps } = data
  const canPause = goal.status === 'running' || goal.status === 'planning'
  const canResume = goal.status === 'paused'
  const canCancel = !TERMINAL_STATUS.has(goal.status)
  const canStart = goal.status === 'draft'

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{goal.title}</span>
            <Badge>{goal.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goal.description && <p className="text-sm whitespace-pre-wrap mb-3">{goal.description}</p>}
          <div className="text-xs text-muted-foreground space-x-3">
            <span>Spent: {(goal.spentCents / 100).toFixed(2)} EUR / {goal.spentTokens.toLocaleString('de-DE')} tokens</span>
            {goal.budgetCents != null && <span>· Budget: {(goal.budgetCents / 100).toFixed(2)} EUR</span>}
          </div>
          <div className="flex gap-2 mt-3">
            {canStart && <Button size="sm" onClick={() => action('start')} disabled={acting}>Starten</Button>}
            {canPause && <Button size="sm" variant="secondary" onClick={() => action('pause')} disabled={acting}>Pausieren</Button>}
            {canResume && <Button size="sm" onClick={() => action('resume')} disabled={acting}>Fortsetzen</Button>}
            {canCancel && <Button size="sm" variant="destructive" onClick={() => action('cancel')} disabled={acting}>Abbrechen</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Steps</CardTitle></CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Noch keine Steps</p>
          ) : (
            <ul className="space-y-2">
              {steps.map((s) => (
                <li key={s.id} className="border rounded p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-xs">{s.stepKey}</code>
                    <Badge variant={STEP_STATUS_COLORS[s.status] ?? 'outline'}>{s.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.workerType}</div>
                  {s.resultSummary && <div className="text-xs mt-1 text-muted-foreground">{s.resultSummary}</div>}
                  {s.error && <div className="text-xs mt-1 text-destructive">{s.error}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/agents/goals/goal-form.tsx src/components/agents/goals/goal-list-table.tsx src/components/agents/goals/goal-detail-view.tsx
git commit -m "feat(agents): UI-Components Goal-Form, GoalListTable, GoalDetailView"
```

---

### Task 9: UI-Pages

**Files:**
- Create: `src/app/intern/(dashboard)/agents/goals/page.tsx`
- Create: `src/app/intern/(dashboard)/agents/goals/new/page.tsx`
- Create: `src/app/intern/(dashboard)/agents/goals/[id]/page.tsx`

- [ ] **Step 1: Goal-List-Page**

`src/app/intern/(dashboard)/agents/goals/page.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GoalListTable } from '@/components/agents/goals/goal-list-table'

export const dynamic = 'force-dynamic'

export default function GoalsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agenten-Goals</h1>
          <p className="text-sm text-muted-foreground">Aufgaben fuer den Hauptagenten — Plan/Execute/ReplanLoop.</p>
        </div>
        <Button asChild>
          <Link href="/intern/agents/goals/new">Neues Goal</Link>
        </Button>
      </div>
      <GoalListTable />
    </div>
  )
}
```

- [ ] **Step 2: Goal-New-Page**

`src/app/intern/(dashboard)/agents/goals/new/page.tsx`:

```tsx
import { GoalForm } from '@/components/agents/goals/goal-form'

export const dynamic = 'force-dynamic'

export default function GoalNewPage() {
  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-2xl font-semibold">Neues Goal</h1>
      <p className="text-sm text-muted-foreground">
        Beschreibe das Ziel klar und konkret. Der Hauptagent zerlegt es in Steps und fuehrt sie aus.
      </p>
      <GoalForm />
    </div>
  )
}
```

- [ ] **Step 3: Goal-Detail-Page**

`src/app/intern/(dashboard)/agents/goals/[id]/page.tsx`:

```tsx
import { GoalDetailView } from '@/components/agents/goals/goal-detail-view'

export const dynamic = 'force-dynamic'

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="container py-6">
      <GoalDetailView goalId={id} />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add 'src/app/intern/(dashboard)/agents/goals/page.tsx' 'src/app/intern/(dashboard)/agents/goals/new/page.tsx' 'src/app/intern/(dashboard)/agents/goals/[id]/page.tsx'
git commit -m "feat(agents): UI-Pages /intern/agents/goals (list/new/detail)"
```

---

### Task 10: Orchestrator End-to-End-Test (Mock-LLM, real DB)

**Files:**
- Create: `src/__tests__/integration/services/agents/orchestrator-e2e.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/integration/services/agents/orchestrator-e2e.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt' : null

describe.skipIf(skip !== null)('Orchestrator E2E (Mock-LLM)', () => {
  let tmpRoot: string
  let goalId: string
  const aiCompleteMock = vi.fn()

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-e2e-'))
    vi.stubEnv('AGENT_MEMORY_DIR', tmpRoot)
    vi.stubEnv('GOOGLE_AI_API_KEY', '')
    vi.doMock('@/lib/services/ai', async (importOriginal) => {
      const orig = (await importOriginal()) as Record<string, unknown>
      return {
        ...orig,
        AIService: { complete: aiCompleteMock },
      }
    })
  }, 60_000)

  afterAll(async () => {
    const { db } = await import('@/lib/db')
    const { agentGoals, agentRuns, agentSteps, agentCostEvents, taskQueue } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    if (goalId) {
      await db.delete(taskQueue).where(eq(taskQueue.referenceId, goalId))
      await db.delete(agentCostEvents).where(eq(agentCostEvents.goalId, goalId))
      await db.delete(agentSteps).where(eq(agentSteps.goalId, goalId))
      await db.delete(agentRuns).where(eq(agentRuns.goalId, goalId))
      await db.delete(agentGoals).where(eq(agentGoals.id, goalId))
    }
    await fs.rm(tmpRoot, { recursive: true, force: true })
    vi.unstubAllEnvs()
    vi.doUnmock('@/lib/services/ai')
  })

  it('plan() ruft Mock-LLM und legt Run + Steps + Task an', async () => {
    aiCompleteMock.mockResolvedValueOnce({
      text: JSON.stringify({
        reasoning: 'Plan: ein einziger memory:write-Step.',
        steps: [
          {
            stepKey: 'write-summary',
            workerType: 'memory:write',
            config: { scope: 'projects/e2e-test', body: '# E2E Test\nVom Mock-Orchestrator.' },
            contextRefs: [],
            dependsOnStepKeys: [],
          },
        ],
      }),
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    })

    const { GoalService } = await import('@/lib/services/agents')
    const created = await GoalService.create({ title: 'E2E-Test', description: 'Schreib einen Memory-Eintrag', executionMode: 'cron' })
    goalId = created.id
    const started = await GoalService.start(goalId)
    expect(started.runId).toBeTruthy()

    const { db } = await import('@/lib/db')
    const { agentRuns, agentSteps, taskQueue } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, started.runId)).limit(1)
    expect(run.status).toBe('executing')
    const stepsRows = await db.select().from(agentSteps).where(eq(agentSteps.runId, started.runId))
    expect(stepsRows).toHaveLength(1)
    expect(stepsRows[0].stepKey).toBe('write-summary')
    const tasksRows = await db.select().from(taskQueue).where(eq(taskQueue.referenceId, stepsRows[0].id))
    expect(tasksRows).toHaveLength(1)
    expect(tasksRows[0].type).toBe('agent_step_run')
  }, 30_000)

  it('replan() nach completed step setzt goal=done', async () => {
    // Setze step manuell auf succeeded (simuliert Worker-Abschluss)
    const { db } = await import('@/lib/db')
    const { agentRuns, agentSteps, agentGoals } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')
    const allSteps = await db.select().from(agentSteps).where(eq(agentSteps.goalId, goalId))
    const stepId = allSteps[0].id
    await db.update(agentSteps).set({ status: 'succeeded', resultSummary: 'OK', finishedAt: sql`now()` }).where(eq(agentSteps.id, stepId))

    aiCompleteMock.mockResolvedValueOnce({
      text: JSON.stringify({ action: 'goal_complete', reasoning: 'Step war erfolgreich.', newSteps: [] }),
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      usage: { promptTokens: 80, completionTokens: 30, totalTokens: 110 },
    })

    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.goalId, goalId)).limit(1)
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const decision = await OrchestratorService.replan(run.id)
    expect(decision.action).toBe('goal_complete')

    const [goal] = await db.select().from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
    expect(goal.status).toBe('done')
    expect(goal.completedAt).not.toBeNull()
  }, 30_000)
})
```

- [ ] **Step 2: Run mit DATABASE_URL**

```bash
npm run test:integration -- src/__tests__/integration/services/agents/orchestrator-e2e.test.ts
```

Erwartet: 2/2 passed (mit DATABASE_URL). Skipped ohne.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/integration/services/agents/orchestrator-e2e.test.ts
git commit -m "test(agents): Orchestrator E2E (plan + replan mit Mock-LLM)"
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

Erwartet: alle bisherigen Tests + die neuen orchestrator/json-parser/plan-types/goal Tests gruen.

- [ ] **Step 3: Integration-Tests (mit DATABASE_URL)**

```bash
DATABASE_URL=<dev-url> npm run test:integration -- src/__tests__/integration/services/agents/
```

- [ ] **Step 4: Manuelles Smoke**

```bash
npm run dev
```

Manuell pruefen:
- `/intern/agents/goals` zeigt leere Liste
- `/intern/agents/goals/new` erlaubt Goal-Anlage
- Nach Submit Redirect zur Detail-Page mit Status-Polling
- Mit `GOOGLE_AI_API_KEY` gesetzt: echter LLM-Call, Goal kommt durch Plan-Phase, Steps erscheinen
- Cron-Tick (60s) verarbeitet die Step-Tasks → ggf. Replan-Tasks → Goal kommt zu `done`

- [ ] **Step 5: Push**

```bash
git push -u origin feat/agents-orchestrator
```

---

## Self-Review-Notiz

**Spec-Coverage Phase 4** (`docs/superpowers/specs/2026-05-08-agent-system-design.md` §6 + §2.2):
- §2.2 Orchestrator (plan + replan + LLM-Call) → Tasks 3, 4
- §5.2 Sliding-Summary in replan (compactRunHistory) → Task 4
- §6.1 Goal-State-Machine → Task 5
- §6.4 Tick-Handler komplett (agent_step_run + agent_replan) → Task 6
- §6.5 Drei Task-Handler → Task 6 (continuation = Phase 6)
- DoD: "Recherchiere Acme GmbH"-Goal end-to-end → Task 10 (E2E-Test)
- Test: 3 End-to-End-Goals → Task 10 (2 cases, plus erweiterbar)
- Token-Budget-Hard-Stop → Phase 3 Worker checkBudget bereits aktiv

**Was bewusst NICHT in Phase 4:**
- Smart-Worker (`agent:*` namespace) → Phase 5
- Stranded-Run-Reconcile → Phase 6
- DAG-Visualisierung im UI → Phase 7
- Approval-Flow → Phase 8

---

## Geschätzter Aufwand

11 Tasks à 15-30 min = **~5-7 Stunden** Implementation. Realistisch 2 Arbeitstage.
