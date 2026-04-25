# Workflow-Erweiterung Phase 2 — Conditional-Branch + Parallel/Fan-out

**Status:** approved (brainstorming)
**Datum:** 2026-04-25
**Kontext:** Phase 1 lieferte `webhook_call`-Action und 10 Trigger-Events. Steps sind heute eine flache Sequenz, ein `condition`-Feld auf Action-Steps skipt nur den einzelnen Step. Phase 2 erweitert das Datenmodell um echte Verzweigungs- und Parallel-Container, refactort die Engine zu rekursivem Step-Walking und erweitert die Condition-Sprache.

## 1. Ziel

1. Workflows können verzweigen: `if <condition> then <steps> else <steps>`.
2. Workflows können parallelisieren: mehrere Sub-Steps starten gleichzeitig (`Promise.allSettled`).
3. Conditions können auf Step-Results zugreifen, nicht nur Trigger-Data.
4. Beliebige Verschachtelung erlaubt.
5. Bestandsworkflows (Phase-1-Ära) bleiben rückwärtskompatibel — kein Migrations-Job.

## 2. Scope

**In scope:**
- Step-Type-Diskriminator `kind: 'action' | 'branch' | 'parallel'` (default `'action'`).
- `BranchStep` mit `ifCondition`, `then[]`, optional `else[]`.
- `ParallelStep` mit `steps[]`, `Promise.allSettled`-Semantik.
- Engine-Refactor: rekursive `executeStepList` + `executeOneStep`.
- `evaluateCondition`-Erweiterung: 8 Patterns insgesamt, Step-Result-Pfade (`steps.<id>.<nested>`), Operatoren `>=`, `<=`, `<` zusätzlich.
- Step-Results bekommen `path`-Feld für UI-Indentation. Flache Liste, keine Nesting im Storage.
- UI-Editor: rekursive `<StepList>`-Komponente, Container-Cards für Branch/Parallel, Add-Step-Menü mit drei Bereichen.
- Run-History-UI: Indentation per Path-Tiefe, spezielle Badges für Branch/Parallel.
- Recursion-Depth-Limit (10) und Parallel-Sub-Step-Limit (100) defensiv.

**Out of scope (Phase 3):**
- Visual flowchart-Editor (React Flow).
- Drag-and-Drop zwischen Containern.
- Komplexe Conditions (`(a && b) || c`).
- Loop-Steps (`for_each`).
- Sub-Workflow-Action.
- URL-Whitelist (SSRF-Schutz für `webhook_call`).
- Batched-Persist für `workflow_runs.stepResults` (Performance).

## 3. Architektur

### 3.1 Datenmodell

In `src/lib/services/workflow/engine.ts`:

```ts
type StepKind = 'action' | 'branch' | 'parallel'

interface BaseStep {
  id?: string
  label?: string
  /** Skip-Verhalten — nur auf Action-Steps relevant. Branch hat eigenes ifCondition. */
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

export type WorkflowStep = ActionStep | BranchStep | ParallelStep
```

**Step-Result mit Path:**

```ts
interface StepResult {
  step: number       // 1-based, läuft auch über Sub-Steps weiter (globale Sequence).
  path: string       // z.B. '1', '2.then.1', '3.parallel.2'.
  action: string     // Bei Branch/Parallel: 'branch' bzw. 'parallel'.
  kind: StepKind
  label?: string
  status: 'completed' | 'failed' | 'skipped'
  result?: Record<string, unknown>
  error?: string
  durationMs: number
}
```

Branch-Step pusht zusätzlich vor seinen Sub-Steps ein eigenes Result mit `kind: 'branch'` und `result: { taken: 'then' | 'else' | 'none' }`. Parallel analog mit `result: { ranSubSteps, failedCount }`.

**Schema-Migration:** keine. `steps` und `stepResults` sind `jsonb` — strukturelle Änderungen migrationsfrei.

### 3.2 Engine-Refactor

Heutiger linearer Loop in `executeWorkflow` wird in zwei Funktionen aufgeteilt:

- `executeStepList(steps, basePath, ctx)` — iteriert über Step-Array, baut path, ruft `executeOneStep`.
- `executeOneStep(step, path, ctx)` — switch auf `kind`:
  - `'branch'`: Condition evaluieren, Sub-Liste (`then` oder `else`) per `executeStepList` aufrufen.
  - `'parallel'`: `Promise.allSettled` über alle Sub-Steps in isolierten Sub-Contexts; danach Sub-Results in deterministischer Index-Reihenfolge in das Top-Level `stepResults`-Array gepusht.
  - `'action'` (default): aktuelle Action-Logic.

