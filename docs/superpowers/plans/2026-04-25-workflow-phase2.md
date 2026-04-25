# Workflow Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workflow-Engine erweitert um Conditional-Branch (`if/else`) und Parallel/Fan-out, Condition-Sprache erweitert auf Step-Result-Pfade und drei zusätzliche Operatoren, UI-Editor wird rekursiv (verschachtelte Container).

**Architecture:** Step-Type-Diskriminator `kind: 'action' | 'branch' | 'parallel'` (default `'action'` für Bestandsworkflows). Engine-Loop wird in `executeStepList` (rekursiv) und `executeOneStep` (Switch auf kind) extrahiert. Parallel nutzt `Promise.allSettled` mit isolierten Sub-Contexts. Condition-Eval bekommt `resolvePath`-Helper, akzeptiert `data.<path>` und `steps.<id>.<nested>`. UI-Designer wird in 5 fokussierte Komponenten gesplittet.

**Tech Stack:** TypeScript, Drizzle ORM (kein Schema-Migrations-Bedarf — `steps` und `stepResults` sind `jsonb`), vitest, React.

**Spec:** `docs/superpowers/specs/2026-04-25-workflow-phase2-design.md`

---

## File Structure

**Engine**
- Modify: `src/lib/services/workflow/engine.ts` — Datenmodell, rekursiver Step-Walker, Condition-Eval

**Tests (Unit)**
- Create: `src/__tests__/unit/services/workflow-condition-eval.test.ts`
- Create: `src/__tests__/unit/services/workflow-engine-branch.test.ts`
- Create: `src/__tests__/unit/services/workflow-engine-parallel.test.ts`
- Create: `src/__tests__/unit/services/workflow-engine-limits.test.ts` (depth + cardinality)

**Tests (Integration)**
- Create: `src/__tests__/integration-real/workflow-branch-flow.test.ts`
- Create: `src/__tests__/integration-real/workflow-parallel-flow.test.ts`

**UI**
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx` — Top-Level-Composition, übergibt an `<StepList>`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/step-list.tsx`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/branch-step-editor.tsx`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/parallel-step-editor.tsx`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/add-step-menu.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx` — falls die Run-History dort gerendert wird; sonst entsprechende Run-Detail-Page

---

## Task 1: Datenmodell — Step-Type-Diskriminator

**Files:**
- Modify: `src/lib/services/workflow/engine.ts`

- [ ] **Step 1: Interface umstellen**

In `src/lib/services/workflow/engine.ts`, das alte `WorkflowStep`-Interface (etwa Zeile 18) ersetzen durch:

```ts
type StepKind = 'action' | 'branch' | 'parallel'

interface BaseStep {
  id?: string
  label?: string
  /** Skip-Verhalten — nur auf Action-Steps relevant. */
  condition?: string
}

interface ActionStep extends BaseStep {
  kind?: 'action'  // Default; Bestandsworkflows haben kind nicht gesetzt.
  action: string
  config?: Record<string, unknown>
}

interface BranchStep extends BaseStep {
  kind: 'branch'
  ifCondition: string
  then: WorkflowStep[]
  else?: WorkflowStep[]
}

interface ParallelStep extends BaseStep {
  kind: 'parallel'
  steps: WorkflowStep[]
}

type WorkflowStep = ActionStep | BranchStep | ParallelStep
```

Wichtig: das ist eine **Discriminated Union**. Der bestehende Code referenziert `step.action` und `step.config` direkt — TS warnt jetzt, dass diese Felder nur auf `ActionStep` existieren. Diese Stellen werden in Task 3 durch type narrowing aufgelöst (innerhalb des `kind === 'action'`-Branchs).

`StepResult`-Interface (etwa Zeile 25) erweitern um `path` und `kind`:

```ts
interface StepResult {
  step: number
  path: string
  action: string
  kind: StepKind
  label?: string
  status: 'completed' | 'failed' | 'skipped'
  result?: Record<string, unknown>
  error?: string
  durationMs: number
}
```

- [ ] **Step 2: Typcheck (erwartet erstmal Fehler — werden in Task 3 gefixt)**

Run: `npx tsc --noEmit 2>&1 | grep "engine.ts" | head -20`
Expected: TS-Fehler an den Stellen, wo `step.action` direkt zugegriffen wird (heutiger Step-Loop). Diese sind erwartet — Task 3 räumt das auf.

- [ ] **Step 3: Commit (Plan-Zwischenstand)**

NICHT committen, da Code temporär defekt ist. Den Datenmodell-Commit machen wir gemeinsam mit Task 3.

Wenn du an dieser Stelle pausieren willst, stash:
```bash
git stash push -m "WF-T1 datamodel WIP"
```

Sonst direkt zu Task 2 weiter.

---

## Task 2: `evaluateCondition` umstellen + Unit-Tests

**Files:**
- Modify: `src/lib/services/workflow/engine.ts`
- Create: `src/__tests__/unit/services/workflow-condition-eval.test.ts`

- [ ] **Step 1: Failing test schreiben**

Create `src/__tests__/unit/services/workflow-condition-eval.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// evaluateCondition is not exported today; export it for tests in Task 2 Step 3.

