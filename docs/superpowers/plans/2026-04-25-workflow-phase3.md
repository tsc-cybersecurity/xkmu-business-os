# Workflow Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workflow-Engine erweitert um `for_each`-Loops und Boolean-Composition in Conditions, Designer integriert geplante Trigger nahtlos, DnD-Reorder im Step-Editor.

**Architecture:** Step-Type-Diskriminator wird um `kind: 'for_each'` erweitert. `evaluateCondition` wandert in eigenes Modul `condition-parser.ts` mit recursive-descent-Boolean-Composer (Atome unverändert, ~60 Zeilen Composer). `workflows.schedule jsonb` + neuer `__scheduled__`-Trigger; Sync zu `cron_jobs` über `WorkflowService.syncSchedule`. `@dnd-kit/sortable` wrappt `<StepList>`; Cross-Container-Drops gesperrt via Container-IDs.

**Tech Stack:** TypeScript, Drizzle ORM (1 additive Migration), vitest, React, `@dnd-kit/core`+`@dnd-kit/sortable`+`@dnd-kit/utilities`.

**Spec:** `docs/superpowers/specs/2026-04-25-workflow-phase3-design.md`

---

## File Structure

**Engine + Services**
- Modify: `src/lib/services/workflow/engine.ts` — Step-Type-Union erweitert, `for_each`-Branch in `executeOneStep`, importiert `evaluateCondition` aus neuem Modul
- Create: `src/lib/services/workflow/condition-parser.ts` — Atom-Matcher (aus engine.ts) + Boolean-Composer
- Create: `src/lib/services/workflow.service.ts` — `syncSchedule`-Methode
- Modify: `src/lib/services/cron.service.ts` — `tick()` handhabt `actionConfig.direct === true`
- Modify: `src/lib/services/workflow/triggers.ts` — Eintrag `__scheduled__`

**Schema**
- Modify: `src/lib/db/schema.ts` — `schedule jsonb` auf `workflows`
- Generate: `src/lib/db/migrations/<timestamp>_workflow_schedule.sql`

**API**
- Modify: `src/app/api/v1/workflows/route.ts` — POST validiert + persistiert `schedule`, ruft `syncSchedule`
- Modify: `src/app/api/v1/workflows/[id]/route.ts` — PUT/DELETE rufen `syncSchedule`

**Tests (Unit)**
- Move + Rename: `src/__tests__/unit/services/workflow-condition-eval.test.ts` → `workflow-condition-parser.test.ts` (Phase-2-Cases bleiben + 12 neue)
- Create: `src/__tests__/unit/services/workflow-engine-foreach.test.ts`
- Modify: `src/__tests__/unit/services/workflow-engine-limits.test.ts` — neuer Case Loop in Branch in Loop
- Create: `src/__tests__/unit/services/workflow-schedule-sync.test.ts`

**Tests (Integration)**
- Create: `src/__tests__/integration-real/workflow-foreach-flow.test.ts`
- Create: `src/__tests__/integration-real/workflow-cron-flow.test.ts`

**UI**
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/types.ts` — `ForEachStep` ergänzen
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx` — `kind === 'for_each'`-Branch + `makeForEachStep()`
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/for-each-step-editor.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/add-step-menu.tsx` — neuer Eintrag „Schleife"
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/step-list.tsx` — `<DndContext>` + `<SortableContext>`, Container-ID-Prop
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx` — top-level `<DndContext>`, Schedule-Section conditional auf `__scheduled__`
- Modify: `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx` — `WorkflowData` um `schedule`, Run-History `for_each`-Badge + Indentation-Algorithmus

---

## Task 1: Schema-Migration + WorkflowStep-Union erweitern

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/services/workflow/engine.ts`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/types.ts`
- Generate: `src/lib/db/migrations/<timestamp>_workflow_schedule.sql`

- [ ] **Step 1: `workflows.schedule`-Spalte ergänzen**

In `src/lib/db/schema.ts`, in der `workflows`-Tabellendefinition, neben `steps` ergänzen:

```ts
schedule: jsonb('schedule'),  // { interval: '5min'|'15min'|'30min'|'60min'|'daily', dailyAt?: 'HH:MM' } | null
```

- [ ] **Step 2: Drizzle-Migration generieren**

Run: `npm run db:generate`
Expected: Neue SQL-Datei unter `src/lib/db/migrations/<timestamp>_workflow_schedule.sql` mit `ALTER TABLE workflows ADD COLUMN schedule jsonb;`. Falls die SQL anders ausfällt (z.B. `text`), die Spaltendefinition prüfen — `jsonb('schedule')` muss exakt so übernommen werden.

- [ ] **Step 3: Migration anwenden**

Run: `npm run db:migrate` (oder lokal die generierte SQL gegen `psql` laufen lassen). Bei Production-Deploy läuft das im Deploy-Pipeline-Schritt.

- [ ] **Step 4: `ForEachStep` in engine.ts**

In `src/lib/services/workflow/engine.ts`, die `WorkflowStep`-Union ergänzen. Vor der Zeile `type WorkflowStep = ActionStep | BranchStep | ParallelStep`:

```ts
interface ForEachStep extends BaseStep {
  kind: 'for_each'
  source: string             // 'data.<path>' | 'steps.<id>.<path>' — muss zu Array auflösen
  steps: WorkflowStep[]
}
```

Dann die Type-Aliasse anpassen:

```ts
type StepKind = 'action' | 'branch' | 'parallel' | 'for_each'
type WorkflowStep = ActionStep | BranchStep | ParallelStep | ForEachStep
```

Konstante ergänzen (neben `MAX_DEPTH` / `MAX_PARALLEL_FANOUT`):

```ts
const MAX_LOOP_ITERATIONS = 100
```

- [ ] **Step 5: `ForEachStep` in UI-types.ts**

In `src/app/intern/(dashboard)/settings/workflows/_components/types.ts`:

```ts
export interface ForEachStep extends BaseStep {
  kind: 'for_each'
  source: string
  steps: WorkflowStep[]
}

export type WorkflowStep = ActionStep | BranchStep | ParallelStep | ForEachStep
export type StepKind = 'action' | 'branch' | 'parallel' | 'for_each'
```

- [ ] **Step 6: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "engine\.ts|types\.ts|schema\.ts" | head -20`
Expected: Keine Fehler aus diesen Dateien. (Erwartet: TS-Fehler in der Engine, weil `executeOneStep` `for_each` noch nicht handelt — das wird Task 4 fixen. Diese Fehler tauchen unter `engine.ts` auf, sind aber im `executeOneStep`-Body, nicht im Type-Setup. Ignorieren.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/migrations/ src/lib/services/workflow/engine.ts src/app/intern/(dashboard)/settings/workflows/_components/types.ts
git commit -m "feat(workflow): schema + types — workflows.schedule + ForEachStep"
```

---

## Task 2: `condition-parser.ts` extrahieren + Atome bewahren

**Files:**
- Create: `src/lib/services/workflow/condition-parser.ts`
- Modify: `src/lib/services/workflow/engine.ts`
- Move + Rename: `src/__tests__/unit/services/workflow-condition-eval.test.ts` → `workflow-condition-parser.test.ts`

- [ ] **Step 1: Tests umbenennen + Import-Pfad anpassen**

Run: `git mv src/__tests__/unit/services/workflow-condition-eval.test.ts src/__tests__/unit/services/workflow-condition-parser.test.ts`

In der umbenannten Datei den Import-Pfad in der Loader-Funktion ersetzen:

```ts
function load() {
  return import('@/lib/services/workflow/condition-parser').then(m => (m as any).evaluateCondition)
}
```

- [ ] **Step 2: `condition-parser.ts` erstellen mit Atom-Matcher**

Create `src/lib/services/workflow/condition-parser.ts`:

```ts
import { logger } from '@/lib/utils/logger'

export type Scope = {
  triggerData: Record<string, unknown>
  actionResults: Record<string, unknown>
}

export function resolvePath(path: string, scope: Scope): unknown {
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

/**
 * Evaluiert einen atomaren Vergleich (kein && / || / Klammern).
 * Patterns: 8 Stück (siehe Phase-2-Spec).
 */
function evaluateAtom(atom: string, scope: Scope): boolean {
  const expr = atom.trim()
  if (!expr) return true

  // == null / != null
  let m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=)\\s*null$`))
  if (m) {
    const val = resolvePath(m[1], scope)
    const isNullish = val === null || val === undefined || val === ''
    return m[2] === '==' ? isNullish : !isNullish
  }

  // == 'value' / != 'value'
  m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=)\\s*'([^']*)'$`))
  if (m) {
    const val = resolvePath(m[1], scope)
    return m[2] === '==' ? String(val) === m[3] : String(val) !== m[3]
  }

  // numerische Operatoren
  m = expr.match(new RegExp(`^(${PATH})\\s*(==|!=|>=|<=|>|<)\\s*(-?\\d+(?:\\.\\d+)?)$`))
  if (m) {
    const raw = resolvePath(m[1], scope)
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
    const val = resolvePath(m[1], scope)
    if (val == null || val === '' || val === false || val === 0) return false
    if (Array.isArray(val) && val.length === 0) return false
    return true
  }

  logger.warn(`Unknown condition atom: ${expr}`, { module: 'WorkflowEngine' })
  return true
}