**Shared `RunContext`:**

```ts
interface RunContext {
  runId: string
  triggerData: Record<string, unknown>
  stepResults: StepResult[]              // flach, in Run-Reihenfolge.
  actionResults: Record<string, unknown> // für Conditions + nachfolgende Actions.
  stepCounter: { current: number }       // mutable, globale Step-Numbering.
}
```

`actionResults` ist über alle Ebenen geteilt — Sub-Step in Branch sieht Top-Level-Step-Results, Top-Level-Step nach Branch sieht Sub-Step-Results.

**Parallel-Sub-Steps in isoliertem Sub-Context** (siehe `runSubStepIsolated`-Helper) verhindern, dass die `stepResults`-Reihenfolge durch Race-Conditions durcheinandergerät. Sub-Step-Results werden nach `Promise.allSettled` in Index-Reihenfolge an das parent `stepResults`-Array angehängt.

**Persist nach jedem Step** (`persistStepResults`) — Live-Progress in Run-History bleibt erhalten.

**Recursion-Depth-Limit:** `executeOneStep` zählt aktuelle Tiefe mit; bei Überschreitung von 10 → Step wird als failed mit `error: 'Max nesting depth exceeded'` gepusht, kein Engine-Crash.

**Parallel-Cardinality-Limit:** Wenn `parallelStep.steps.length > 100` → Step failed mit klarer Fehlermeldung. Soft-Warnung im Editor ab >20.

### 3.3 Condition-Sprache erweitern

Heute 6 Patterns (`data.x` / `data.x == null` etc.). Neu **8 Patterns** mit:

- Pfade `steps.<id>.<nested.path>` zusätzlich zu `data.<field>`.
- Operatoren `>=`, `<=`, `<` zusätzlich zu `==`, `!=`, `>`.

Implementation: ein `resolvePath(path)`-Helper wird intern aufgerufen, statt direkter `data[key]`-Lookup. Alle alten Patterns funktionieren weiter (alter Pfad `data.<a>` matcht den neuen Pfad-Regex `(?:data|steps)(?:\.\w+)+`).

**Signatur-Änderung:** `evaluateCondition(condition, scope)` mit `scope: { triggerData, actionResults }` (statt heute `data`-Argument). Aufruf-Stellen: 2 in der Engine — beide werden im selben Refactor angepasst.

### 3.4 UI-Editor

`workflow-designer.tsx` (heute 336 Zeilen, flacher Loop) wird in mehrere Components gesplittet:

- `_components/step-list.tsx` — rekursive `<StepList>`. Top-Level + alle Sub-Listen (Branch-then/else, Parallel-steps) nutzen sie.
- `_components/step-card.tsx` — gemeinsame Hülle pro Step (Move-Up/Down, Delete, Label-Input). Rendert je nach `kind` einen der drei Editoren:
- `_components/branch-step-editor.tsx` — `ifCondition`-Input + zwei Sub-Container „Then" und „Else". `<StepList>` rekursiv für jede Sub-Liste. „Else hinzufügen"-Toggle.
- `_components/parallel-step-editor.tsx` — ein Sub-Container „Parallel" mit `<StepList>`.
- `_components/add-step-menu.tsx` — Dropdown mit drei Bereichen: Aktion / Verzweigung / Parallel.

`workflow-designer.tsx` reduziert sich auf Top-Level-Composition.

**Visuelle Hierarchie:** Sub-Container haben `pl-6 border-l-2 border-muted` für Indentation. Branch-Container hat klar getrennte Boxen für Then und Else.

**ID-Generierung:** `crypto.randomUUID().slice(0, 8)` für jede neue Step (Phase 1 hat das schon eingeführt; in Phase 2 auch für Branch/Parallel-Container).

**Validierungen im Editor:**
- Branch: `ifCondition` nicht leer (Submit-Block).
- Parallel: Soft-Warnung wenn `<2` oder `>20` Sub-Steps.

### 3.5 Run-History-UI

`stepResults` rendert mit Indentation basierend auf `path.split('.').length - 1`. Spezielle Badges:
- `kind: 'branch'` → Badge „Verzweigung → then/else/none".
- `kind: 'parallel'` → Badge „Parallel ({ranSubSteps} Steps, {failedCount} failed)".
- `kind: 'action'` → bisheriges Rendering.

## 4. Sicherheit