describe('evaluateCondition', () => {
  function load() {
    return import('@/lib/services/workflow/engine').then(m => (m as any).evaluateCondition)
  }

  function scope(triggerData: Record<string, unknown> = {}, actionResults: Record<string, unknown> = {}) {
    return { triggerData, actionResults }
  }

  it('empty/whitespace condition returns true', async () => {
    const fn = await load()
    expect(fn('', scope())).toBe(true)
    expect(fn('   ', scope())).toBe(true)
  })

  it('data.field truthy/falsy', async () => {
    const fn = await load()
    expect(fn('data.email', scope({ email: 'x@y.de' }))).toBe(true)
    expect(fn('data.email', scope({ email: '' }))).toBe(false)
    expect(fn('data.email', scope({}))).toBe(false)
    expect(fn('data.tags', scope({ tags: ['a'] }))).toBe(true)
    expect(fn('data.tags', scope({ tags: [] }))).toBe(false)
  })

  it('data.field == null / != null', async () => {
    const fn = await load()
    expect(fn('data.x == null', scope({ x: null }))).toBe(true)
    expect(fn('data.x == null', scope({ x: '' }))).toBe(true)
    expect(fn('data.x == null', scope({ x: 'value' }))).toBe(false)
    expect(fn('data.x != null', scope({ x: 'value' }))).toBe(true)
    expect(fn('data.x != null', scope({}))).toBe(false)
  })

  it("data.field == 'value' / != 'value'", async () => {
    const fn = await load()
    expect(fn("data.priority == 'hoch'", scope({ priority: 'hoch' }))).toBe(true)
    expect(fn("data.priority == 'hoch'", scope({ priority: 'mittel' }))).toBe(false)
    expect(fn("data.priority != 'hoch'", scope({ priority: 'mittel' }))).toBe(true)
  })

  it('numerical operators ==, !=, >, >=, <, <=', async () => {
    const fn = await load()
    expect(fn('data.score == 80', scope({ score: 80 }))).toBe(true)
    expect(fn('data.score != 80', scope({ score: 90 }))).toBe(true)
    expect(fn('data.score > 80', scope({ score: 90 }))).toBe(true)
    expect(fn('data.score >= 80', scope({ score: 80 }))).toBe(true)
    expect(fn('data.score < 80', scope({ score: 79 }))).toBe(true)
    expect(fn('data.score <= 80', scope({ score: 80 }))).toBe(true)
    expect(fn('data.score < 80', scope({ score: 80 }))).toBe(false)
  })

  it('numeric operator returns false on non-numeric value', async () => {
    const fn = await load()
    expect(fn('data.score >= 80', scope({ score: 'abc' }))).toBe(false)
  })

  it('steps.<id>.<field> truthy + nested paths', async () => {
    const fn = await load()
    const s = scope({}, { score_lead: { score: 42 }, webhook_x: { status: 200, body: { ok: true } } })
    expect(fn('steps.score_lead.score', s)).toBe(true)
    expect(fn('steps.webhook_x.body.ok', s)).toBe(true)
    expect(fn('steps.missing.field', s)).toBe(false)
  })

  it('steps.<id>.<field> with operators', async () => {
    const fn = await load()
    const s = scope({}, { webhook_x: { status: 200, body: { code: 'OK' } } })
    expect(fn('steps.webhook_x.status == 200', s)).toBe(true)
    expect(fn('steps.webhook_x.status >= 400', s)).toBe(false)
    expect(fn("steps.webhook_x.body.code == 'OK'", s)).toBe(true)
  })

  it('unknown format returns true (default execute)', async () => {
    const fn = await load()
    expect(fn('weird.format == foo', scope())).toBe(true)
    expect(fn('foo bar baz', scope())).toBe(true)
  })
})
```

- [ ] **Step 2: Test ausführen (muss failen)**

Run: `npx vitest run src/__tests__/unit/services/workflow-condition-eval.test.ts`
Expected: FAIL — `evaluateCondition` ist heute nicht exportiert.

- [ ] **Step 3: Funktion umschreiben + exportieren**

In `src/lib/services/workflow/engine.ts`, die existierende `evaluateCondition`-Funktion komplett ersetzen durch:

```ts
/**
 * Evaluate a condition string against runtime context.
 *
 * Pfade:
 *   data.<field>[.<nested>...]      → ctx.triggerData
 *   steps.<id>.<field>[.<nested>...] → ctx.actionResults[<id>]
 *
 * Operatoren:  ==  !=  >  >=  <  <=
 * Spezialfall: == null / != null  (true für null/undefined/leerer-String)
 * Truthy: einzelner Pfad ohne Operator
 *
 * Unbekannte Formate → returns true (default execute, mit logger.warn).
 */
export function evaluateCondition(
  condition: string,
  scope: { triggerData: Record<string, unknown>; actionResults: Record<string, unknown> },
): boolean {
  if (!condition || !condition.trim()) return true

  try {
    const expr = condition.trim()

    function resolvePath(path: string): unknown {
      const parts = path.split('.')
      let cur: unknown
      if (parts[0] === 'data') cur = scope.triggerData
      else if (parts[0] === 'steps') cur = scope.actionResults
      else return undefined
      for (let i = 1; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return undefined
        cur = (cur as Record<string, unknown>)[parts[i]]
      }
      return cur
    }

    const PATH = String.raw`(?:data|steps)(?:\.\w+)+`

    // == null / != null
    let m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=)\\s*null$`))
    if (m) {
      const val = resolvePath(m[1])
      const isNullish = val === null || val === undefined || val === ''
      return m[2] === '==' ? isNullish : !isNullish
    }

    // == 'value' / != 'value'
    m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=)\\s*'([^']*)'$`))
    if (m) {
      const val = resolvePath(m[1])
      return m[2] === '==' ? String(val) === m[3] : String(val) !== m[3]
    }

    // numerische Operatoren
    m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=|>=|<=|>|<)\\s*(-?\\d+(?:\\.\\d+)?)$`))
    if (m) {
      const raw = resolvePath(m[1])
      const val = Number(raw)
      const num = Number(m[3])
      if (Number.isNaN(val)) return false
      switch (m[2]) {
        case '==': return val === num
        case '!=': return val !== num
        case '>':  return val > num
        case '>=': return val >= num
        case '<':  return val < num
        case '<=': return val <= num
      }
    }

    // truthy
    m = expr.match(new RegExp(`^(${PATH})$`))
    if (m) {
      const val = resolvePath(m[1])
      if (val == null || val === '' || val === false || val === 0) return false
      if (Array.isArray(val) && val.length === 0) return false
      return true
    }

    logger.warn(`Unknown condition format: ${expr}`, { module: 'WorkflowEngine' })
    return true
  } catch {
    return true
  }
}
```

Wichtig: `evaluateCondition` ist jetzt **exportiert** und nimmt `scope` (zwei-Felder-Objekt) statt nur `data`. Die zwei alten Aufruf-Stellen in der Engine werden in Task 3 angepasst.

- [ ] **Step 4: Tests ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-condition-eval.test.ts`
Expected: 9 tests passing.

- [ ] **Step 5: Typcheck (engine.ts hat noch Fehler durch Task 1, das ist ok)**

Run: `npx tsc --noEmit 2>&1 | grep "workflow-condition-eval" | head`
Expected: No output (Test-File ist clean).

Andere Fehler in `engine.ts` (durch Task 1) bleiben — werden in Task 3 gefixt.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/workflow/engine.ts src/__tests__/unit/services/workflow-condition-eval.test.ts
git commit -m "feat(workflow): condition eval supports steps.<id>.<path> + new operators (>=, <=, <)"
```

(Diesen Commit kannst du machen, auch wenn engine.ts insgesamt noch TS-Errors aus Task 1 hat — die Funktion `evaluateCondition` selbst kompiliert. Wenn du strenger sein willst: Task 3 vor diesem Commit fertig machen und beide zusammen committen.)

---

## Task 3: Engine-Refactor — `executeStepList` + `executeOneStep`

**Files:**
- Modify: `src/lib/services/workflow/engine.ts`
- Create: `src/__tests__/unit/services/workflow-engine-branch.test.ts`

- [ ] **Step 1: Failing test schreiben**

