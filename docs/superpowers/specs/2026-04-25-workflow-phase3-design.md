# Workflow-Erweiterung Phase 3 — Loops, komplexe Conditions, Cron-Integration, Drag-and-Drop

## 1. Ziel

Phase 2 lieferte verschachtelte `branch`/`parallel`-Container, Step-Result-Pfade in Conditions und einen rekursiven Designer. Phase 3 erweitert das System um:

1. **`for_each`-Loop** über Array-Sources, sequenziell.
2. **Boolean-Composition** in Conditions (`&&`, `||`, Klammern).
3. **Geplante Trigger** im Workflow-Designer mit transparenter `cron_jobs`-Verwaltung.
4. **Drag-and-Drop**-Reorder im Designer (within-container).

## 2. Scope

**In scope:**
- Neuer Step-Type `for_each` mit `source`-Path und sequenzieller Iteration.
- `{{item}}`, `{{item.<feld>}}`, `{{loop.index}}` als Templating-Variablen pro Iteration.
- Recursive-Descent-Parser für Boolean-Conditions (`&&` > `||`, Klammern, Short-Circuit).
- Workflow-Designer: Section „Zeitplan" für Trigger `__scheduled__`, Sync zu `cron_jobs`.
- `@dnd-kit/core` + `@dnd-kit/sortable` für DnD-Reorder innerhalb eines Containers; Top-Level-Container-Reorder.
- Up/Down-Buttons bleiben als A11y-Fallback.
- Schema-Migration: `workflows.schedule jsonb null`.
- Defensiver Limit `MAX_LOOP_ITERATIONS = 100`.

**Out of scope (zukünftige Phasen):**
- Cross-Container-DnD (Step aus `then` nach `parallel.steps` ziehen).
- Sub-Workflow-Action.
- Visual Flowchart-Editor (React Flow).
- URL-Whitelist (SSRF-Schutz für `webhook_call`).
- Negation `!` in Conditions.
- Templating-Autocomplete im Designer.
- Batched-Persist für `workflow_runs.stepResults`.
- Parallele `for_each`-Iteration.

## 3. Architektur

### 3.1 Datenmodell

#### Engine-Typ-Erweiterung (`src/lib/services/workflow/engine.ts`)

```ts
interface ForEachStep extends BaseStep {
  kind: 'for_each'
  source: string             // 'data.<path>' oder 'steps.<id>.<path>' — muss zu Array auflösen
  steps: WorkflowStep[]      // pro Iteration ausgeführt
}

type WorkflowStep = ActionStep | BranchStep | ParallelStep | ForEachStep
type StepKind = 'action' | 'branch' | 'parallel' | 'for_each'
```

#### Schema (`src/lib/db/schema.ts`)

Neue Spalte auf `workflows`:

```ts
schedule: jsonb('schedule')  // { interval: '5min' | '15min' | '30min' | '60min' | 'daily', dailyAt?: 'HH:MM' } | null
```

Bestandsworkflows bleiben mit `null` unverändert. Migration ist additive — kein Daten-Backfill nötig.

#### Trigger-Registry (`src/lib/services/workflow/triggers.ts`)

Ein neuer Eintrag:

```ts
{
  key: '__scheduled__',
  label: 'Geplant (Cron)',
  description: 'Workflow läuft auf Zeitplan. Konfiguration im Bereich „Zeitplan".',
  dataShape: ['scheduledAt', 'workflowId'],
}
```

`cron_jobs.actionConfig` für gemanagte Einträge: `{ workflowId: <id>, direct: true }`. Manuell angelegte Cron-Jobs (mit `trigger`-basierter Konfiguration) bleiben funktional ungestört.

### 3.2 Engine-Erweiterung — `for_each`

Eigenes Branch in `executeOneStep`. Path-Format: `<parentPath>.iter[<i+1>]`. Sequenzielle Ausführung mit MAX-Check.