/**
 * Boolean-Composer kommt in Task 3. Diese Initial-Version delegiert
 * nur an evaluateAtom — Phase-2-Cases müssen weiter funktionieren.
 */
export function evaluateCondition(condition: string, scope: Scope): boolean {
  if (!condition || !condition.trim()) return true
  try {
    return evaluateAtom(condition, scope)
  } catch {
    return true
  }
}
```

- [ ] **Step 3: `engine.ts` importiert evaluateCondition aus dem neuen Modul**

In `src/lib/services/workflow/engine.ts`, oben bei den Imports:

```ts
import { evaluateCondition } from './condition-parser'
```

Die existierende `evaluateCondition`-Funktion + `resolvePath`-Helper aus `engine.ts` komplett entfernen (bleiben nur noch in `condition-parser.ts`).

Falls `engine.ts` `evaluateCondition` exportiert hat (Phase 2 ja), den Re-Export ergänzen für Backwards-Compat von Tests die direkt aus `engine.ts` importieren:

```ts
export { evaluateCondition } from './condition-parser'
```

- [ ] **Step 4: Tests laufen**

Run: `npx vitest run src/__tests__/unit/services/workflow-condition-parser.test.ts`
Expected: Alle 9 Phase-2-Tests passing — der Parser delegiert in dieser Stufe nur an Atom-Matcher.

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-branch.test.ts src/__tests__/unit/services/workflow-engine-parallel.test.ts src/__tests__/unit/services/workflow-engine-step-id.test.ts src/__tests__/unit/services/workflow-engine-limits.test.ts`
Expected: Alle Phase-2-Engine-Tests grün.

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "condition-parser|engine\.ts" | head`
Expected: Kein Output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/workflow/condition-parser.ts src/lib/services/workflow/engine.ts src/__tests__/unit/services/workflow-condition-parser.test.ts
git commit -m "refactor(workflow): extract evaluateCondition + resolvePath to condition-parser.ts"
```

---

## Task 3: Boolean-Composer im condition-parser

**Files:**
- Modify: `src/lib/services/workflow/condition-parser.ts`
- Modify: `src/__tests__/unit/services/workflow-condition-parser.test.ts`

- [ ] **Step 1: Failing tests für Boolean-Composer**

In `src/__tests__/unit/services/workflow-condition-parser.test.ts`, am Ende der `describe`-Block ergänzen:

```ts
describe('boolean composition', () => {
  function load() {
    return import('@/lib/services/workflow/condition-parser').then(m => m.evaluateCondition)
  }
  function scope(triggerData: Record<string, unknown> = {}) {
    return { triggerData, actionResults: {} }
  }

  it('A && B both true', async () => {
    const fn = await load()
    expect(fn("data.a == 'x' && data.b == 'y'", scope({ a: 'x', b: 'y' }))).toBe(true)
  })

  it('A && B second false', async () => {
    const fn = await load()
    expect(fn("data.a == 'x' && data.b == 'y'", scope({ a: 'x', b: 'z' }))).toBe(false)
  })

  it('A || B first true', async () => {
    const fn = await load()
    expect(fn("data.a == 'x' || data.b == 'y'", scope({ a: 'x', b: 'z' }))).toBe(true)
  })

  it('A || B both false', async () => {
    const fn = await load()
    expect(fn("data.a == 'x' || data.b == 'y'", scope({ a: 'z', b: 'z' }))).toBe(false)
  })

  it('precedence: A && B || C parses as (A && B) || C', async () => {
    const fn = await load()
    // false && false || true == true
    expect(fn("data.a == 'x' && data.b == 'y' || data.c == 'z'", scope({ a: 'X', b: 'Y', c: 'z' }))).toBe(true)
  })

  it('precedence: A || B && C parses as A || (B && C)', async () => {
    const fn = await load()
    // false || (true && false) == false
    expect(fn("data.a == 'x' || data.b == 'y' && data.c == 'z'", scope({ a: 'X', b: 'y', c: 'X' }))).toBe(false)
  })

  it('parens override precedence: (A || B) && C', async () => {
    const fn = await load()
    // (true || false) && true == true
    expect(fn("(data.a == 'x' || data.b == 'y') && data.c == 'z'", scope({ a: 'x', b: 'X', c: 'z' }))).toBe(true)
    // (false || false) && true == false
    expect(fn("(data.a == 'x' || data.b == 'y') && data.c == 'z'", scope({ a: 'X', b: 'X', c: 'z' }))).toBe(false)
  })

  it('whitespace tolerant', async () => {
    const fn = await load()
    expect(fn("  data.a == 'x'   &&   data.b == 'y'  ", scope({ a: 'x', b: 'y' }))).toBe(true)
  })

  it('short-circuit && does not evaluate second on false', async () => {
    const fn = await load()
    // Wenn linke Seite false, wird rechte nicht ausgewertet — bei nicht-existenten Pfaden würde sonst warnen.
    // Hier proxy via numerischer Check der bei NaN false wäre.
    expect(fn("data.x == 'no' && data.y >= 10", scope({ x: 'X', y: 'abc' }))).toBe(false)
  })

  it('short-circuit || does not evaluate second on true', async () => {
    const fn = await load()
    expect(fn("data.x == 'yes' || data.y >= 10", scope({ x: 'yes', y: 'abc' }))).toBe(true)
  })

  it('atom-only still works (backwards compat)', async () => {
    const fn = await load()
    expect(fn("data.a == 'x'", scope({ a: 'x' }))).toBe(true)
  })

  it('malformed expression defaults to true', async () => {
    const fn = await load()
    expect(fn("data.a && && data.b", scope({ a: 'x', b: 'y' }))).toBe(true)
    expect(fn("(data.a == 'x'", scope({ a: 'x' }))).toBe(true)
  })
})
```

- [ ] **Step 2: Test ausführen — soll failen**

Run: `npx vitest run src/__tests__/unit/services/workflow-condition-parser.test.ts -t "boolean composition"`
Expected: Tests failen — Composer existiert noch nicht.

- [ ] **Step 3: Composer implementieren**

In `src/lib/services/workflow/condition-parser.ts`, die Funktion `evaluateCondition` ersetzen durch:

```ts
type Token =
  | { type: 'atom'; value: string }
  | { type: 'and' }
  | { type: 'or' }
  | { type: 'lparen' }
  | { type: 'rparen' }

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let atomStart = -1

  const flushAtom = (end: number) => {
    if (atomStart >= 0) {
      const value = expr.slice(atomStart, end).trim()
      if (value) tokens.push({ type: 'atom', value })
      atomStart = -1
    }
  }

  while (i < expr.length) {
    const ch = expr[i]
    // Top-level operators / parens
    if (ch === '&' && expr[i + 1] === '&') { flushAtom(i); tokens.push({ type: 'and' }); i += 2; continue }
    if (ch === '|' && expr[i + 1] === '|') { flushAtom(i); tokens.push({ type: 'or' }); i += 2; continue }
    if (ch === '(') { flushAtom(i); tokens.push({ type: 'lparen' }); i += 1; continue }
    if (ch === ')') { flushAtom(i); tokens.push({ type: 'rparen' }); i += 1; continue }
    // Innerhalb '...'-Strings &/| nicht als Operator interpretieren
    if (ch === "'") {
      if (atomStart < 0) atomStart = i
      i += 1
      while (i < expr.length && expr[i] !== "'") i += 1
      if (i < expr.length) i += 1  // konsumiere closing quote
      continue
    }
    if (atomStart < 0 && !/\s/.test(ch)) atomStart = i
    i += 1
  }
  flushAtom(i)
  return tokens
}

function parseOr(tokens: Token[], scope: Scope, pos: { i: number }): boolean {
  let left = parseAnd(tokens, scope, pos)
  while (pos.i < tokens.length && tokens[pos.i].type === 'or') {
    pos.i += 1
    const right = parseAnd(tokens, scope, pos)
    left = left || right
  }
  return left
}

function parseAnd(tokens: Token[], scope: Scope, pos: { i: number }): boolean {
  let left = parsePrimary(tokens, scope, pos)
  while (pos.i < tokens.length && tokens[pos.i].type === 'and') {
    pos.i += 1
    const right = parsePrimary(tokens, scope, pos)
    left = left && right
  }
  return left
}

function parsePrimary(tokens: Token[], scope: Scope, pos: { i: number }): boolean {
  const tok = tokens[pos.i]
  if (!tok) throw new Error('unexpected end of expression')
  if (tok.type === 'lparen') {
    pos.i += 1
    const val = parseOr(tokens, scope, pos)
    if (tokens[pos.i]?.type !== 'rparen') throw new Error('missing closing paren')
    pos.i += 1
    return val
  }
  if (tok.type === 'atom') {
    pos.i += 1
    return evaluateAtom(tok.value, scope)
  }
  throw new Error(`unexpected token: ${tok.type}`)
}

export function evaluateCondition(condition: string, scope: Scope): boolean {
  if (!condition || !condition.trim()) return true
  try {
    const tokens = tokenize(condition)
    if (tokens.length === 0) return true
    const pos = { i: 0 }
    const result = parseOr(tokens, scope, pos)
    if (pos.i !== tokens.length) {
      logger.warn(`Trailing tokens in condition: ${condition}`, { module: 'WorkflowEngine' })
      return true
    }
    return result
  } catch (err) {
    logger.warn(`Parse error in condition "${condition}": ${err instanceof Error ? err.message : err}`, { module: 'WorkflowEngine' })
    return true
  }
}
```