Create `src/__tests__/unit/services/workflow-engine-branch.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine — Branch step', () => {
  let lastStepResults: Array<Record<string, unknown>> = []

  beforeEach(() => {
    vi.resetModules()
    lastStepResults = []

    vi.doMock('@/lib/db', () => {
      const insertChain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
      }
      const updateChain: any = {
        set: vi.fn(function(this: any, val: any) {
          if (val.stepResults) lastStepResults = val.stepResults
          return this
        }),
        where: vi.fn().mockResolvedValue([]),
      }
      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      return {
        db: {
          insert: vi.fn(() => insertChain),
          update: vi.fn(() => updateChain),
          select: vi.fn(() => selectChain),
        },
      }
    })

    vi.doMock('@/lib/services/workflow/action-registry', async () => ({
      getAction: (name: string) => ({
        name,
        execute: async () => ({ success: true, data: { fromAction: name } }),
      }),
    }))
  })

  it('runs only THEN branch when ifCondition is true', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'br1', kind: 'branch', ifCondition: "data.priority == 'hoch'",
        then: [{ id: 'a1', kind: 'action', action: 'first' }],
        else: [{ id: 'b1', kind: 'action', action: 'second' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { priority: 'hoch' })

    const branch = lastStepResults.find(r => r.kind === 'branch')
    const a1 = lastStepResults.find(r => (r.path as string) === '1.then.1')
    const b1 = lastStepResults.find(r => (r.path as string) === '1.else.1')
    expect((branch?.result as any)?.taken).toBe('then')
    expect(a1?.status).toBe('completed')
    expect(b1).toBeUndefined()
  })

  it('runs only ELSE branch when ifCondition is false', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'br1', kind: 'branch', ifCondition: "data.priority == 'hoch'",
        then: [{ id: 'a1', kind: 'action', action: 'first' }],
        else: [{ id: 'b1', kind: 'action', action: 'second' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { priority: 'mittel' })

    const branch = lastStepResults.find(r => r.kind === 'branch')
    const b1 = lastStepResults.find(r => (r.path as string) === '1.else.1')
    expect((branch?.result as any)?.taken).toBe('else')
    expect(b1?.status).toBe('completed')
  })

  it('produces taken=none when condition false and no else', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'br1', kind: 'branch', ifCondition: 'data.required != null',
        then: [{ id: 'a1', kind: 'action', action: 'first' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const branch = lastStepResults.find(r => r.kind === 'branch')
    expect((branch?.result as any)?.taken).toBe('none')
    expect(lastStepResults.filter(r => r.kind === 'action')).toHaveLength(0)
  })

  it('legacy actionStep without kind still runs (backwards-compat)', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { action: 'legacy_no_kind' },  // no kind, no id — old workflow
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    expect(lastStepResults).toHaveLength(1)
    expect(lastStepResults[0].kind).toBe('action')
    expect(lastStepResults[0].action).toBe('legacy_no_kind')
    expect(lastStepResults[0].status).toBe('completed')
  })
})
```

- [ ] **Step 2: Test ausführen (muss failen)**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-branch.test.ts`
Expected: FAIL — Engine kennt heute kein `kind: 'branch'`, behandelt das als Action mit unknown name.

- [ ] **Step 3: Engine-Body refactor**

In `src/lib/services/workflow/engine.ts`, die Methode `executeWorkflow` (etwa Zeile 110-232) komplett ersetzen durch folgendes neues Setup. Helper-Funktionen werden VOR dem `WorkflowEngine`-Objekt deklariert:

```ts
interface RunContext {
  runId: string
  triggerData: Record<string, unknown>
  stepResults: StepResult[]
  actionResults: Record<string, unknown>
  stepCounter: { current: number }
  depth: number
}

const MAX_DEPTH = 10
const MAX_PARALLEL_FANOUT = 100

async function persistStepResults(ctx: RunContext): Promise<void> {
  await db.update(workflowRuns)
    .set({ stepResults: ctx.stepResults })
    .where(eq(workflowRuns.id, ctx.runId))
}

async function executeStepList(
  steps: WorkflowStep[],
  basePath: string,
  ctx: RunContext,
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const path = basePath ? `${basePath}.${i + 1}` : String(i + 1)
    await executeOneStep(step, path, ctx)
  }
}