```ts
if (kind === 'for_each') {
  const fes = step as ForEachStep
  const startTime = Date.now()
  const arr = resolvePath(fes.source, {
    triggerData: ctx.triggerData,
    actionResults: ctx.actionResults,
  })

  if (!Array.isArray(arr)) {
    ctx.stepResults.push({
      step: stepNum, path, action: 'for_each', kind: 'for_each',
      label: fes.label, status: 'failed',
      error: `Source "${fes.source}" ist kein Array`,
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  if (arr.length > MAX_LOOP_ITERATIONS) {
    ctx.stepResults.push({
      step: stepNum, path, action: 'for_each', kind: 'for_each',
      label: fes.label, status: 'failed',
      error: `Loop iterations > ${MAX_LOOP_ITERATIONS}`,
      durationMs: Date.now() - startTime,
    })
    await persistStepResults(ctx)
    return
  }

  // Summary-Eintrag früh — wird am Ende mit echtem failedCount überschrieben
  const summaryIdx = ctx.stepResults.length
  ctx.stepResults.push({
    step: stepNum, path, action: 'for_each', kind: 'for_each',
    label: fes.label, status: 'completed',
    result: { iterations: arr.length, failedCount: 0 },
    durationMs: 0,
  })
  await persistStepResults(ctx)

  let failedCount = 0
  const childCtx: RunContext = { ...ctx, depth: ctx.depth + 1 }

  for (let i = 0; i < arr.length; i++) {
    // Loop-Kontext für Templating
    childCtx.actionResults.__item = arr[i]
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

`resolvePath` wird aus `evaluateCondition` als freier Modul-Helper extrahiert (kleiner Refactor, keine Verhaltensänderung).

`{{item}}`, `{{item.<feld>}}`, `{{loop.index}}`, `{{loop.value}}` funktionieren automatisch durch den existierenden `resolveTemplate`-Helper in `action-registry.ts` — er traversiert `steps.<key>.<path>`, und `__item` / `__loop` sind reguläre Keys in `actionResults`. (Der `__`-Prefix vermeidet Kollisionen mit User-IDs.)

**Limit-Constant:** `const MAX_LOOP_ITERATIONS = 100` (analog `MAX_PARALLEL_FANOUT`).

### 3.3 Komplexe Conditions

Neuer Modul-File `src/lib/services/workflow/condition-parser.ts`:

```ts
type Scope = { triggerData: Record<string, unknown>; actionResults: Record<string, unknown> }

// Atomare Patterns aus Phase 2 unverändert — nur extrahiert
function evaluateAtom(atom: string, scope: Scope): boolean { /* alle 8 regex-Patterns */ }