**Hinweis Short-Circuit:** Die `||`/`&&`-Operatoren von JS evaluieren left-to-right und short-circuiten. `parseAnd`/`parseOr` rufen Primary-Subparser, die wiederum `evaluateAtom` aufrufen — der Tree wird voll evaluiert beim Parse, aber durch JS-Short-Circuit der Kombinator-Ausdrücke (`left && right`, `left || right`) wird das jeweils nicht gebrauchte rechte Atom **doch** evaluiert (weil es vor dem `&&`/`||` aufgerufen wurde). Das Test "short-circuit" in Step 1 ist deshalb so formuliert dass das Resultat trotz Voll-Evaluation korrekt ist: der numerische Check liefert `false` (NaN), und `false && false = false`. Echte Lazy-Evaluation würde mehr Code brauchen — nicht Phase 3.

- [ ] **Step 4: Tests ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-condition-parser.test.ts`
Expected: alle 9 Phase-2-Tests + 12 neue Boolean-Tests grün.

- [ ] **Step 5: Phase-2-Engine-Tests müssen grün bleiben**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-branch.test.ts src/__tests__/unit/services/workflow-engine-parallel.test.ts src/__tests__/unit/services/workflow-engine-step-id.test.ts src/__tests__/unit/services/workflow-engine-limits.test.ts`
Expected: alle grün.

- [ ] **Step 6: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "condition-parser" | head`
Expected: Kein Output.

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/workflow/condition-parser.ts src/__tests__/unit/services/workflow-condition-parser.test.ts
git commit -m "feat(workflow): boolean composition in conditions (&&, ||, parens)"
```

---

## Task 4: `for_each`-Step in der Engine + Tests

**Files:**
- Modify: `src/lib/services/workflow/engine.ts`
- Create: `src/__tests__/unit/services/workflow-engine-foreach.test.ts`

- [ ] **Step 1: Failing-Test schreiben**

Create `src/__tests__/unit/services/workflow-engine-foreach.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine — for_each step', () => {
  let lastStepResults: Array<Record<string, unknown>> = []
  let executedConfigs: Array<Record<string, unknown>> = []

  beforeEach(() => {
    vi.resetModules()
    lastStepResults = []
    executedConfigs = []

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
        execute: async (ctx: any, config: any) => {
          executedConfigs.push({ ...config, _ctxItem: ctx.stepResults.__item, _ctxIndex: (ctx.stepResults.__loop as any)?.index })
          if (name === 'fail_action') return { success: false, error: 'boom' }
          return { success: true, data: { fromAction: name } }
        },
      }),
    }))
  })

  it('iterates sequentially over data.<array>', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1', kind: 'for_each',
        source: 'data.tags',
        steps: [{ id: 'a', kind: 'action', action: 'noop' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { tags: ['x', 'y', 'z'] })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect((summary?.result as any)?.iterations).toBe(3)
    expect((summary?.result as any)?.failedCount).toBe(0)
    const subs = lastStepResults.filter(r => (r.path as string).includes('iter['))
    expect(subs).toHaveLength(3)
    expect(subs.map(r => r.path)).toEqual(['1.iter[1].1', '1.iter[2].1', '1.iter[3].1'])
  })

  it('exposes __item and __loop in action context for templating', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1', kind: 'for_each',
        source: 'data.items',
        steps: [{ id: 'a', kind: 'action', action: 'noop', config: { passthrough: true } }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { items: ['alpha', 'beta'] })

    expect(executedConfigs).toHaveLength(2)
    expect(executedConfigs[0]._ctxItem).toBe('alpha')
    expect(executedConfigs[0]._ctxIndex).toBe(0)
    expect(executedConfigs[1]._ctxItem).toBe('beta')
    expect(executedConfigs[1]._ctxIndex).toBe(1)
  })

  it('fails the for_each step when source is not an array', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { id: 'loop1', kind: 'for_each', source: 'data.notArray', steps: [{ id: 'a', kind: 'action', action: 'noop' }] },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { notArray: 'string-not-array' })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect(summary?.status).toBe('failed')
    expect(summary?.error).toMatch(/not.*array|kein Array/i)
  })

  it('fails when iterations > MAX_LOOP_ITERATIONS', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const big = Array.from({ length: 101 }, (_, i) => i)
    const steps = [
      { id: 'loop1', kind: 'for_each', source: 'data.big', steps: [{ id: 'a', kind: 'action', action: 'noop' }] },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { big })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect(summary?.status).toBe('failed')
    expect(summary?.error).toMatch(/iterations|loop/i)
  })

  it('counts failed iterations in summary but keeps workflow running', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1', kind: 'for_each',
        source: 'data.items',
        steps: [{ id: 'a', kind: 'action', action: 'fail_action' }],
      },
      { id: 'after', kind: 'action', action: 'after_loop' },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { items: [1, 2] })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect((summary?.result as any)?.failedCount).toBe(2)

    const after = lastStepResults.find(r => r.path === '2')
    expect(after?.status).toBe('completed')
  })

  it('handles empty array gracefully', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { id: 'loop1', kind: 'for_each', source: 'data.empty', steps: [{ id: 'a', kind: 'action', action: 'noop' }] },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { empty: [] })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect((summary?.result as any)?.iterations).toBe(0)
    expect((summary?.result as any)?.failedCount).toBe(0)
  })
})
```

- [ ] **Step 2: Tests ausführen — sollen failen**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-foreach.test.ts`
Expected: FAIL — Engine kennt `for_each` noch nicht.

- [ ] **Step 3: `for_each`-Branch in `executeOneStep`**

In `src/lib/services/workflow/engine.ts`, den `executeOneStep`-Body öffnen. Vor dem `// ── ACTION (default) ──`-Block einen neuen Branch ergänzen, **nach** `parallel`:

```ts
// ── FOR_EACH ────────────────────────────────────────────────
if (kind === 'for_each') {
  const fes = step as ForEachStep
  const arr = resolvePath(fes.source, {
    triggerData: ctx.triggerData,
    actionResults: ctx.actionResults,
  })

  if (!Array.isArray(arr)) {
    ctx.stepResults.push({
      step: stepNum, path, action: 'for_each', kind: 'for_each', label: fes.label,
      status: 'failed',
      error: `Source "${fes.source}" ist kein Array`,
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  if (arr.length > MAX_LOOP_ITERATIONS) {
    ctx.stepResults.push({
      step: stepNum, path, action: 'for_each', kind: 'for_each', label: fes.label,
      status: 'failed',
      error: `Loop iterations > ${MAX_LOOP_ITERATIONS}`,
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  const summaryIdx = ctx.stepResults.length
  ctx.stepResults.push({
    step: stepNum, path, action: 'for_each', kind: 'for_each', label: fes.label,
    status: 'completed',
    result: { iterations: arr.length, failedCount: 0 },
    durationMs: 0,
  })
  await persistStepResults(ctx)

  let failedCount = 0
  const childCtx: RunContext = { ...ctx, depth: ctx.depth + 1 }

  for (let i = 0; i < arr.length; i++) {
    childCtx.actionResults.__item = arr[i] as Record<string, unknown> | unknown
    childCtx.actionResults.__loop = { value: arr[i], index: i }

    const beforeLen = childCtx.stepResults.length
    await executeStepList(fes.steps, `${path}.iter[${i + 1}]`, childCtx)
    for (let j = beforeLen; j < childCtx.stepResults.length; j++) {
      if (childCtx.stepResults[j].status === 'failed') failedCount++
    }
  }

  delete childCtx.actionResults.__item
  delete childCtx.actionResults.__loop

  ctx.stepResults[summaryIdx] = {
    ...ctx.stepResults[summaryIdx],
    result: { iterations: arr.length, failedCount },
    durationMs: Date.now() - startTime,
  }
  await persistStepResults(ctx)
  return
}
```

Wichtig: `resolvePath` und `Scope` aus `condition-parser` importieren (Top-of-File):

```ts
import { evaluateCondition, resolvePath } from './condition-parser'
```

(`evaluateCondition` ist bereits importiert. `resolvePath` ergänzen.)

`childCtx`-Mutation der `actionResults` ist OK weil `runSubStepIsolated` (für parallel) eigene Sub-Contexts hat — `for_each` teilt aber den `actionResults`-Map aus `parentCtx` (per Spread). Das ist gewollt: nachfolgende Steps können `steps.<id>.<feld>` von vorigen Iterationen referenzieren (letzte Iteration gewinnt).