async function executeOneStep(
  step: WorkflowStep,
  path: string,
  ctx: RunContext,
): Promise<void> {
  const startTime = Date.now()
  ctx.stepCounter.current += 1
  const stepNum = ctx.stepCounter.current

  await db.update(workflowRuns)
    .set({ currentStep: stepNum })
    .where(eq(workflowRuns.id, ctx.runId))

  if (ctx.depth > MAX_DEPTH) {
    ctx.stepResults.push({
      step: stepNum, path,
      action: (step as { action?: string }).action || (step as { kind?: string }).kind || 'unknown',
      kind: ((step as { kind?: StepKind }).kind ?? 'action'),
      label: step.label,
      status: 'failed',
      error: 'Max nesting depth exceeded',
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  const kind: StepKind = (step as { kind?: StepKind }).kind ?? 'action'

  // ── BRANCH ──────────────────────────────────────────────────
  if (kind === 'branch') {
    const bs = step as BranchStep
    const taken = evaluateCondition(bs.ifCondition, {
      triggerData: ctx.triggerData,
      actionResults: ctx.actionResults,
    }) ? 'then' : (bs.else ? 'else' : 'none')

    ctx.stepResults.push({
      step: stepNum, path, action: 'branch', kind: 'branch', label: bs.label,
      status: 'completed', result: { taken },
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)

    const childCtx = { ...ctx, depth: ctx.depth + 1 }
    if (taken === 'then') await executeStepList(bs.then, `${path}.then`, childCtx)
    else if (taken === 'else') await executeStepList(bs.else!, `${path}.else`, childCtx)
    // Sync stepCounter back (mutated through shared reference object)
    return
  }

  // ── PARALLEL ────────────────────────────────────────────────
  if (kind === 'parallel') {
    const ps = step as ParallelStep

    if (ps.steps.length > MAX_PARALLEL_FANOUT) {
      ctx.stepResults.push({
        step: stepNum, path, action: 'parallel', kind: 'parallel', label: ps.label,
        status: 'failed',
        error: `Parallel cardinality > ${MAX_PARALLEL_FANOUT}`,
        durationMs: Date.now() - startTime,
      })
      await persistStepResults(ctx)
      return
    }

    const summaryIdx = ctx.stepResults.length
    ctx.stepResults.push({
      step: stepNum, path, action: 'parallel', kind: 'parallel', label: ps.label,
      status: 'completed',
      result: { ranSubSteps: ps.steps.length, failedCount: 0 },
      durationMs: 0,
    })
    await persistStepResults(ctx)

    const subResultBundles = await Promise.allSettled(
      ps.steps.map((sub, i) => runSubStepIsolated(sub, `${path}.parallel.${i + 1}`, ctx)),
    )

    let failedCount = 0
    for (const sr of subResultBundles) {
      if (sr.status === 'fulfilled') {
        ctx.stepResults.push(...sr.value)
        for (const r of sr.value) if (r.status === 'failed') failedCount++
      }
      // rejected sollte nie passieren — runSubStepIsolated catched intern
    }

    ctx.stepResults[summaryIdx] = {
      ...ctx.stepResults[summaryIdx],
      result: { ranSubSteps: ps.steps.length, failedCount },
      durationMs: Date.now() - startTime,
    }
    await persistStepResults(ctx)
    return
  }

  // ── ACTION (default) ────────────────────────────────────────
  const as = step as ActionStep

  if (as.condition && !evaluateCondition(as.condition, {
    triggerData: ctx.triggerData,
    actionResults: ctx.actionResults,
  })) {
    ctx.stepResults.push({
      step: stepNum, path, action: as.action, kind: 'action', label: as.label,
      status: 'skipped',
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  const actionDef = getAction(as.action)
  if (!actionDef) {
    ctx.stepResults.push({
      step: stepNum, path, action: as.action, kind: 'action', label: as.label,
      status: 'failed',
      error: `Unknown action: ${as.action}`,
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  try {
    const res = await actionDef.execute(
      { triggerData: ctx.triggerData, stepResults: ctx.actionResults },
      as.config || {},
    )
    if (res.data) {
      const stepKey = as.id || as.action
      ctx.actionResults[stepKey] = res.data
      if (!(as.action in ctx.actionResults)) ctx.actionResults[as.action] = res.data
    }
    ctx.stepResults.push({
      step: stepNum, path, action: as.action, kind: 'action', label: as.label,
      status: res.success ? 'completed' : 'failed',
      result: res.data, error: res.error,
      durationMs: Date.now() - startTime,
    })
  } catch (err) {
    ctx.stepResults.push({
      step: stepNum, path, action: as.action, kind: 'action', label: as.label,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
    })
  }
  await persistStepResults(ctx)
}

async function runSubStepIsolated(
  sub: WorkflowStep,
  path: string,
  parentCtx: RunContext,
): Promise<StepResult[]> {
  const localCtx: RunContext = {
    ...parentCtx,
    stepResults: [],
    depth: parentCtx.depth + 1,
  }
  await executeOneStep(sub, path, localCtx)
  return localCtx.stepResults
}
```

Dann das `WorkflowEngine`-Objekt (etwa Zeile 86) so umstellen:

```ts
export const WorkflowEngine = {
  async fire(trigger: string, triggerData: Record<string, unknown>): Promise<void> {
    const activeWorkflows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.trigger, trigger), eq(workflows.isActive, true)))

    if (activeWorkflows.length === 0) {
      logger.info(`No workflows for trigger "${trigger}"`, { module: 'WorkflowEngine' })
      return
    }

    for (const workflow of activeWorkflows) {
      this.executeWorkflow(workflow.id, workflow.name, workflow.steps as WorkflowStep[], trigger, triggerData)
        .catch(err => logger.error(`Workflow "${workflow.name}" failed`, err, { module: 'WorkflowEngine' }))
    }
  },

  async executeWorkflow(
    workflowId: string,
    workflowName: string,
    steps: WorkflowStep[],
    trigger: string,
    triggerData: Record<string, unknown>,
  ): Promise<void> {
    const [run] = await db.insert(workflowRuns).values({
      workflowId,
      trigger,
      triggerData,
      status: 'running',
      currentStep: 0,
      totalSteps: steps.length,
      stepResults: [],
    }).returning()

    logger.info(`Workflow "${workflowName}" started (run: ${run.id}, top-level steps: ${steps.length})`, {
      module: 'WorkflowEngine',
    })

    const ctx: RunContext = {
      runId: run.id,
      triggerData,
      stepResults: [],
      actionResults: {},
      stepCounter: { current: 0 },
      depth: 0,
    }

    try {
      await executeStepList(steps, '', ctx)
      await db.update(workflowRuns).set({
        status: 'completed',
        stepResults: ctx.stepResults,
        completedAt: new Date(),
      }).where(eq(workflowRuns.id, run.id))
      const okCount = ctx.stepResults.filter(r => r.status === 'completed' && r.kind === 'action').length
      const totalAction = ctx.stepResults.filter(r => r.kind === 'action').length
      logger.info(`Workflow "${workflowName}" completed (${okCount}/${totalAction} actions OK)`, { module: 'WorkflowEngine' })
    } catch (err) {
      await db.update(workflowRuns).set({
        status: 'failed',
        stepResults: ctx.stepResults,
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      }).where(eq(workflowRuns.id, run.id))
      logger.error(`Workflow "${workflowName}" FAILED`, err, { module: 'WorkflowEngine' })
    }
  },
}
```

- [ ] **Step 4: Tests ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-branch.test.ts`
Expected: 4 tests passing.

Auch existing engine-step-id-Tests (von Phase 1) und condition-eval-Tests (Task 2) müssen weiter grün sein:

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-step-id.test.ts src/__tests__/unit/services/workflow-condition-eval.test.ts`
Expected: alles passing.

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "engine\.ts|workflow-engine-branch" | head`
Expected: No output. (Task 1's Datenmodell-Errors sollten jetzt durch Type-Narrowing in den `kind`-Branches resolved sein.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/workflow/engine.ts src/__tests__/unit/services/workflow-engine-branch.test.ts
git commit -m "feat(workflow): branch step + recursive engine (executeStepList/executeOneStep)"
```

---

## Task 4: Parallel-Step + Tests

**Files:**
- Already implemented in Task 3's engine.ts (parallel-block within executeOneStep).
- Create: `src/__tests__/unit/services/workflow-engine-parallel.test.ts`

- [ ] **Step 1: Failing/passing test schreiben**

Da die Engine-Logik schon in Task 3 enthalten ist, ist dies ein Test-only Task.

Create `src/__tests__/unit/services/workflow-engine-parallel.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine — Parallel step', () => {
  let lastStepResults: Array<Record<string, unknown>> = []
  let executionOrder: string[] = []

  beforeEach(() => {
    vi.resetModules()
    lastStepResults = []
    executionOrder = []

    vi.doMock('@/lib/db', () => {
      const insertChain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
      }
      const updateChain: any = {
        set: vi.fn(function(this: any, val: any) {
          if (val.stepResults) lastStepResults = val.stepResults
          return this
        }),
        where: vi.fn().mockResolvedValue([]),
      }
      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      return {
        db: {
          insert: vi.fn(() => insertChain),
          update: vi.fn(() => updateChain),
          select: vi.fn(() => selectChain),
        },
      }
    })

    vi.doMock('@/lib/services/workflow/action-registry', async () => ({
      getAction: (name: string) => ({
        name,
        execute: async () => {
          executionOrder.push(name)
          if (name === 'fail_action') return { success: false, error: 'boom' }
          return { success: true, data: { fromAction: name } }
        },
      }),
    }))
  })

  it('runs all sub-steps and collects results in deterministic order', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'p1', kind: 'parallel',
        steps: [
          { id: 's1', kind: 'action', action: 'task_a' },
          { id: 's2', kind: 'action', action: 'task_b' },
          { id: 's3', kind: 'action', action: 'task_c' },
        ],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const summary = lastStepResults.find(r => r.kind === 'parallel')
    const sub = lastStepResults.filter(r => (r.path as string).startsWith('1.parallel.'))
    expect((summary?.result as any)?.ranSubSteps).toBe(3)
    expect((summary?.result as any)?.failedCount).toBe(0)
    expect(sub).toHaveLength(3)
    // Reihenfolge im stepResults-Array deterministisch nach Sub-Index
    expect(sub.map(r => r.path)).toEqual(['1.parallel.1', '1.parallel.2', '1.parallel.3'])
  })

  it('counts failed sub-steps but keeps workflow running', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'p1', kind: 'parallel',
        steps: [
          { id: 's1', kind: 'action', action: 'task_a' },
          { id: 's2', kind: 'action', action: 'fail_action' },
          { id: 's3', kind: 'action', action: 'task_c' },
        ],
      },
      { id: 'after', kind: 'action', action: 'after_parallel' },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const summary = lastStepResults.find(r => r.kind === 'parallel')
    expect((summary?.result as any)?.failedCount).toBe(1)

    const after = lastStepResults.find(r => r.path === '2')
    expect(after?.status).toBe('completed')
  })

  it('handles empty parallel.steps gracefully', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { id: 'p1', kind: 'parallel', steps: [] },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const summary = lastStepResults.find(r => r.kind === 'parallel')
    expect((summary?.result as any)?.ranSubSteps).toBe(0)
    expect((summary?.result as any)?.failedCount).toBe(0)
  })
})
```

- [ ] **Step 2: Tests ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-parallel.test.ts`
Expected: 3 tests passing.

- [ ] **Step 3: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "workflow-engine-parallel" | head`
Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/unit/services/workflow-engine-parallel.test.ts
git commit -m "test(workflow): unit tests for parallel step (allSettled + summary + failed-count)"
```

---

## Task 5: Limits-Tests (Recursion-Depth + Parallel-Cardinality)

**Files:**
- Create: `src/__tests__/unit/services/workflow-engine-limits.test.ts`

- [ ] **Step 1: Test schreiben**

Create `src/__tests__/unit/services/workflow-engine-limits.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine — defensive limits', () => {
  let lastStepResults: Array<Record<string, unknown>> = []

  beforeEach(() => {
    vi.resetModules()
    lastStepResults = []

    vi.doMock('@/lib/db', () => {
      const insertChain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
      }
      const updateChain: any = {
        set: vi.fn(function(this: any, val: any) {
          if (val.stepResults) lastStepResults = val.stepResults
          return this
        }),
        where: vi.fn().mockResolvedValue([]),
      }
      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      return {
        db: {
          insert: vi.fn(() => insertChain),
          update: vi.fn(() => updateChain),
          select: vi.fn(() => selectChain),
        },
      }
    })

    vi.doMock('@/lib/services/workflow/action-registry', async () => ({
      getAction: () => ({
        execute: async () => ({ success: true, data: {} }),
      }),
    }))
  })

  it('rejects parallel with > 100 sub-steps', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const subSteps = Array.from({ length: 101 }, (_, i) => ({
      id: `s${i}`, kind: 'action', action: 'noop',
    }))
    const steps = [{ id: 'p1', kind: 'parallel', steps: subSteps }] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const summary = lastStepResults.find(r => r.kind === 'parallel')
    expect(summary?.status).toBe('failed')
    expect(summary?.error).toMatch(/cardinality/i)
    // No sub-steps run
    expect(lastStepResults.filter(r => (r.path as string).startsWith('1.parallel.'))).toHaveLength(0)
  })

  it('rejects nesting deeper than 10 levels', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    // Build 12 nested branches: branch -> then -> branch -> then -> ...
    function buildNested(depth: number): any[] {
      if (depth === 0) return [{ id: `leaf`, kind: 'action', action: 'noop' }]
      return [{
        id: `br${depth}`,
        kind: 'branch',
        ifCondition: 'data.x != null',
        then: buildNested(depth - 1),
      }]
    }

    const steps = buildNested(12)

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps as any, 'test', { x: 'truthy' })

    // Find a step with status=failed and the depth-error
    const failed = lastStepResults.find(r => r.status === 'failed' && /nesting depth/i.test((r.error as string) ?? ''))
    expect(failed).toBeDefined()
  })
})
```

- [ ] **Step 2: Test ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-limits.test.ts`
Expected: 2 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/unit/services/workflow-engine-limits.test.ts
git commit -m "test(workflow): defensive limits — parallel cardinality + nesting depth"
```

---

## Task 6: UI — `<StepCard>` und Action-Step-Editor extrahieren

**Files:**
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx`

- [ ] **Step 1: Bestand lesen**

Read `src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx` (336 Zeilen). Identify:
- Wo der Action-Step gerendert wird (innerhalb von `steps.map(...)`).
- Welche Sub-Komponenten gerendert werden (Action-Selector, Config-Field-Editoren, Move/Delete-Buttons).

Diese werden in Task 6 in eine eigene `<StepCard>` ausgelagert, ohne Verhaltensänderung — pure Refactor.

- [ ] **Step 2: `<StepCard>` extrahieren**

Create `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx`:

```tsx
'use client'

// Extract the per-step rendering logic from workflow-designer.tsx into this file.
// Goal: workflow-designer.tsx imports <StepCard> and just maps over steps; no
// behavior change in this task. In Task 7 the card switches on step.kind to
// render branch/parallel editors.

import type { WorkflowStep, ActionDefinition } from './types'  // create or extend a types module if needed

export interface StepCardProps {
  step: WorkflowStep
  index: number
  totalSteps: number
  actions: ActionDefinition[]
  onChange: (step: WorkflowStep) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function StepCard(props: StepCardProps) {
  // Move the existing step-card JSX from workflow-designer.tsx HERE.
  // Leave the inner action-step rendering exactly as it was — this task is a pure refactor.
  // Adapt prop names (e.g. `idx` → `index`) where needed.
  // ...
  return null  // placeholder — REPLACE with the extracted JSX
}
```

(Der Implementer extrahiert hier den existierenden Action-Step-JSX-Block aus `workflow-designer.tsx` 1:1 in diese Datei. Wenn der existierende Code lokal `WorkflowStep`-Interface deklariert, dieses entweder nach `step-card.tsx` mitnehmen ODER einen `types.ts` daneben anlegen, der von beiden Dateien genutzt wird. Empfohlen: eigene `types.ts` für klare Boundaries.)

- [ ] **Step 3: `workflow-designer.tsx` entschlacken**

In `src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx`:
- Den extrahierten JSX-Block entfernen.
- `import { StepCard } from './step-card'` ergänzen.
- Im `steps.map(...)`-Loop nur noch `<StepCard step={...} index={idx} ... />` rendern.

Behavior darf sich nicht ändern. Bestandsworkflows müssen weiter funktionieren (laden, anzeigen, speichern).

- [ ] **Step 4: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "workflow-designer|step-card" | head`
Expected: No output.

- [ ] **Step 5: Commit**

```bash
git add "src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx" "src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx"
git commit -m "refactor(workflow-ui): extract StepCard from workflow-designer (no behavior change)"
```

---

## Task 7: UI — `<StepList>` rekursiv + `<AddStepMenu>`

**Files:**
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/step-list.tsx`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/add-step-menu.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx`

- [ ] **Step 1: Helper-Modul für Step-Factories**

In `step-card.tsx` (oder einem `helpers.ts` daneben) drei Factories:

```tsx
function shortId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function makeActionStep(actionName: string): WorkflowStep {
  return { id: shortId(), kind: 'action', action: actionName }
}

export function makeBranchStep(): WorkflowStep {
  return { id: shortId(), kind: 'branch', ifCondition: '', then: [] }
}

export function makeParallelStep(): WorkflowStep {
  return { id: shortId(), kind: 'parallel', steps: [] }
}
```

- [ ] **Step 2: `<AddStepMenu>` erstellen**

Create `src/app/intern/(dashboard)/settings/workflows/_components/add-step-menu.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, GitBranch, Layers } from 'lucide-react'
import type { ActionDefinition } from './types'

interface Props {
  actions: ActionDefinition[]
  onAddAction: (name: string) => void
  onAddBranch: () => void
  onAddParallel: () => void
}

export function AddStepMenu({ actions, onAddAction, onAddBranch, onAddParallel }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" /> Schritt hinzufügen
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-auto">
        <DropdownMenuLabel>Aktion</DropdownMenuLabel>
        {actions.map(a => (
          <DropdownMenuItem key={a.name} onClick={() => onAddAction(a.name)}>
            {a.label || a.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Steuerung</DropdownMenuLabel>
        <DropdownMenuItem onClick={onAddBranch}>
          <GitBranch className="h-4 w-4 mr-2" /> Verzweigung (if/else)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddParallel}>
          <Layers className="h-4 w-4 mr-2" /> Parallel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 3: `<StepList>` erstellen**

Create `src/app/intern/(dashboard)/settings/workflows/_components/step-list.tsx`:

```tsx
'use client'

import type { WorkflowStep, ActionDefinition } from './types'
import { StepCard, makeActionStep, makeBranchStep, makeParallelStep } from './step-card'
import { AddStepMenu } from './add-step-menu'

function swap<T>(arr: T[], i: number, j: number): T[] {
  const out = [...arr]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

interface Props {
  steps: WorkflowStep[]
  onChange: (steps: WorkflowStep[]) => void
  actions: ActionDefinition[]
}

export function StepList({ steps, onChange, actions }: Props) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <StepCard
          key={step.id ?? `${idx}`}
          step={step}
          index={idx}
          totalSteps={steps.length}
          actions={actions}
          onChange={updated => onChange(steps.map((s, i) => (i === idx ? updated : s)))}
          onDelete={() => onChange(steps.filter((_, i) => i !== idx))}
          onMoveUp={idx > 0 ? () => onChange(swap(steps, idx, idx - 1)) : undefined}
          onMoveDown={idx < steps.length - 1 ? () => onChange(swap(steps, idx, idx + 1)) : undefined}
        />
      ))}
      <AddStepMenu
        actions={actions}
        onAddAction={name => onChange([...steps, makeActionStep(name)])}
        onAddBranch={() => onChange([...steps, makeBranchStep()])}
        onAddParallel={() => onChange([...steps, makeParallelStep()])}
      />
    </div>
  )
}
```

- [ ] **Step 4: `workflow-designer.tsx` umschalten auf `<StepList>`**

In `workflow-designer.tsx`:
- Den existierenden `steps.map(...)` + Add-Step-Button-Block ersetzen durch:

```tsx
<StepList
  steps={steps}
  onChange={onChange}
  actions={actions}