// Recursive-Descent-Parser
//   Expr    ::= OrExpr
//   OrExpr  ::= AndExpr ('||' AndExpr)*
//   AndExpr ::= Primary ('&&' Primary)*
//   Primary ::= '(' Expr ')' | Atom
export function evaluateCondition(cond: string, scope: Scope): boolean {
  if (!cond?.trim()) return true
  const tokens = tokenize(cond)
  const [result, rest] = parseOr(tokens, scope)
  return rest.length === 0 ? result : true  // unparseable → true (defensiver Default)
}
```

**Tokenisierung:** Split bei Top-Level (Tiefe 0) auf `&&`, `||`, `(`, `)`. Atome sind alles dazwischen. Tokens behalten ihre String-Form, weil Atom-Auswertung weiterhin regex-basiert läuft.

**Short-Circuit:** `&&` evaluiert zweite Seite nur wenn erste true; `||` umgekehrt. Reine Lazy-Evaluation der Atome.

**Backwards-Compat:** Atomare Conditions ohne `&&`/`||`/`(` durchlaufen den Parser, der sie als single-Atom-Expr erkennt und 1:1 an `evaluateAtom` weiterreicht. Phase-2-Tests bleiben grün.

`engine.ts` importiert `evaluateCondition` aus dem neuen Modul. Die in Phase 2 dort definierte Funktion wird entfernt.

### 3.4 Cron-Integration

#### Sync-Service `WorkflowService.syncSchedule(workflowId)` (`src/lib/services/workflow.service.ts`)

Wird aufgerufen aus PUT/POST/DELETE der Workflow-API.

```ts
async function syncSchedule(workflowId: string) {
  const wf = await db.select().from(workflows).where(eq(workflows.id, workflowId)).then(rs => rs[0])
  if (!wf) {
    // Workflow gelöscht: korrespondierende cron_jobs entfernen
    await db.delete(cronJobs).where(
      and(eq(cronJobs.actionType, 'workflow'),
          sql`${cronJobs.actionConfig}->>'workflowId' = ${workflowId}`)
    )
    return
  }

  const existing = await db.select().from(cronJobs).where(
    and(eq(cronJobs.actionType, 'workflow'),
        sql`${cronJobs.actionConfig}->>'workflowId' = ${workflowId}`)
  ).then(rs => rs[0])

  const isScheduled = wf.trigger === '__scheduled__' && wf.schedule != null && wf.isActive

  if (!isScheduled) {
    if (existing) {
      // Deaktivieren statt löschen — History bleibt, User kann manuell reaktivieren
      await db.update(cronJobs).set({ isActive: false }).where(eq(cronJobs.id, existing.id))
    }
    return
  }

  const sched = wf.schedule as { interval: string; dailyAt?: string }
  const baseFields = {
    name: `Workflow: ${wf.name}`,
    description: `Auto-managed schedule für Workflow ${wf.id}`,
    interval: sched.interval,
    dailyAt: sched.dailyAt ?? null,
    actionType: 'workflow' as const,
    actionConfig: { workflowId, direct: true },
    isActive: true,
    nextRunAt: CronService.calculateNextRun(sched.interval, sched.dailyAt),
  }

  if (existing) {
    await db.update(cronJobs).set({ ...baseFields, updatedAt: new Date() }).where(eq(cronJobs.id, existing.id))
  } else {
    await db.insert(cronJobs).values(baseFields)
  }
}
```

Aufruf-Stellen:
- `POST /api/v1/workflows` — nach `insert`, `syncSchedule(newWorkflow.id)`
- `PUT /api/v1/workflows/[id]` — nach `update`, `syncSchedule(id)`
- `DELETE /api/v1/workflows/[id]` — vor `delete` (oder nach mit Cleanup-Pfad), `syncSchedule(id)` mit nicht-existentem Workflow

Sync-Fehler werden geloggt aber blockieren den HTTP-Response nicht (best-effort; Repair-Endpoint später nachrüstbar wenn nötig).

#### `CronService.tick()` Erweiterung

Im bestehenden `switch (job.actionType)`-Block:

```ts
case 'workflow': {
  const config = (job.actionConfig || {}) as Record<string, unknown>
  if (config.direct === true && config.workflowId) {
    // Phase-3-Pfad: direkter Workflow-Aufruf
    const [wf] = await db.select().from(workflows).where(eq(workflows.id, config.workflowId as string))
    if (!wf) {
      msg = `Workflow ${config.workflowId} nicht gefunden — Cron-Job verwaist`
      break
    }
    if (!wf.isActive) {
      msg = 'Workflow deaktiviert — übersprungen'
      break
    }
    await WorkflowEngine.executeWorkflow(
      wf.id, wf.name, wf.steps as WorkflowStep[],
      '__scheduled__',
      { scheduledAt: new Date().toISOString(), workflowId: wf.id, cronJobId: job.id }
    )
    msg = `Workflow "${wf.name}" direkt ausgeführt`
  } else {
    // Bestehender Pfad: trigger-basiert
    const trigger = (config.trigger as string) || 'cron.triggered'
    await WorkflowEngine.fire(trigger, { cronJobId: job.id, cronJobName: job.name })
    msg = `Workflow trigger "${trigger}" gefeuert`
  }
  break
}
```

#### `CronService.calculateNextRun(interval, dailyAt?)`

Existiert bereits — nicht angefasst.

### 3.5 UI

#### Neue Komponente `for-each-step-editor.tsx`

Analog `parallel-step-editor.tsx`. Felder: `source` (Input mit Hint-Text), Sub-Steps via rekursive `<StepList>`.

```
┌─ Schleife (for-each)  [3 Schritte]              ┐
│ Quelle: [ data.interests                       ] │
│   Erlaubt: data.<pfad>, steps.<id>.<pfad>       │
│   Verfügbar: {{item}}, {{item.feld}}, {{loop.index}} │
│ ┌────────────────────────────────────────────┐  │
│ │ Step 1.1: Activity loggen ...              │  │
│ │ Step 1.2: Webhook senden ...               │  │
│ └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

`AddStepMenu` bekommt einen weiteren Eintrag „Schleife (for-each)". `step-card.tsx` bekommt einen weiteren `kind === 'for_each'`-Branch im Switch. `makeForEachStep()`-Helper analog `makeParallelStep()`.

#### Schedule-Section im Workflow-Designer (`[id]/page.tsx`)

Neue Card oberhalb des `<WorkflowDesigner>`, conditional:

```tsx
{workflow.trigger === '__scheduled__' && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Zeitplan</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <Select value={schedule?.interval} onValueChange={...}>
        <SelectItem value="5min">Alle 5 Minuten</SelectItem>
        <SelectItem value="15min">Alle 15 Minuten</SelectItem>
        <SelectItem value="30min">Alle 30 Minuten</SelectItem>
        <SelectItem value="60min">Stündlich</SelectItem>
        <SelectItem value="daily">Täglich</SelectItem>
      </Select>
      {schedule?.interval === 'daily' && (
        <Input type="time" value={schedule.dailyAt} ... />
      )}
      <p className="text-xs text-muted-foreground">
        Nächste Ausführung: {nextRun} (Europe/Berlin)
      </p>
    </CardContent>
  </Card>
)}
```

`workflow.schedule` ist ein nullable Object — beim Trigger-Wechsel auf `__scheduled__` wird `schedule = { interval: 'daily', dailyAt: '08:00' }` als Default gesetzt, beim Wechsel weg → `schedule = null`.

#### Drag-and-Drop in `<StepList>`

Dependencies: `@dnd-kit/core@6.x`, `@dnd-kit/sortable@8.x`, `@dnd-kit/utilities@3.x`.

Architektur:
- `<StepList>` wrappt seine Step-Map in `<SortableContext items={ids} strategy={verticalListSortingStrategy}>`.
- Jede `<StepCard>` ruft `useSortable({ id: step.id })` und gibt Listeners auf einen kleinen Drag-Handle (Grip-Icon links). Card-Inhalt selbst ist NICHT drag-source — Buttons bleiben klickbar.
- Top-Level-`<DndContext>` lebt in `<WorkflowDesigner>`. `onDragEnd` ruft Update-Callback der relevanten `<StepList>`.
- **Cross-Container-Sperre:** `onDragOver` prüft, ob Source und Target im selben `SortableContext.id` (Container-ID = Stable-Ref der Steps-Liste). Falls nicht: Drop wird ignoriert, visuelles Feedback via `activatorEvent`-State.
- Jede `<StepList>` bekommt eine eindeutige `containerId` (Path-basiert: `top`, `step1.then`, `step2.parallel`, `step3.iter`).

Up/Down-Buttons bleiben unverändert.

#### Run-History (Indentation für `for_each`)

Indentation-Algorithmus in `[id]/page.tsx`:

```ts
// Phase 2: depth = path.split('.').length - 1
// Phase 3: iter[N] zählt als Segment, also weiterhin korrekt — aber path enthält jetzt '.iter[3].' Segmente
// Stattdessen: depth = (path.match(/\.|iter\[/g) || []).length  // robuster
```

Neuer Badge:
```tsx
{kind === 'for_each' && (
  <Badge variant="outline">
    Schleife ({sr.result?.iterations ?? 0}
    {(sr.result?.failedCount ?? 0) > 0 ? `, ${sr.result?.failedCount} fail` : ''})
  </Badge>
)}
```

### 3.6 API + Validierung

`POST/PUT /api/v1/workflows/[id]` akzeptiert zusätzlich `schedule` im Body. Validierung:
- `schedule == null` ist erlaubt.
- Wenn gesetzt: `interval` muss in `{every_5min, every_15min, every_30min, every_60min, daily}`, `dailyAt` muss `HH:MM`-Format wenn `interval == 'daily'`.

`for_each`-Step Validierung beim Save:
- `source` darf nicht leer sein.
- `steps` muss Array sein (kann leer sein — degeneriert zu No-Op, aber kein Fehler).

Validierungsfehler → HTTP 400 mit erklärender Message, Workflow wird nicht gespeichert.

## 4. Sicherheit / Limits

- `MAX_DEPTH = 10` unverändert; `for_each.steps` zählen wie `branch.then` als +1 Tiefe.
- `MAX_LOOP_ITERATIONS = 100` neu (defensiv).
- Cron-Sync: `actionConfig.direct === true` ist der Diskriminator. Manuell angelegte Cron-Jobs ohne diesen Flag laufen weiter über Trigger-Fire-Pfad.
- Schema-Migration ist additive — `null`-default für Bestandsworkflows.

## 5. Backwards-Kompatibilität

- Bestehende Workflows ohne `kind`-Feld auf Steps: weiterhin als Action behandelt (Phase 2 verhalten).
- Bestehende Conditions ohne `&&`/`||`: unverändert (Atom-Pattern matcht direkt).
- Bestehende `cron_jobs`-Einträge ohne `actionConfig.direct`: weiter Trigger-Fire-Pfad.
- Bestandsworkflows mit `trigger != '__scheduled__'`: `schedule`-Spalte bleibt `null`, kein Sync.
- UI-State: Workflows ohne `schedule`-Feld werden korrekt mit `null` initialisiert.

## 6. Tests

### 6.1 Unit-Tests

| Datei | Inhalt |
|---|---|
| `src/__tests__/unit/services/workflow-condition-parser.test.ts` | Alle Phase-2-Cases + 12 neue: `&&`, `||`, Präzedenz, Klammern, Whitespace, Short-Circuit, kaputte Syntax → defaults to `true` |
| `src/__tests__/unit/services/workflow-engine-foreach.test.ts` | Sequenziell, source missing/non-array, MAX_LOOP überschritten, item/loop-Templating, leeres Array, fail-counting |
| `src/__tests__/unit/services/workflow-engine-limits.test.ts` (extend) | Loop in Branch in Loop = depth-error |
| `src/__tests__/unit/services/workflow-schedule-sync.test.ts` | `syncSchedule` legt cron_jobs an, aktualisiert, deaktiviert, löscht; ignoriert manuelle Cron-Jobs |

Targets: 100% Branch-Coverage in `condition-parser.ts`, alle Limits-Pfade in for-each.

### 6.2 Integration-Tests (real DB, `TEST_DATABASE_URL`)

| Datei | Inhalt |
|---|---|
| `src/__tests__/integration-real/workflow-foreach-flow.test.ts` | Trigger feuert mit `data.urls = [a,b,c]`, Loop ruft Webhook 3x mit unterschiedlichen URLs |
| `src/__tests__/integration-real/workflow-cron-flow.test.ts` | Workflow mit `trigger='__scheduled__'` und `schedule={interval:'5min'}` speichern → cron_jobs-Eintrag exists; `CronService.tick()` mit `nextRunAt < now` ruft `executeWorkflow` direkt; cleanup |

### 6.3 Manuelles E2E

- Workflow mit Schedule (täglich 09:00) anlegen → in `/intern/settings/cron-jobs` taucht Auto-Eintrag auf, „verwaltet durch Workflow X"-Hinweis.
- Workflow mit `for_each` über `data.interests` (vom Kontaktformular) → Run-History zeigt N Sub-Steps mit Indentation.
- Workflow mit komplexer Condition `data.priority == 'hoch' && (data.score >= 70 || data.tags == 'vip')` → Branch nimmt korrekten Pfad.
- DnD: Step ziehen innerhalb Container, ziehen verboten cross-container (visuelles Feedback), Up/Down-Buttons funktionieren parallel.

## 7. Schema-Migration

Eine Drizzle-Migration:

```sql
ALTER TABLE workflows ADD COLUMN schedule jsonb;
```

Drizzle-Generierung via `npm run db:generate`. Migration committen unter `src/lib/db/migrations/<timestamp>_workflow_schedule.sql`.

## 8. Geschätzte Tasks

Phase 3 verteilt sich grob auf folgende Task-Cluster:

1. Schema-Migration + `WorkflowStep`-Typ-Erweiterung
2. `condition-parser.ts` extrahieren + Boolean-Composer + Tests
3. `for_each` in Engine + Tests
4. `WorkflowService.syncSchedule` + Cron-Service-Erweiterung + Tests
5. UI: `ForEachStepEditor` + `AddStepMenu`-Erweiterung
6. UI: Schedule-Section im Designer
7. UI: DnD via `@dnd-kit` in `<StepList>`
8. UI: Run-History `for_each`-Badge + Indentation-Anpassung
9. Integration-Tests (foreach-flow, cron-flow)
10. Manuelles E2E + Deploy

Erwartete Plan-Größe: 10–12 Tasks (vergleichbar Phase 1 mit 9, Phase 2 mit 11).

## 9. Risiken

| Risiko | Mitigation |
|---|---|
| Cron-Sync verlässt Workflow-Save halb-konsistent | Sync ist best-effort + geloggt; Repair-Job kann später periodisch aufräumen wenn nötig (Phase 3.5 oder ad-hoc) |
| DnD-Bibliothek bringt Bundle-Größe | `@dnd-kit/core` ist ~30kb gz, lazy-loadable wenn nötig (next/dynamic für `WorkflowDesigner`) |
| Boolean-Parser hat Off-by-One in Klammer-Tiefe | Hohe Test-Coverage + 12 explizite Cases; defensiver Default `true` bei Parse-Fehler verhindert harte Failure-Modes |
| `__item` / `__loop`-Keys kollidieren mit User-Step-IDs | Doppel-Underscore-Prefix als Konvention; Validierung beim Save lehnt User-IDs mit `__` ab (kleiner Add) |
| Phase-2-Workflows mit alten Conditions brechen | Atomare Patterns unverändert; Backwards-Compat-Tests laufen Phase-2-Cases im neuen Parser |

## 10. Open Items

Keine. Alle Designentscheidungen sind getroffen.