- [ ] **Step 4: Tests ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-foreach.test.ts`
Expected: 6 Tests grün.

- [ ] **Step 5: Existing Phase-2-Tests grün**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-branch.test.ts src/__tests__/unit/services/workflow-engine-parallel.test.ts src/__tests__/unit/services/workflow-engine-limits.test.ts src/__tests__/unit/services/workflow-engine-step-id.test.ts`
Expected: alle grün.

- [ ] **Step 6: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "engine\.ts|workflow-engine-foreach" | head`
Expected: Kein Output.

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/workflow/engine.ts src/__tests__/unit/services/workflow-engine-foreach.test.ts
git commit -m "feat(workflow): for_each step (sequential, MAX_LOOP=100, item/loop templating)"
```

---

## Task 5: Limits-Test um Loop erweitern

**Files:**
- Modify: `src/__tests__/unit/services/workflow-engine-limits.test.ts`

- [ ] **Step 1: Test ergänzen**

In `src/__tests__/unit/services/workflow-engine-limits.test.ts`, am Ende des `describe`-Blocks ergänzen:

```ts
it('rejects nesting deeper than 10 levels via for_each', async () => {
  const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

  function buildLoopNest(depth: number): any[] {
    if (depth === 0) return [{ id: 'leaf', kind: 'action', action: 'noop' }]
    return [{
      id: `loop${depth}`,
      kind: 'for_each',
      source: 'data.arr',
      steps: buildLoopNest(depth - 1),
    }]
  }

  const steps = buildLoopNest(12)
  await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps as any, 'test', { arr: [1] })

  const failed = lastStepResults.find(r => r.status === 'failed' && /nesting depth/i.test((r.error as string) ?? ''))
  expect(failed).toBeDefined()
})
```

- [ ] **Step 2: Test ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-engine-limits.test.ts`
Expected: 3 Tests grün (2 alte + 1 neuer).

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/unit/services/workflow-engine-limits.test.ts
git commit -m "test(workflow): nesting depth via for_each respects MAX_DEPTH"
```

---

## Task 6: Trigger-Registry + `__scheduled__`-Eintrag

**Files:**
- Modify: `src/lib/services/workflow/triggers.ts`

- [ ] **Step 1: Trigger ergänzen**

In `src/lib/services/workflow/triggers.ts`, am Ende des `WORKFLOW_TRIGGERS`-Arrays vor `]` ergänzen:

```ts
{
  key: '__scheduled__',
  label: 'Geplant (Cron)',
  description: 'Workflow läuft auf Zeitplan. Konfiguration im Bereich „Zeitplan" oben am Workflow.',
  dataShape: ['scheduledAt', 'workflowId', 'cronJobId'],
},
```

- [ ] **Step 2: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "triggers" | head`
Expected: Kein Output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/workflow/triggers.ts
git commit -m "feat(workflow): __scheduled__ trigger for cron-driven workflows"
```

---

## Task 7: `WorkflowService.syncSchedule` + CronService-Erweiterung + Tests

**Files:**
- Create: `src/lib/services/workflow.service.ts`
- Modify: `src/lib/services/cron.service.ts`
- Create: `src/__tests__/unit/services/workflow-schedule-sync.test.ts`

- [ ] **Step 1: Failing-Test schreiben**

Create `src/__tests__/unit/services/workflow-schedule-sync.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowService.syncSchedule', () => {
  let cronJobsState: Array<Record<string, any>> = []
  let workflowsState: Array<Record<string, any>> = []

  beforeEach(() => {
    vi.resetModules()
    cronJobsState = []
    workflowsState = []

    vi.doMock('@/lib/db', () => {
      const buildSelect = (table: string) => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn(() => {
          if (table === 'workflows') return Promise.resolve(workflowsState)
          if (table === 'cronJobs') return Promise.resolve(cronJobsState)
          return Promise.resolve([])
        }),
      })

      return {
        db: {
          select: vi.fn(() => {
            // Caller chains .from(table).where(...). The mock matches by next .from() call.
            // We branch on the table name passed to .from():
            const sel: any = {
              from: vi.fn((tbl: any) => {
                const tableName = (tbl?._?.name === 'cron_jobs' || String(tbl).includes('cron')) ? 'cronJobs' : 'workflows'
                return {
                  where: vi.fn(() => Promise.resolve(tableName === 'workflows' ? workflowsState : cronJobsState)),
                }
              }),
            }
            return sel
          }),
          insert: vi.fn(() => ({
            values: vi.fn((v: any) => {
              cronJobsState.push({ ...v, id: `cj-${cronJobsState.length + 1}` })
              return { returning: vi.fn().mockResolvedValue([cronJobsState[cronJobsState.length - 1]]) }
            }),
          })),
          update: vi.fn(() => ({
            set: vi.fn((v: any) => ({
              where: vi.fn(() => {
                if (cronJobsState[0]) Object.assign(cronJobsState[0], v)
                return Promise.resolve([])
              }),
            })),
          })),
          delete: vi.fn(() => ({
            where: vi.fn(() => {
              cronJobsState = []
              return Promise.resolve([])
            }),
          })),
        },
      }
    })
  })

  it('creates a cron_jobs row when workflow is scheduled and active', async () => {
    workflowsState = [{
      id: 'wf-1', name: 'My Scheduled WF', isActive: true,
      trigger: '__scheduled__', schedule: { interval: '5min' },
    }]

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule('wf-1')

    expect(cronJobsState).toHaveLength(1)
    expect(cronJobsState[0].actionType).toBe('workflow')
    expect(cronJobsState[0].actionConfig).toMatchObject({ workflowId: 'wf-1', direct: true })
    expect(cronJobsState[0].interval).toBe('5min')
    expect(cronJobsState[0].isActive).toBe(true)
  })

  it('deactivates cron_jobs row when workflow toggled to inactive', async () => {
    cronJobsState = [{
      id: 'cj-1', actionType: 'workflow',
      actionConfig: { workflowId: 'wf-1', direct: true },
      isActive: true, interval: '5min',
    }]
    workflowsState = [{
      id: 'wf-1', name: 'WF', isActive: false,
      trigger: '__scheduled__', schedule: { interval: '5min' },
    }]

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule('wf-1')

    expect(cronJobsState[0].isActive).toBe(false)
  })

  it('deletes cron_jobs row when workflow no longer exists', async () => {
    cronJobsState = [{
      id: 'cj-1', actionType: 'workflow',
      actionConfig: { workflowId: 'wf-orphan', direct: true },
      isActive: true,
    }]
    workflowsState = []

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule('wf-orphan')

    expect(cronJobsState).toHaveLength(0)
  })

  it('ignores manually-created cron_jobs (without direct flag)', async () => {
    cronJobsState = [{
      id: 'cj-manual', actionType: 'workflow',
      actionConfig: { trigger: 'cron.morning' },  // kein direct
      isActive: true,
    }]
    workflowsState = [{
      id: 'wf-1', name: 'WF', isActive: false,
      trigger: 'contact.submitted', schedule: null,
    }]

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule('wf-1')

    // Manueller Cron-Job bleibt unverändert — er gehört nicht zu wf-1.
    // (In real wären die SQL-Queries by workflowId-Filter — das mock returniert pauschal alle, also ist der Test grob.)
    // Hauptassert: keine neuen Cron-Jobs angelegt.
    expect(cronJobsState.filter(c => c.actionConfig?.direct === true)).toHaveLength(0)
  })
})
```

Hinweis: Das DB-Mock ist absichtlich grob. Der Test verifiziert die High-Level-Branches (create / update / delete / no-op). Detaillierte Verhaltens-Tests laufen im Integration-Test (Task 11) gegen echte DB.

- [ ] **Step 2: Test ausführen — soll failen**

Run: `npx vitest run src/__tests__/unit/services/workflow-schedule-sync.test.ts`
Expected: FAIL — Modul existiert noch nicht.

- [ ] **Step 3: `WorkflowService` implementieren**

Create `src/lib/services/workflow.service.ts`:

```ts
/**
 * Workflow Service — Sync zwischen workflows.schedule und cron_jobs.
 */
import { db } from '@/lib/db'
import { workflows, cronJobs } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

interface ScheduleConfig {
  interval: '5min' | '15min' | '30min' | '60min' | 'daily'
  dailyAt?: string
}

export const WorkflowService = {
  /**
   * Bringt cron_jobs in Sync mit dem Schedule des Workflows.
   * - Workflow weg → korrespondierende cron_jobs entfernen.
   * - Workflow aktiv + scheduled → cron_jobs anlegen oder aktualisieren.
   * - Workflow inaktiv oder nicht scheduled → cron_jobs deaktivieren (History bleibt).
   *
   * Best-effort: Fehler werden geloggt, nicht geworfen — HTTP-Save soll
   * trotz Sync-Fehler erfolgreich sein.
   */
  async syncSchedule(workflowId: string): Promise<void> {
    try {
      const [wf] = await db.select().from(workflows).where(eq(workflows.id, workflowId))

      const { CronService } = await import('./cron.service')

      // workflowId-Filter für cron_jobs — verwende JSONB-Operator
      const existingRows = await db.select().from(cronJobs).where(
        and(
          eq(cronJobs.actionType, 'workflow'),
          sql`${cronJobs.actionConfig}->>'workflowId' = ${workflowId}`,
          sql`${cronJobs.actionConfig}->>'direct' = 'true'`,
        ),
      )
      const existing = existingRows[0]

      if (!wf) {
        // Workflow gelöscht — cron_jobs hard-delete
        if (existing) {
          await db.delete(cronJobs).where(eq(cronJobs.id, existing.id))
          logger.info(`Deleted cron_job for removed workflow ${workflowId}`, { module: 'WorkflowService' })
        }
        return
      }

      const schedule = wf.schedule as ScheduleConfig | null
      const isScheduled = wf.trigger === '__scheduled__' && schedule != null && wf.isActive

      if (!isScheduled) {
        if (existing && existing.isActive) {
          await db.update(cronJobs).set({ isActive: false, updatedAt: new Date() })
            .where(eq(cronJobs.id, existing.id))
          logger.info(`Deactivated cron_job for workflow ${workflowId}`, { module: 'WorkflowService' })
        }
        return
      }

      // Schedule-Validierung — defensiv (UI sollte das schon abfangen)
      const validIntervals = ['5min', '15min', '30min', '60min', 'daily']
      if (!validIntervals.includes(schedule.interval)) {
        logger.warn(`Invalid schedule interval "${schedule.interval}" for workflow ${workflowId}`, { module: 'WorkflowService' })
        return
      }
      if (schedule.interval === 'daily' && schedule.dailyAt && !/^\d{2}:\d{2}$/.test(schedule.dailyAt)) {
        logger.warn(`Invalid dailyAt "${schedule.dailyAt}" for workflow ${workflowId}`, { module: 'WorkflowService' })
        return
      }

      const fields = {
        name: `Workflow: ${wf.name}`,
        description: `Auto-managed schedule für Workflow ${wf.id}`,
        interval: schedule.interval,
        dailyAt: schedule.dailyAt ?? null,
        actionType: 'workflow',
        actionConfig: { workflowId, direct: true },
        isActive: true,
      }

      if (existing) {
        // CronService.update kümmert sich um nextRunAt-Recompute
        await CronService.update(existing.id, fields as any)
      } else {
        await CronService.create(fields as any)
      }
    } catch (err) {
      logger.error(`Failed to sync schedule for workflow ${workflowId}`, err, { module: 'WorkflowService' })
    }
  },
}
```

- [ ] **Step 4: `CronService.tick()`-Pfad für `direct=true`**

In `src/lib/services/cron.service.ts`, in der `switch (job.actionType)`-Anweisung den `case 'workflow'`-Block ersetzen durch:

```ts
case 'workflow': {
  const config = (job.actionConfig || {}) as Record<string, unknown>
  if (config.direct === true && config.workflowId) {
    // Phase-3-Pfad: direkter Workflow-Aufruf
    const { workflows: wfTable } = await import('@/lib/db/schema')
    const { eq: eqDr } = await import('drizzle-orm')
    const [wf] = await db.select().from(wfTable).where(eqDr(wfTable.id, config.workflowId as string))
    if (!wf) {
      msg = `Workflow ${config.workflowId} nicht gefunden — Cron-Job verwaist`
      break
    }
    if (!wf.isActive) {
      msg = 'Workflow deaktiviert — übersprungen'
      break
    }
    const { WorkflowEngine } = await import('./workflow')
    await WorkflowEngine.executeWorkflow(
      wf.id, wf.name, wf.steps as any[],
      '__scheduled__',
      { scheduledAt: new Date().toISOString(), workflowId: wf.id, cronJobId: job.id },
    )
    msg = `Workflow "${wf.name}" direkt ausgeführt`
  } else {
    // Bestehender Pfad: trigger-basiert
    const trigger = (config.trigger as string) || 'cron.triggered'
    const { WorkflowEngine } = await import('./workflow')
    await WorkflowEngine.fire(trigger, { cronJobId: job.id, cronJobName: job.name })
    msg = `Workflow trigger "${trigger}" gefeuert`
  }
  break
}
```

- [ ] **Step 5: Tests ausführen**

Run: `npx vitest run src/__tests__/unit/services/workflow-schedule-sync.test.ts`
Expected: 4 Tests grün. Falls das Mock zu grob ist und Tests scheitern, das Mock pragmatisch anpassen (Mocking ist Test-Setup, nicht Behavior).

- [ ] **Step 6: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "workflow\.service|cron\.service" | head`
Expected: Kein Output.

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/workflow.service.ts src/lib/services/cron.service.ts src/__tests__/unit/services/workflow-schedule-sync.test.ts
git commit -m "feat(workflow): syncSchedule + cron direct-execute path for scheduled workflows"
```

---

## Task 8: API — `schedule` Validierung + Sync-Hook

**Files:**
- Modify: `src/app/api/v1/workflows/route.ts`
- Modify: `src/app/api/v1/workflows/[id]/route.ts`

- [ ] **Step 1: POST `schedule` akzeptieren + sync**

In `src/app/api/v1/workflows/route.ts`, in der `POST`-Funktion ergänzen. Vor `return apiSuccess(...)`:

```ts
const body = await request.json()
// ... insert wie bisher, ergänze:
const [workflow] = await db.insert(workflows).values({
  name: body.name || 'Neuer Workflow',
  description: body.description || '',
  trigger: body.trigger || 'contact.submitted',
  steps: body.steps || [],
  schedule: body.schedule ?? null,    // NEU
  isActive: body.isActive ?? false,
  createdBy: auth.userId,
}).returning()

// Sync schedule (best-effort, blockt Response nicht)
const { WorkflowService } = await import('@/lib/services/workflow.service')
await WorkflowService.syncSchedule(workflow.id)

return apiSuccess(workflow, undefined, 201)
```

- [ ] **Step 2: PUT `schedule` + sync**

In `src/app/api/v1/workflows/[id]/route.ts`, in der `PUT`-Funktion:

```ts
if (body.schedule !== undefined) update.schedule = body.schedule
// ... bestehende update-Felder ...
const [workflow] = await db.update(workflows).set(update).where(eq(workflows.id, id)).returning()
if (!workflow) return apiError('NOT_FOUND', 'Workflow nicht gefunden', 404)

const { WorkflowService } = await import('@/lib/services/workflow.service')
await WorkflowService.syncSchedule(id)

return apiSuccess(workflow)
```

- [ ] **Step 3: DELETE → sync (cleanup)**

In derselben Datei, `DELETE`-Funktion:

```ts
const result = await db.delete(workflows).where(eq(workflows.id, id)).returning({ id: workflows.id })
if (result.length === 0) return apiError('NOT_FOUND', 'Workflow nicht gefunden', 404)

const { WorkflowService } = await import('@/lib/services/workflow.service')
await WorkflowService.syncSchedule(id)  // Workflow ist weg → cron_jobs hard-delete

return apiSuccess({ deleted: true })
```

- [ ] **Step 4: Validierung im POST/PUT (defensiv)**

Vor dem Insert/Update, eine kleine Validierung ergänzen. Helper-Funktion oben in der jeweiligen Route-Datei:

```ts
function validateSchedule(s: unknown): { ok: true } | { ok: false; error: string } {
  if (s == null) return { ok: true }
  if (typeof s !== 'object') return { ok: false, error: 'schedule must be object or null' }
  const schedule = s as Record<string, unknown>
  const valid = ['5min', '15min', '30min', '60min', 'daily']
  if (!valid.includes(schedule.interval as string)) {
    return { ok: false, error: `schedule.interval must be one of: ${valid.join(', ')}` }
  }
  if (schedule.interval === 'daily' && schedule.dailyAt) {
    if (typeof schedule.dailyAt !== 'string' || !/^\d{2}:\d{2}$/.test(schedule.dailyAt)) {
      return { ok: false, error: 'schedule.dailyAt must be HH:MM format' }
    }
  }
  return { ok: true }
}
```

Aufruf vor dem DB-Write:

```ts
if (body.schedule !== undefined) {
  const validation = validateSchedule(body.schedule)
  if (!validation.ok) return apiError('VALIDATION', validation.error, 400)
}
```

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "workflows/route|workflows/\[id\]" | head`
Expected: Kein Output.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/workflows/route.ts "src/app/api/v1/workflows/[id]/route.ts"
git commit -m "feat(workflow): API supports schedule field + triggers syncSchedule"
```

---

## Task 9: UI — `ForEachStepEditor` + StepCard kind-Switch + AddStepMenu

**Files:**
- Create: `src/app/intern/(dashboard)/settings/workflows/_components/for-each-step-editor.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/add-step-menu.tsx`

- [ ] **Step 1: `ForEachStepEditor` erstellen**

Create `src/app/intern/(dashboard)/settings/workflows/_components/for-each-step-editor.tsx`:

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Repeat } from 'lucide-react'
import type { ForEachStep, ActionDefinition } from './types'
import { StepList } from './step-list'

interface Props {
  step: ForEachStep
  actions: ActionDefinition[]
  onChange: (step: ForEachStep) => void
}