/>
```

- Imports anpassen.
- Bisherigen `addStep`-Helper entfernen (jetzt in `step-list.tsx`).

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "workflow-designer\|step-list\|add-step-menu\|step-card" | head`
Expected: No output.

- [ ] **Step 6: Commit**

```bash
git add "src/app/intern/(dashboard)/settings/workflows/_components/"
git commit -m "feat(workflow-ui): recursive StepList + AddStepMenu (action/branch/parallel)"
```

---

## Task 8: UI — Branch + Parallel Editors

**Files:**
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/branch-step-editor.tsx`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/parallel-step-editor.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx` (kind-Switch)

- [ ] **Step 1: BranchStepEditor**

Create `src/app/intern/(dashboard)/settings/workflows/_components/branch-step-editor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Minus } from 'lucide-react'
import type { WorkflowStep, ActionDefinition } from './types'
import { StepList } from './step-list'

interface BranchStep {
  id?: string
  kind: 'branch'
  label?: string
  ifCondition: string
  then: WorkflowStep[]
  else?: WorkflowStep[]
}

interface Props {
  step: BranchStep
  actions: ActionDefinition[]
  onChange: (step: BranchStep) => void
}

export function BranchStepEditor({ step, actions, onChange }: Props) {
  const [showElse, setShowElse] = useState(!!step.else)

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Verzweigung (if/else)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Bedingung</Label>
          <Input
            value={step.ifCondition}
            onChange={e => onChange({ ...step, ifCondition: e.target.value })}
            placeholder="z.B. data.priority == 'hoch'  oder  steps.webhook_x.status == 200"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Erlaubt: <code>data.&lt;feld&gt;</code>, <code>steps.&lt;id&gt;.&lt;feld&gt;</code> mit Operatoren <code>== != &gt; &gt;= &lt; &lt;=</code> oder <code>== null</code> / <code>!= null</code>.
          </p>
        </div>

        <div className="pl-4 border-l-2 border-muted space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Then (wenn Bedingung wahr)</h4>
          <StepList
            steps={step.then}
            onChange={updated => onChange({ ...step, then: updated })}
            actions={actions}
          />
        </div>

        {showElse ? (
          <div className="pl-4 border-l-2 border-muted space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Else (sonst)</h4>
              <Button variant="ghost" size="sm" onClick={() => { setShowElse(false); onChange({ ...step, else: undefined }) }}>
                <Minus className="h-4 w-4 mr-1" /> Else entfernen
              </Button>
            </div>
            <StepList
              steps={step.else ?? []}
              onChange={updated => onChange({ ...step, else: updated })}
              actions={actions}
            />
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => { setShowElse(true); onChange({ ...step, else: [] }) }}>
            <Plus className="h-4 w-4 mr-2" /> Else-Branch hinzufügen
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: ParallelStepEditor**

Create `src/app/intern/(dashboard)/settings/workflows/_components/parallel-step-editor.tsx`:

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WorkflowStep, ActionDefinition } from './types'
import { StepList } from './step-list'

interface ParallelStep {
  id?: string
  kind: 'parallel'
  label?: string
  steps: WorkflowStep[]
}

interface Props {
  step: ParallelStep
  actions: ActionDefinition[]
  onChange: (step: ParallelStep) => void
}

export function ParallelStepEditor({ step, actions, onChange }: Props) {
  const subCount = step.steps.length
  const warning =
    subCount < 2 ? 'Hinweis: Parallel mit weniger als 2 Schritten ist semantisch wie eine Aktion.'
    : subCount > 20 ? 'Achtung: viele parallele Schritte können Last erzeugen (Limit: 100).'
    : null

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Parallel ({subCount} Schritt{subCount === 1 ? '' : 'e'})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {warning && <p className="text-xs text-amber-600">{warning}</p>}
        <div className="pl-4 border-l-2 border-muted">
          <StepList
            steps={step.steps}
            onChange={updated => onChange({ ...step, steps: updated })}
            actions={actions}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: `<StepCard>` schaltet auf kind**

In `step-card.tsx` den Render-Body umstellen auf:

```tsx
import { BranchStepEditor } from './branch-step-editor'
import { ParallelStepEditor } from './parallel-step-editor'