- **Recursion-Depth-Limit (10)** — defensive gegen pathologisch-tief verschachtelte Workflows.
- **Parallel-Cardinality-Limit (100)** — verhindert Resource-Exhaustion durch DB-Updates pro Step.
- **Keine Code-Execution in Conditions** — nur Regex-Pattern-Match, kein eval/Function.
- **Permissions**: keine neuen — `workflows.update` deckt alles ab.

## 5. Error-Handling

| Fall | Verhalten |
|---|---|
| Branch ohne Condition | Editor blockiert Save. |
| Branch ifCondition unbekanntes Format | Default `evaluateCondition` returnt `true` → `then`-Pfad läuft, Logger-Warn. |
| Branch `then` und `else` beide leer | Branch-Result mit `taken: 'none'`/`'then'`, keine Sub-Steps, Workflow läuft weiter. |
| Parallel mit 0 Sub-Steps | No-Op, Result `ranSubSteps: 0, failedCount: 0`. |
| Parallel mit 1 failed Sub-Step | Andere laufen, Summary zeigt `failedCount: 1`, Workflow läuft weiter. |
| Recursion >10 | Step-Result `failed`, error `'Max nesting depth exceeded'`. |
| Parallel >100 Sub-Steps | Step-Result `failed`, error `'Parallel cardinality > 100'`. |
| Action in Branch wirft | Step-Result `failed`, Branch-Step trotzdem `completed`, Workflow läuft weiter. |

## 6. Testing

### 6.1 Unit

`src/__tests__/unit/services/workflow-condition-eval.test.ts`:
- 8 Patterns × Truthy/Falsy/Edge-Cases.
- `steps.<id>.<nested>` mit deeply nested paths.
- Numerische Operatoren mit nicht-numerischem Wert (`Number.isNaN`-Branch).
- Unknown format → returns `true`.

`src/__tests__/unit/services/workflow-engine-branch.test.ts`:
- Branch with `ifCondition` true → only `then` runs.
- Branch with `ifCondition` false + else → only `else` runs.
- Branch with `ifCondition` false + no else → no sub-steps, Branch-Result `taken: 'none'`.
- Branch in Branch → correct path values.

`src/__tests__/unit/services/workflow-engine-parallel.test.ts`:
- 3 sub-steps, all success → all 3 in stepResults, Summary `failedCount: 0`.
- 1 of 3 failed → other 2 still complete, Summary `failedCount: 1`.
- Nested: Parallel in Branch → correct path values.
- 0 sub-steps → no error, summary with 0 counts.

`src/__tests__/unit/services/workflow-engine-step-id.test.ts` (existing) muss grün bleiben.

### 6.2 Integration (real-DB)

`workflow-branch-flow.test.ts`: lokaler Mock-HTTP-Server gibt einmal 200, einmal 500 zurück. Workflow mit Branch nach Webhook (`steps.webhook_x.status == 200` → `then` mit `log_activity`, else → `notify_admin`). Beide Pfade werden geprüft.

`workflow-parallel-flow.test.ts`: 3 parallele Webhook-Steps, Mock-Server zählt Requests + Start-Timestamps. Alle 3 starten <100ms voneinander, alle 3 in `stepResults`.

### 6.3 Manuell

- Editor: Branch + Parallel anlegen, verschachteln, speichern, neu laden — Steps mit IDs persistiert.
- Run-History: nach Branch-Run sind sub-step-Results mit Indentation sichtbar, Branch-Badge zeigt `taken: 'then'`.
- Run-History: nach Parallel-Run sind alle 3 Sub-Steps untereinander mit Indentation, Summary-Badge zeigt `3 Steps`.

## 7. Implementierungs-Reihenfolge (für Planning)

1. Engine: Datenmodell-Erweiterung (`StepKind`, `BranchStep`, `ParallelStep`-Interfaces).
2. `evaluateCondition` umschreiben + Unit-Tests.
3. Engine: `executeStepList` / `executeOneStep` rekursiv extrahieren + Branch-Logik + Unit-Tests.
4. Engine: Parallel-Logik (`Promise.allSettled` + isolierter Sub-Context) + Unit-Tests.
5. Engine: Recursion-Depth-Limit + Parallel-Cardinality-Limit + Tests.
6. UI: `<StepList>` rekursiv extrahieren, `<StepCard>` Diskriminator-Switch.
7. UI: `<BranchStepEditor>`, `<ParallelStepEditor>`, `<AddStepMenu>`.
8. UI: Run-History-Indentation + Branch/Parallel-Badges.
9. Integration-Tests (branch-flow + parallel-flow).
10. Manuelles E2E + Deploy.