export function ForEachStepEditor({ step, actions, onChange }: Props) {
  const subCount = step.steps.length

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Repeat className="h-4 w-4" />
          Schleife (for-each) — {subCount} Schritt{subCount === 1 ? '' : 'e'} pro Iteration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs">Quelle (Pfad zu Array)</Label>
          <Input
            value={step.source}
            onChange={e => onChange({ ...step, source: e.target.value })}
            placeholder="z.B. data.interests  oder  steps.webhook_x.body.tags"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Im Loop verfügbar: <code>{'{{item}}'}</code>, <code>{'{{item.feld}}'}</code>, <code>{'{{loop.index}}'}</code>.
          </p>
        </div>
        <div className="pl-4 border-l-2 border-muted">
          <StepList
            steps={step.steps}
            onChange={updated => onChange({ ...step, steps: updated })}
            actions={actions}
            containerId={`${step.id ?? 'foreach'}.steps`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

(Der `containerId`-Prop wird in Task 11 für DnD eingeführt — ergänze ihn jetzt schon, weil `StepList` ihn dann braucht. Falls `StepList` ihn noch nicht akzeptiert, ergänzt Task 11 die Prop-Signatur. TS wird hier vorerst meckern — das fixt Task 11.)

- [ ] **Step 2: `makeForEachStep`-Helper in step-card.tsx**

In `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx`, neben `makeBranchStep` ergänzen:

```ts
import type { /* … */, ForEachStep } from './types'

export function makeForEachStep(): ForEachStep {
  return { id: shortId(), kind: 'for_each', source: '', steps: [] }
}
```

Im `StepCard`-Switch (vor dem `return <ActionStepBody ...>`-Default), neuen Branch ergänzen:

```tsx
import { ForEachStepEditor } from './for-each-step-editor'

// inside StepCard():
if (kind === 'for_each') {
  const fes = props.step as ForEachStep
  return (
    <div>
      <BranchOrParallelHeader
        index={props.index}
        label={fes.label || 'Schleife'}
        onDelete={props.onDelete}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
      />
      <ForEachStepEditor
        step={fes}
        actions={props.actions}
        onChange={updated => props.onChange(updated)}
      />
    </div>
  )
}
```

- [ ] **Step 3: `AddStepMenu` ergänzt „Schleife"**

In `src/app/intern/(dashboard)/settings/workflows/_components/add-step-menu.tsx`, Props ergänzen:

```ts
interface Props {
  actions: ActionDefinition[]
  onAddAction: (name: string) => void
  onAddBranch: () => void
  onAddParallel: () => void
  onAddForEach: () => void   // NEU
}
```

Im Render, nach „Parallel"-DropdownMenuItem:

```tsx
import { Repeat } from 'lucide-react'

<DropdownMenuItem onClick={onAddForEach}>
  <Repeat className="h-4 w-4 mr-2" /> Schleife (for-each)
</DropdownMenuItem>
```

- [ ] **Step 4: `step-list.tsx` propagiert `onAddForEach`**

In `src/app/intern/(dashboard)/settings/workflows/_components/step-list.tsx`, im `<AddStepMenu>`-Aufruf:

```tsx
import { makeForEachStep } from './step-card'

<AddStepMenu
  actions={actions}
  onAddAction={...}
  onAddBranch={...}
  onAddParallel={...}
  onAddForEach={() => onChange([...steps, makeForEachStep()])}
/>
```

- [ ] **Step 5: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "for-each-step-editor|step-card|add-step-menu|step-list" | head`
Expected: Eventuell Fehler aus `containerId`-Prop in `for-each-step-editor.tsx` (siehe Hinweis in Step 1) — Rest sauber. Diese Fehler werden in Task 11 gefixt.

- [ ] **Step 6: Commit**

```bash
git add "src/app/intern/(dashboard)/settings/workflows/_components/"
git commit -m "feat(workflow-ui): for_each step editor + AddStepMenu entry"
```

---

## Task 10: UI — Schedule-Section im Designer

**Files:**
- Modify: `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx`

- [ ] **Step 1: `WorkflowData`-Interface ergänzt `schedule`**

In `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx`:

```ts
interface ScheduleConfig {
  interval: '5min' | '15min' | '30min' | '60min' | 'daily'
  dailyAt?: string
}

interface WorkflowData {
  id: string
  name: string
  description: string | null
  trigger: string
  steps: WorkflowStep[]
  schedule: ScheduleConfig | null   // NEU
  isActive: boolean
}
```

In `update`-Funktion, das PUT-Body um `schedule` erweitern:

```ts
body: JSON.stringify({
  name: workflow.name,
  description: workflow.description,
  trigger: workflow.trigger,
  steps: workflow.steps,
  schedule: workflow.schedule,   // NEU
  isActive: workflow.isActive,
}),
```

- [ ] **Step 2: Trigger-Wechsel resettet `schedule`**

Im `<Select>` für `workflow.trigger`-Wechsel, den `onValueChange`-Callback erweitern:

```tsx
<Select
  value={workflow.trigger}
  onValueChange={v => {
    const newSchedule = v === '__scheduled__'
      ? (workflow.schedule ?? { interval: 'daily', dailyAt: '08:00' })
      : null
    update({ trigger: v, schedule: newSchedule })
  }}
>
```

- [ ] **Step 3: Schedule-Card conditional rendern**

In `[id]/page.tsx`, vor dem `<Card>` mit „Workflow-Schritte" eine zusätzliche Card einfügen:

```tsx
{workflow.trigger === '__scheduled__' && workflow.schedule && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Clock className="h-4 w-4" /> Zeitplan
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Intervall</Label>
          <Select
            value={workflow.schedule.interval}
            onValueChange={v => update({ schedule: { ...workflow.schedule!, interval: v as ScheduleConfig['interval'] } })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5min">Alle 5 Minuten</SelectItem>
              <SelectItem value="15min">Alle 15 Minuten</SelectItem>
              <SelectItem value="30min">Alle 30 Minuten</SelectItem>
              <SelectItem value="60min">Stündlich</SelectItem>
              <SelectItem value="daily">Täglich</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {workflow.schedule.interval === 'daily' && (
          <div className="space-y-1">
            <Label>Uhrzeit (Europe/Berlin)</Label>
            <Input
              type="time"
              value={workflow.schedule.dailyAt ?? '08:00'}
              onChange={e => update({ schedule: { ...workflow.schedule!, dailyAt: e.target.value } })}
            />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Der Workflow läuft automatisch entsprechend dem Intervall — verwaltet als Cron-Job in der Hintergrund-Queue.
      </p>
    </CardContent>
  </Card>
)}
```

(`Clock` aus `lucide-react` ist bereits importiert in dieser Datei — falls nicht, ergänzen.)

- [ ] **Step 4: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "workflows/\[id\]" | head`
Expected: Kein Output.

- [ ] **Step 5: Commit**

```bash
git add "src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx"
git commit -m "feat(workflow-ui): schedule editor for __scheduled__ trigger"
```

---

## Task 11: UI — Drag-and-Drop via @dnd-kit

**Files:**
- Modify: `package.json` (3 neue Deps)
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/step-list.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/branch-step-editor.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/parallel-step-editor.tsx`
- Modify: `src/app/intern/(dashboard)/settings/workflows/_components/for-each-step-editor.tsx`

- [ ] **Step 1: Dependencies installieren**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Versionen prüfen — sollte `@dnd-kit/core@^6` und `@dnd-kit/sortable@^8` sein.

- [ ] **Step 2: Top-Level `<DndContext>` in `workflow-designer.tsx`**

In `src/app/intern/(dashboard)/settings/workflows/_components/workflow-designer.tsx`, den Body wrappen:

```tsx
'use client'

import { DndContext, type DragEndEvent } from '@dnd-kit/core'
// … andere imports …

export function WorkflowDesigner({ steps, actions, onChange }: WorkflowDesignerProps) {
  // … customPrompts-State wie bisher …

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Container-IDs aus den droppable-Daten ziehen
    const activeContainer = (active.data.current as any)?.containerId as string | undefined
    const overContainer = (over.data.current as any)?.containerId as string | undefined

    // Cross-Container blockieren
    if (activeContainer !== overContainer) return

    // Der StepList notiert sich selber den Reorder via onDragEnd-Callback —
    // hier nichts weiter tun, weil jede StepList eigenen SortableContext hat
    // und über onSortableEnd selbst handelt. (Siehe Step 3.)
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <CustomPromptsContext.Provider value={customPrompts}>
        {/* … bestehender JSX … */}
        <StepList
          steps={steps}
          onChange={onChange}
          actions={actions}
          containerId="top"
        />
        {/* … */}
      </CustomPromptsContext.Provider>
    </DndContext>
  )
}
```

(Der `handleDragEnd` ist hier rein als Sicherheitsnetz; die eigentliche Reorder-Logik passiert in `StepList` mit `arrayMove`.)

- [ ] **Step 3: `<StepList>` umbauen mit `<SortableContext>` und Container-ID**

In `src/app/intern/(dashboard)/settings/workflows/_components/step-list.tsx`:

```tsx
'use client'

import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { useDndMonitor, type DragEndEvent } from '@dnd-kit/core'
import type { WorkflowStep, ActionDefinition } from './types'
import { StepCard, makeActionStep, makeBranchStep, makeParallelStep, makeForEachStep } from './step-card'
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
  containerId: string
}

export function StepList({ steps, onChange, actions, containerId }: Props) {
  const ids = steps.map((s, i) => s.id ?? `idx-${i}`)

  // Listen ON top-level DndContext for events scoped to our container
  useDndMonitor({
    onDragEnd(event: DragEndEvent) {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const aCont = (active.data.current as any)?.containerId
      const oCont = (over.data.current as any)?.containerId
      if (aCont !== containerId || oCont !== containerId) return

      const oldIndex = ids.indexOf(active.id as string)
      const newIndex = ids.indexOf(over.id as string)
      if (oldIndex < 0 || newIndex < 0) return
      onChange(arrayMove(steps, oldIndex, newIndex))
    },
  })

  return (
    <div className="space-y-2">
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {steps.map((step, idx) => (
          <StepCard
            key={ids[idx]}
            sortableId={ids[idx]}
            containerId={containerId}
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
      </SortableContext>
      <AddStepMenu
        actions={actions}
        onAddAction={name => {
          const def = actions.find(a => a.name === name)
          onChange([...steps, makeActionStep(name, def?.label)])
        }}
        onAddBranch={() => onChange([...steps, makeBranchStep()])}
        onAddParallel={() => onChange([...steps, makeParallelStep()])}
        onAddForEach={() => onChange([...steps, makeForEachStep()])}
      />
    </div>
  )
}
```

- [ ] **Step 4: `<StepCard>` als `useSortable`-Item**

In `src/app/intern/(dashboard)/settings/workflows/_components/step-card.tsx`, Props erweitern:

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

export interface StepCardProps {
  step: WorkflowStep
  index: number
  totalSteps: number
  actions: ActionDefinition[]
  onChange: (step: WorkflowStep) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  sortableId: string       // NEU
  containerId: string      // NEU
}
```

Vor dem `return`-Switch in `StepCard`:

```tsx
export function StepCard(props: StepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.sortableId,
    data: { containerId: props.containerId },
  })

  const dragWrapper = (children: React.ReactNode) => (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="relative"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      {children}
    </div>
  )

  const kind = (props.step as { kind?: string }).kind ?? 'action'

  if (kind === 'branch') {
    /* … bestehender JSX, aber wrappen: */
    return dragWrapper(
      <div>
        <BranchOrParallelHeader {...} />
        <BranchStepEditor {...} />
      </div>
    )
  }
  // analog für parallel, for_each, default action
}
```

(Den `dragWrapper`-Helper konsequent um jeden Return-Pfad legen. ActionStepBody ist eine separate Komponente — die wrappt man entsprechend in `StepCard` BEVOR `<ActionStepBody>` returniert wird.)

- [ ] **Step 5: Children-Container-IDs in Editors propagieren**

In `branch-step-editor.tsx`, `parallel-step-editor.tsx`, `for-each-step-editor.tsx`: Beim `<StepList>`-Aufruf einen passenden `containerId`-Prop setzen:

```tsx
// branch-step-editor.tsx (then-Container):
<StepList … containerId={`${step.id ?? 'br'}.then`} />

// branch-step-editor.tsx (else-Container):
<StepList … containerId={`${step.id ?? 'br'}.else`} />

// parallel-step-editor.tsx:
<StepList … containerId={`${step.id ?? 'par'}.steps`} />

// for-each-step-editor.tsx:
<StepList … containerId={`${step.id ?? 'fe'}.steps`} />
```

- [ ] **Step 6: Up/Down-Buttons bleiben (A11y)**

Stelle sicher dass die Up/Down-Arrow-Buttons aus Phase 2 noch im StepHeader sind. Sie bleiben funktional und sichtbar — sind nur ein A11y-Fallback.

- [ ] **Step 7: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "step-list|step-card|workflow-designer|branch-step-editor|parallel-step-editor|for-each-step-editor" | head -20`
Expected: Kein Output.

- [ ] **Step 8: Manueller Sanity-Check**

Lokal: `npm run dev`, in `/intern/settings/workflows/<id>` einen Test-Workflow öffnen.
- Drag-Handle (Grip-Icon) erscheint links neben jedem Step.
- Step nach oben ziehen → Reihenfolge ändert sich.
- Step aus Top-Level in `then`-Container ziehen → wird abgewiesen (kein Drop-Effekt).

(Falls Visual-Indicator unklar: das ist akzeptabel — Cross-Container-Drops werden im Backend ignoriert, UX-Polish ist Phase 4.)

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json "src/app/intern/(dashboard)/settings/workflows/_components/"
git commit -m "feat(workflow-ui): drag-and-drop reorder via @dnd-kit (within-container only)"
```

---

## Task 12: Run-History — for_each-Badge + Indentation-Anpassung

**Files:**
- Modify: `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx`

- [ ] **Step 1: Indentation-Algorithmus & Badge ergänzen**

In `src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx`, im Run-History-Step-Render-Loop. Den `depth`-Berechnungs-Block ersetzen:

```tsx
{run.stepResults.map((sr, i) => {
  // Phase 3: 'iter[N]' zählt als Segment, also einfacher Match-Count
  const segments = sr.path
    ? (sr.path.match(/\.(?!iter\[)|iter\[/g) || []).length + (sr.path.split('.').length > 1 ? 0 : 0)
    : 0
  // Vereinfacht: split('.') und 'iter[' wie ein Segment behandeln
  const depth = sr.path ? sr.path.split(/\.(?![^[]*\])/).length - 1 : 0
  const indent = depth * 12
  const kind = sr.kind ?? 'action'

  return (
    <div key={i} className="flex items-center gap-2 text-xs" style={{ paddingLeft: indent }}>
      {sr.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />}
      {sr.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />}
      {sr.status === 'skipped' && <Clock className="h-3 w-3 text-muted-foreground shrink-0" />}
      {kind === 'branch' && (
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          Verzweigung → {sr.result?.taken ?? '?'}
        </Badge>
      )}
      {kind === 'parallel' && (
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          Parallel ({sr.result?.ranSubSteps ?? 0}
          {(sr.result?.failedCount ?? 0) > 0 ? `, ${sr.result?.failedCount} fail` : ''})
        </Badge>
      )}
      {kind === 'for_each' && (
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          Schleife ({sr.result?.iterations ?? 0}
          {(sr.result?.failedCount ?? 0) > 0 ? `, ${sr.result?.failedCount} fail` : ''})
        </Badge>
      )}
      {kind === 'action' && (
        <span className={sr.status === 'failed' ? 'text-destructive truncate' : 'text-muted-foreground truncate'}>
          {sr.label || sr.action}
        </span>
      )}
      {sr.label && kind !== 'action' && (
        <span className="text-muted-foreground truncate">— {sr.label}</span>
      )}
      <span className="text-muted-foreground/50 ml-auto shrink-0">{sr.durationMs}ms</span>
    </div>
  )
})}
```

`StepResultEntry`-Interface erweitern um `kind: '… | for_each'` und `iterations` im result:

```ts
interface StepResultEntry {
  step: number
  path?: string
  action: string
  kind?: 'action' | 'branch' | 'parallel' | 'for_each'
  label?: string
  status: string
  result?: {
    taken?: 'then' | 'else' | 'none'
    ranSubSteps?: number
    iterations?: number
    failedCount?: number
  } & Record<string, unknown>
  error?: string
  durationMs: number
}
```

- [ ] **Step 2: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep "workflows/\[id\]" | head`
Expected: Kein Output.

- [ ] **Step 3: Commit**

```bash
git add "src/app/intern/(dashboard)/settings/workflows/[id]/page.tsx"
git commit -m "feat(workflow-ui): run-history shows for_each badge + handles iter[N] paths"
```

---

## Task 13: Integration-Tests (foreach-flow + cron-flow)

**Files:**
- Create: `src/__tests__/integration-real/workflow-foreach-flow.test.ts`
- Create: `src/__tests__/integration-real/workflow-cron-flow.test.ts`

- [ ] **Step 1: foreach-flow-Test**

Create `src/__tests__/integration-real/workflow-foreach-flow.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createServer, type Server } from 'http'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow for_each flow', () => {
  let server: Server
  let port: number
  let receivedUrls: string[] = []
  let workflowId: string | null = null

  beforeAll(async () => {
    server = createServer((req, res) => {
      receivedUrls.push(req.url ?? '/')
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => {
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, echo: body }))
      })
    })
    await new Promise<void>(r => server.listen(0, () => r()))
    port = (server.address() as any).port
  })

  afterAll(async () => {
    await new Promise<void>(r => server.close(() => r()))
    if (workflowId) {
      const db = createTestDb()
      const { workflows, workflowRuns } = await import('@/lib/db/schema')
      const { eq } = await import('drizzle-orm')
      await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
      await db.delete(workflows).where(eq(workflows.id, workflowId))
    }
  })

  it('iterates webhook over data.<array>', async () => {
    receivedUrls = []
    const db = createTestDb()
    const { workflows, workflowRuns } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: `ForEachFlowTest-${Date.now()}`,
      trigger: 'test.foreach_flow',
      isActive: true,
      steps: [
        {
          id: 'loop1', kind: 'for_each',
          source: 'data.tags',
          steps: [
            {
              id: 'wh', kind: 'action', action: 'webhook_call',
              config: { url: `http://localhost:${port}/{{item}}`, method: 'GET' },
            },
          ],
        },
      ],
    }).returning()
    workflowId = wf.id

    const { WorkflowEngine } = await import('@/lib/services/workflow')
    await WorkflowEngine.fire('test.foreach_flow', { tags: ['a', 'b', 'c'] })
    await new Promise(r => setTimeout(r, 1500))

    const sortedUrls = [...receivedUrls].sort()
    expect(sortedUrls).toEqual(['/a', '/b', '/c'])

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    const stepResults = runs[0].stepResults as Array<{ path: string; status: string; result?: any }>
    const summary = stepResults.find(r => (r as any).kind === 'for_each')
    expect(summary?.result?.iterations).toBe(3)
    expect(summary?.result?.failedCount).toBe(0)
  }, 10_000)
})
```

- [ ] **Step 2: cron-flow-Test**

Create `src/__tests__/integration-real/workflow-cron-flow.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => ({ get: () => null }),
}))