// Inside StepCard component, the main return:
const kind = (props.step as any).kind ?? 'action'

if (kind === 'branch') {
  return (
    <div className="relative">
      {/* Move/Delete-Buttons-Header (gleiche Hülle wie Action) */}
      <StepHeader {...props} />
      <BranchStepEditor
        step={props.step as any}
        actions={props.actions}
        onChange={props.onChange}
      />
    </div>
  )
}

if (kind === 'parallel') {
  return (
    <div className="relative">
      <StepHeader {...props} />
      <ParallelStepEditor
        step={props.step as any}
        actions={props.actions}
        onChange={props.onChange}
      />
    </div>
  )
}

// Default: Action-Step (existing JSX)
return <ActionStepBody {...props} />
```

`<StepHeader>` ist die gemeinsame Hülle mit Move-Up/Down/Delete-Buttons + Label-Input — extrahiere die existierenden Buttons aus dem alten Action-Step in einen kleinen lokalen Component.

`<ActionStepBody>` ist der existierende Action-Step-JSX (von Task 6).

- [ ] **Step 4: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "branch-step-editor|parallel-step-editor|step-card" | head`
Expected: No output.

- [ ] **Step 5: Manueller Sanity-Check**

Optional: App lokal starten, in `/intern/settings/workflows/<id>` einen Test-Workflow laden.
- Klicken: „Schritt hinzufügen" → „Verzweigung". Branch-Card erscheint mit Then-Container und „Else hinzufügen"-Button.
- Innerhalb Then: erneut „Schritt hinzufügen" → Aktion auswählen. Sub-Step erscheint indented.
- Speichern + neu laden: Workflow lädt korrekt mit Branch-Step + Sub-Step.

(Wenn nicht testbar: nicht blockieren — wird in Task 11 manual E2E geprüft.)

- [ ] **Step 6: Commit**

```bash
git add "src/app/intern/(dashboard)/settings/workflows/_components/"
git commit -m "feat(workflow-ui): branch + parallel step editors with recursive sub-StepList"
```

---

## Task 9: Run-History-Indentation + Branch/Parallel-Badges

**Files:**
- Modify: Run-History-Komponente. Lokalisieren via grep.

- [ ] **Step 1: Run-History-Komponente finden**

Run: `grep -rn "stepResults\.map\|step\.action\|stepResult" "C:\Daten\xkmu-business-os\src\app\intern" --include="*.tsx" | grep -i workflow | head -10`

Erwarteter Fund: `[id]/page.tsx` oder `[id]/dev/page.tsx` rendert vermutlich die Run-History.

- [ ] **Step 2: Indentation + Badges einbauen**

In der gefundenen Komponente, wo die `stepResults` über `.map(...)` gerendert werden, das Item-Rendering anpassen:

```tsx
{run.stepResults.map((result: any, i: number) => {
  const indent = ((result.path as string)?.split('.').length - 1) * 16  // 16px pro Ebene
  const kind = result.kind ?? 'action'
  return (
    <div key={i} style={{ paddingLeft: indent }} className="flex items-center gap-2 py-1 text-sm">
      {kind === 'branch' && (
        <Badge variant="outline">
          Verzweigung → {result.result?.taken ?? '?'}
        </Badge>
      )}
      {kind === 'parallel' && (
        <Badge variant="outline">
          Parallel ({result.result?.ranSubSteps ?? 0} Schritte
          {result.result?.failedCount > 0 ? `, ${result.result.failedCount} failed` : ''})
        </Badge>
      )}
      {kind === 'action' && (
        <span className="font-mono text-xs">{result.action}</span>
      )}
      {result.label && <span className="text-muted-foreground">— {result.label}</span>}
      <Badge variant={
        result.status === 'completed' ? 'default'
        : result.status === 'failed' ? 'destructive'
        : 'secondary'
      } className="ml-auto">
        {result.status}
      </Badge>
      <span className="text-xs text-muted-foreground tabular-nums">{result.durationMs}ms</span>
      {result.error && <span className="text-xs text-destructive">{result.error}</span>}
    </div>
  )
})}
```

(Anpassen an die existierende Layout-Struktur — Klassen/Wrapper-Tags von der bestehenden Implementierung übernehmen, nur das Badge-Switch + Indentation ist neu.)

- [ ] **Step 3: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "workflows/" | head`
Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add "src/app/intern/(dashboard)/settings/workflows/"
git commit -m "feat(workflow-ui): run-history shows indentation + branch/parallel badges"
```

---

## Task 10: Integration-Tests (Branch-Flow + Parallel-Flow)

**Files:**
- Create: `src/__tests__/integration-real/workflow-branch-flow.test.ts`
- Create: `src/__tests__/integration-real/workflow-parallel-flow.test.ts`

- [ ] **Step 1: Branch-Flow-Test**