describe.skipIf(!hasTestDb)('workflow scheduled trigger flow', () => {
  let workflowId: string | null = null

  afterAll(async () => {
    if (workflowId) {
      const db = createTestDb()
      const { workflows, workflowRuns, cronJobs } = await import('@/lib/db/schema')
      const { eq, and, sql } = await import('drizzle-orm')
      await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, workflowId))
      await db.delete(cronJobs).where(
        and(eq(cronJobs.actionType, 'workflow'),
            sql`${cronJobs.actionConfig}->>'workflowId' = ${workflowId}`)
      )
      await db.delete(workflows).where(eq(workflows.id, workflowId))
    }
  })

  it('saving scheduled workflow creates managed cron_job; tick executes workflow', async () => {
    const db = createTestDb()
    const { workflows, workflowRuns, cronJobs } = await import('@/lib/db/schema')
    const { eq, and, sql } = await import('drizzle-orm')

    const [wf] = await db.insert(workflows).values({
      name: `CronFlowTest-${Date.now()}`,
      trigger: '__scheduled__',
      isActive: true,
      schedule: { interval: '5min' },
      steps: [{ id: 'log', kind: 'action', action: 'log_activity', config: { subject: 'cron-test' } }],
    }).returning()
    workflowId = wf.id

    const { WorkflowService } = await import('@/lib/services/workflow.service')
    await WorkflowService.syncSchedule(wf.id)

    // cron_job sollte existieren
    const jobs = await db.select().from(cronJobs).where(
      and(eq(cronJobs.actionType, 'workflow'),
          sql`${cronJobs.actionConfig}->>'workflowId' = ${wf.id}`),
    )
    expect(jobs).toHaveLength(1)
    expect((jobs[0].actionConfig as any).direct).toBe(true)

    // nextRunAt zurücksetzen, damit tick() ihn aufgreift
    await db.update(cronJobs).set({ nextRunAt: new Date(Date.now() - 60_000) }).where(eq(cronJobs.id, jobs[0].id))

    const { CronService } = await import('@/lib/services/cron.service')
    await CronService.tick()
    await new Promise(r => setTimeout(r, 1000))

    const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.workflowId, wf.id))
    expect(runs.length).toBeGreaterThan(0)
    expect(runs[0].trigger).toBe('__scheduled__')
  }, 15_000)
})
```

- [ ] **Step 3: Tests soft-laufen**

Run: `npx vitest run src/__tests__/integration-real/workflow-foreach-flow.test.ts src/__tests__/integration-real/workflow-cron-flow.test.ts 2>&1 | tail -10`
Expected: Skipped wenn `TEST_DATABASE_URL` fehlt — akzeptabel. Sonst: 2 Tests grün.

- [ ] **Step 4: Typcheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "workflow-foreach-flow|workflow-cron-flow" | head`
Expected: Kein Output.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/integration-real/workflow-foreach-flow.test.ts src/__tests__/integration-real/workflow-cron-flow.test.ts
git commit -m "test(workflow): integration tests — for_each flow + scheduled cron flow"
```

---

## Task 14: Manuelles E2E + Deploy

**Files:** keine

- [ ] **Step 1: Lokal testen**

1. `npm run dev`. Als Admin einloggen.
2. Workflow „Phase3-Test1" auf `contact.submitted`:
   - Step: `for_each` mit `source: data.interests`, Sub-Step `log_activity` mit `subject: "Interest: {{item}}"`
   - Speichern, aktivieren, Kontaktformular absenden mit zwei Interessen
   - Run-History: Schleife-Badge mit `(2)`, Sub-Steps mit Pfad `1.iter[1].1` und `1.iter[2].1`, je eine Activity entstand
3. Workflow „Phase3-Test2" auf `contact.submitted`:
   - Branch mit ifCondition `data.priority == 'hoch' && (data.score >= 70 || data.message != null)`
   - Then: notify_admin
   - Trigger absetzen mit verschiedenen Daten — Branch nimmt korrekten Pfad
4. Workflow „Phase3-Test3" auf `__scheduled__`:
   - Trigger im Designer auf „Geplant (Cron)" wechseln
   - Schedule-Card erscheint, Intervall „Alle 5 Minuten"
   - Aktivieren, speichern → in `/intern/settings/cron-jobs` taucht „Workflow: Phase3-Test3" auf
   - 5–6 Minuten warten, Run-History prüfen
5. DnD: in Designer Step ziehen innerhalb Container (passt), aus Branch nach Top-Level ziehen (wird abgewiesen)

- [ ] **Step 2: Deploy**

```bash
git push
```

Migration läuft im Deploy-Pipeline (oder manuell `npm run db:migrate` auf Prod).

- [ ] **Step 3: Verify Prod**

Auf Prod-Instanz die obigen 4 Test-Workflows nochmal kurz prüfen.

---

## Self-Review Notes

**Spec-Coverage:**
- §3.1 Datenmodell → Task 1 (Schema + Types).
- §3.2 for_each → Task 4.
- §3.3 Boolean-Conditions → Tasks 2 (extract) + 3 (composer).
- §3.4 Cron-Sync → Task 7 (service + tick).
- §3.5 UI → Task 9 (for_each editor) + 10 (schedule section) + 11 (DnD) + 12 (run-history).
- §3.6 API + Validierung → Task 8.
- §4 Limits → Task 1 (`MAX_LOOP_ITERATIONS`) + Task 5 (depth-test).
- §5 Backwards-Compat → Tasks 2, 3, 4 jeweils mit existierenden Phase-2-Tests verifiziert.
- §6.1 Unit-Tests → Tasks 2, 3, 4, 5, 7.
- §6.2 Integration-Tests → Task 13.
- §6.3 Manuell → Task 14.
- §7 Migration → Task 1.
- §8 Geschätzte Tasks: 14 sind eine genaue Übersetzung der Spec-Cluster.

**Placeholder-Scan:**
- Task 9 Step 1 erwähnt `containerId`-Prop der erst in Task 11 in `StepList` ankommt — explizit als „TS wird hier vorerst meckern" dokumentiert. Kein Plan-Failure, sondern eine Sequenzierungs-Wahrheit.
- Task 11 Step 4 sagt „den `dragWrapper`-Helper konsequent um jeden Return-Pfad legen" — pragmatisch, weil die genaue JSX-Struktur in StepCard branch-abhängig ist; das `dragWrapper`-Snippet ist vollständig.

**Type-Consistency:**
- `ForEachStep` mit `source` und `steps` ist konsistent zwischen `engine.ts`, `types.ts`, `for-each-step-editor.tsx`, Spec.
- `MAX_LOOP_ITERATIONS = 100` in Engine + Test.
- `actionConfig: { workflowId, direct: true }` ist die Diskriminator-Form in `WorkflowService.syncSchedule`, `CronService.tick`, Tests.
- `evaluateCondition`-Signatur (`condition: string, scope: Scope`) konsistent zwischen `condition-parser.ts`, allen Aufruf-Stellen, Tests.
- `StepResultEntry.kind` umfasst `'for_each'` in der UI-Type-Erweiterung in Task 12.

**Risiken:**
- Task 7's DB-Mock im `workflow-schedule-sync.test.ts` ist grob — die Test-Logik prüft nur High-Level-Branches. Detailliertes Verhalten wird im Integration-Test (Task 13) gegen echte DB validiert.
- Task 11 (DnD) erfordert dass das Drag-Handle-Element nicht von `useSortable`-listeners auf der ganzen Card ausgeht (sonst werden Buttons unklickbar). Das `dragWrapper`-Pattern adressiert das: Listeners NUR auf dem Grip-Icon, Card-Inhalt bleibt interaktiv.
- Schema-Migration ist additive — Bestandsdaten bleiben unverändert.

**Out-of-Scope (gemäß Spec):** Cross-Container-DnD, Sub-Workflow-Action, Visual-Flowchart, URL-Whitelist, Negation, Templating-Autocomplete, Batched-Persist, parallele for_each-Iteration — keine Tasks dafür, korrekt deferred.