Create `src/__tests__/integration-real/workflow-branch-flow.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createServer, type Server } from 'http'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow branch flow', () => {
  let server: Server
  let port: number
  let httpStatusToReturn = 200
  let workflowId: string | null = null

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => {
        res.statusCode = httpStatusToReturn
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ status: httpStatusToReturn, echoed: body }))
      })
    })
    await new Promise<void>(resolve => server.listen(0, () => resolve()))
    port = (server.address() as any).port
  })

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
    if (workflowId) {
      const db = createTestDb()
      const { workflows, workflowRuns } = await import('@/lib/db/schema')
      const { eq } = await import('drizzle-orm')
      await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
      await db.delete(workflows).where(eq(workflows.id, workflowId))
    }
  })

  it('branches based on webhook status', async () => {
    const db = createTestDb()
    const { workflows, workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: `BranchFlowTest-${Date.now()}`,
      trigger: 'test.branch_flow',
      isActive: true,
      steps: [
        {
          id: 'wh1', kind: 'action', action: 'webhook_call',
          config: { url: `http://localhost:${port}/`, method: 'POST', body: { x: 1 } },
        },
        {
          id: 'br1', kind: 'branch',
          ifCondition: 'steps.wh1.status >= 400',
          then: [{ id: 'fail_log', kind: 'action', action: 'log_activity', config: { type: 'note', content: 'failure' } }],
          else: [{ id: 'ok_log', kind: 'action', action: 'log_activity', config: { type: 'note', content: 'success' } }],
        },
      ],
    }).returning()
    workflowId = wf.id

    const { WorkflowEngine } = await import('@/lib/services/workflow')

    // Case A: webhook returns 200 → else-branch ('ok_log') runs
    httpStatusToReturn = 200
    await WorkflowEngine.fire('test.branch_flow', {})
    await new Promise(r => setTimeout(r, 800))

    let runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    let lastRun = runs[runs.length - 1]
    let stepResults = lastRun.stepResults as Array<{ path: string; status: string; result?: any; action: string }>
    const okBranchTaken = stepResults.find(r => r.action === 'branch')?.result?.taken
    expect(okBranchTaken).toBe('else')
    expect(stepResults.find(r => r.path === '2.else.1')?.status).toBe('completed')

    // Case B: webhook returns 500 → then-branch ('fail_log') runs
    httpStatusToReturn = 500
    await WorkflowEngine.fire('test.branch_flow', {})
    await new Promise(r => setTimeout(r, 4000))  // 5xx triggers retry — wait longer

    runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    lastRun = runs[runs.length - 1]
    stepResults = lastRun.stepResults as any
    const failBranchTaken = stepResults.find(r => r.action === 'branch')?.result?.taken
    expect(failBranchTaken).toBe('then')
    expect(stepResults.find(r => r.path === '2.then.1')?.status).toBe('completed')
  }, 15_000)
})
```

- [ ] **Step 2: Parallel-Flow-Test**

Create `src/__tests__/integration-real/workflow-parallel-flow.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createServer, type Server } from 'http'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow parallel flow', () => {
  let server: Server
  let port: number
  let receivedAt: number[] = []
  let workflowId: string | null = null

  beforeAll(async () => {
    server = createServer((req, res) => {
      receivedAt.push(Date.now())
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => {
        // 50ms artificial delay to make timestamps spreadable
        setTimeout(() => {
          res.statusCode = 200
          res.end('{"ok":true}')
        }, 50)
      })
    })
    await new Promise<void>(resolve => server.listen(0, () => resolve()))
    port = (server.address() as any).port
  })

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
    if (workflowId) {
      const db = createTestDb()
      const { workflows, workflowRuns } = await import('@/lib/db/schema')
      const { eq } = await import('drizzle-orm')
      await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
      await db.delete(workflows).where(eq(workflows.id, workflowId))
    }
  })

  it('runs 3 sub-steps in parallel within ~100ms', async () => {
    receivedAt = []
    const db = createTestDb()
    const { workflows, workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: `ParallelFlowTest-${Date.now()}`,
      trigger: 'test.parallel_flow',
      isActive: true,
      steps: [
        {
          id: 'p1', kind: 'parallel',
          steps: [
            { id: 's1', kind: 'action', action: 'webhook_call', config: { url: `http://localhost:${port}/a`, method: 'POST' } },
            { id: 's2', kind: 'action', action: 'webhook_call', config: { url: `http://localhost:${port}/b`, method: 'POST' } },
            { id: 's3', kind: 'action', action: 'webhook_call', config: { url: `http://localhost:${port}/c`, method: 'POST' } },
          ],
        },
      ],
    }).returning()
    workflowId = wf.id

    const { WorkflowEngine } = await import('@/lib/services/workflow')
    await WorkflowEngine.fire('test.parallel_flow', {})
    await new Promise(r => setTimeout(r, 1500))

    expect(receivedAt.length).toBe(3)
    const spread = Math.max(...receivedAt) - Math.min(...receivedAt)
    expect(spread).toBeLessThan(200)  // alle 3 Requests starten innerhalb 200ms

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    const stepResults = runs[0].stepResults as Array<{ path: string; status: string }>
    const subSteps = stepResults.filter(r => r.path.startsWith('1.parallel.'))
    expect(subSteps).toHaveLength(3)
    expect(subSteps.every(s => s.status === 'completed')).toBe(true)
  }, 10_000)
})
```

- [ ] **Step 3: Tests soft-laufen lassen**

Run: `npx vitest run src/__tests__/integration-real/workflow-branch-flow.test.ts src/__tests__/integration-real/workflow-parallel-flow.test.ts 2>&1 | tail -20`

Expected:
- Skipped wenn `TEST_DATABASE_URL` fehlt — akzeptabel.
- Pass wenn DB verfügbar.

- [ ] **Step 4: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "workflow-branch-flow|workflow-parallel-flow" | head`
Expected: No output.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/integration-real/workflow-branch-flow.test.ts src/__tests__/integration-real/workflow-parallel-flow.test.ts
git commit -m "test(workflow): integration tests — branch flow + parallel flow"
```

---

## Task 11: Manuelles E2E + Deploy

**Files:** none

- [ ] **Step 1: Lokal testen**

1. `npm run dev`. Als Admin einloggen.
2. Zu `/intern/settings/workflows` → Neuen Workflow „Phase2-Test", Trigger `contact.submitted`.
3. „Schritt hinzufügen" → Aktion `webhook_call` → URL `https://webhook.site/<id>`, Body `{"firma": "{{data.company}}"}`.
4. „Schritt hinzufügen" → Verzweigung. Bedingung: `steps.webhook_call.status == 200`. Then-Container: Action `log_activity` mit content „OK". Else-Container: Action `notify_admin`.
5. „Schritt hinzufügen" → Parallel. Drei Sub-Steps `webhook_call` an unterschiedliche URLs.
6. Speichern, aktiv schalten.
7. Kontaktformular absenden → Run-History prüfen:
   - Webhook-Step `1` mit status 200.
   - Branch-Step `2` mit `taken: 'else'`.
   - Sub-Step `2.else.1` (log_activity) mit status completed.
   - Parallel-Step `3` mit 3 Sub-Steps `3.parallel.{1,2,3}`, alle completed.
8. Webhook-URL absichtlich auf eine 500-zurückgebende Adresse umstellen (z.B. `https://httpbin.org/status/500`). Nochmal Kontaktformular senden → Branch nimmt diesmal `then`-Pfad.

- [ ] **Step 2: Deploy**

```bash
git push
```

Migration-frei — sofort wirksam. Bestandsworkflows funktionieren weiter (Backwards-Compat).

- [ ] **Step 3: Verify Prod**

In der Prod-UI nochmal ein Test-Workflow mit Branch + Parallel anlegen. Kontaktformular auf der Live-Site absenden → in `/intern/settings/workflows/<id>` Run-History mit Indentation und Badges anzeigen.

---

## Self-Review Notes

**Spec-Coverage:**
- §3.1 Datenmodell → Task 1 (Datenmodell-Setup), Task 3 (engine consumes the union).
- §3.2 Engine-Refactor → Task 3 (executeStepList + Branch), Task 4 (Parallel — code already in Task 3, only tests in Task 4).
- §3.3 Condition-Sprache → Task 2.
- §3.4 UI-Editor → Tasks 6 (StepCard extract), 7 (StepList + AddStepMenu), 8 (Branch + Parallel editors).
- §3.5 Run-History-UI → Task 9.
- §4 Sicherheit (Limits) → Task 5 (Tests; Engine-Code in Task 3).
- §6.1 Unit-Tests → Tasks 2, 3, 4, 5.
- §6.2 Integration-Tests → Task 10.
- §6.3 Manuell → Task 11.

**Placeholder-Scan:**
- Task 6 Step 2 erwähnt „REPLACE with the extracted JSX" — ist eine bewusste Refactor-Anweisung an den Implementer, kein Plan-Failure (der Implementer kennt den existierenden JSX-Block aus Step 1).
- Task 9 Step 2 sagt „Anpassen an existierende Layout-Struktur" — pragmatisch, da der genaue UI-Stil unbekannt ist; das konkrete Badge-/Indentation-Snippet ist vollständig.

Sonst keine Placeholders.

**Type-Consistency:**
- `WorkflowStep` als Discriminated Union ist konsistent in Engine + UI.
- `evaluateCondition`-Signatur (Task 2) wird in Engine (Task 3) korrekt genutzt.
- `StepResult.path` und `StepResult.kind` (Task 1) werden in Run-History-Rendering (Task 9) konsistent gelesen.
- `makeActionStep`/`makeBranchStep`/`makeParallelStep`-Helper in Task 7 generieren immer eine `id`.

**Risiken:**
- Task 1+3 sind gekoppelt: Datenmodell-Änderung allein kompiliert nicht. Implementer sollte Task 1 und Task 3 als zusammenhängende Änderung sehen — der Plan dokumentiert das (Task 1 Step 3 Hinweis).
- Task 6 Refactor (Extract StepCard) ist „pure" — aber wenn die `<StepCard>` interne State hält (z.B. Action-Selektor-Dropdown-State), muss der Implementer das mitnehmen. Der Plan sagt explizit „1:1 extrahieren".
- Run-History-Komponente (Task 9): exakter Pfad/Komponentenname ist nicht im Plan — Implementer nutzt grep. Das ist akzeptable Plan-Indirection, weil die Komponente bekannt aufgebaut ist.

**Out-of-Scope (gemäß Spec):** Visual flowchart, Drag-and-Drop, Loop-Steps, Sub-Workflow, URL-Whitelist, Batched-Persist — keine Tasks für diese, korrekt deferred.
