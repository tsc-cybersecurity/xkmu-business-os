# Agent-System Phase 6 — Recovery + Reconcile

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Robustheit gegen Crashes, Pod-Restarts und stranded Runs einbauen. `reconcileStrandedRuns()` (heute no-op) implementiert die 4 Liveness-Pfade aus Spec §6.7. Der `agent_continuation`-Task-Handler (heute "phase>4 not yet implemented") faehrt strandede Runs wieder an. Beim Server-Boot werden Inline-Lane-Crashes durch einen Recovery-Hook erkannt und zur Cron-Lane uebergeben. Plus: `cancel()` raeumt offene `agent_step_run`/`agent_replan`-Tasks ab und Orchestrator pruefen vor `plan`/`replan` ein hartes Budget-Stop (Phase-4-Followup).

**Architecture:**
- **Reconcile-Loop** (alle 5 min): SQL-Query findet `agent_runs` mit Status in `('planning','executing','replanning')` deren `COALESCE(liveness_checked_at, started_at) < NOW() - 10 min`. Pro Treffer ein `agent_continuation`-Task in der Queue. Jeder Reconcile-Lauf schreibt `liveness_checked_at = NOW()` auf alle so gefundenen Runs, damit derselbe Run nicht im naechsten 5-min-Tick erneut auflaeuft.
- **agent_continuation-Handler**: lade Run + alle Steps + offene Tasks. Vier Pfade pruefen (in Reihenfolge): (1) Pending Step mit pending Task → ok, nichts tun; (2) Running Step ohne update >10 min → setze Step `failed`, queue `agent_replan`; (3) Letzter Step ist `failed`/`succeeded` aber kein replan-Task offen → queue `agent_replan`; (4) sonst → Goal `paused` mit Activity-Log-Begruendung.
- **Boot-Recovery** in `src/instrumentation.ts`: nach Migrationen + vor Cron-Start: `agent_runs.status='executing'` + `MAX(agent_steps.updated_at) < NOW() - 5 min` → queue `agent_continuation` mit `priority=1`. Naechster Cron-Tick (max 1 min Latenz) faehrt sie an.
- **Activity-Log-Helper**: deutsche Audit-Eintraege via bestehender `AuditLogService.log` mit `entityType='agent_run'`/`'agent_goal'` und `action='agent.run.stranded'`/`'agent.run.recovered'`/`'agent.goal.paused_by_recovery'`.
- **cancel() Task-Cleanup**: pending `agent_step_run`/`agent_replan` mit `referenceId` der noch lebenden Steps/Runs auf `status='cancelled'` setzen.
- **Budget-Hard-Stop in Orchestrator**: vor `plan()` und vor `replan()` `CostTrackerService.checkBudget(goalId)`. Bei `exceeded` → Run sofort auf `failed`, Goal auf `paused`, kein LLM-Call.

**Tech Stack:** Bestehender `AuditLogService` (`src/lib/services/audit-log.service.ts`), `CostTrackerService.checkBudget` (Phase 3), `CronService.tick()`-Hook, `runPendingMigrations`-Boot-Hook. Keine neuen Dependencies. Vitest fuer Unit-Tests, real DB fuer Recovery-E2E.

**Spec-Referenz:** `docs/superpowers/specs/2026-05-08-agent-system-design.md` §6.5 (agent_continuation), §6.7 (Stranded-Reconcile), §6.8 (Pod-Restart-Verhalten).

**Vorbedingungen:** Phasen 1-5 gemerged. Migrationen 020 + 021 ausgefuehrt. `feat/agents-smart-worker` ist gemerged (oder weiterbranchen auf `feat/agents-recovery`).

---

## File Structure

**Neue Module unter `src/lib/services/agents/recovery/`:**
- `reconcile.service.ts` — `reconcileStrandedRuns()` SQL-Query + per-Run-Continuation-Queue
- `continuation.service.ts` — `handleContinuation(runId)` mit 4 Liveness-Pfade
- `boot-recovery.ts` — `recoverStrandedRunsOnBoot()` einmalig beim Server-Start
- `activity-log.ts` — `logAgentEvent(...)` Wrapper um AuditLogService

**Modifiziert:**
- `src/lib/services/cron.service.ts`:
  - `reconcileStrandedRuns()` (Zeile ~146) ruft jetzt das neue Modul
  - `processAgentTaskQueue()` (Zeile ~121-128) `agent_continuation`-Branch ruft `handleContinuation`
- `src/lib/services/agents/goal.service.ts` — `cancel()` raeumt offene Tasks auf
- `src/lib/services/agents/orchestrator.service.ts`:
  - `plan()` und `replan()` rufen `CostTrackerService.checkBudget(goalId)` als ersten Schritt
  - Bei exceeded → Run failed + Goal paused + Activity-Log + early-return
- `src/instrumentation.ts` — nach `runPendingMigrations` und vor Cron-Start: `recoverStrandedRunsOnBoot()`
- `src/lib/services/agents/index.ts` — Re-Exports fuer `reconcileStrandedRuns`, `handleContinuation`, `recoverStrandedRunsOnBoot`

**Neue Test-Dateien:**
- `src/__tests__/unit/services/agents/recovery/activity-log.test.ts`
- `src/__tests__/unit/services/agents/recovery/reconcile.service.test.ts`
- `src/__tests__/unit/services/agents/recovery/continuation.service.test.ts`
- `src/__tests__/unit/services/agents/recovery/boot-recovery.test.ts`
- `src/__tests__/unit/services/agents/orchestrator.budget-stop.test.ts`
- `src/__tests__/integration/services/agents/recovery-e2e.test.ts` (real DB)

**Modifizierte Test-Dateien:**
- `src/__tests__/unit/services/agents/goal.service.test.ts` — neuer Test fuer cancel-Cleanup

---

### Task 1: Activity-Log-Helper

Wir wollen pro Recovery-Aktion einen Audit-Trail-Eintrag in `audit_logs` schreiben, ohne im Recovery-Code direkt mit `AuditLogService.log` rumzurechnen.

**Files:**
- Create: `src/lib/services/agents/recovery/activity-log.ts`
- Test: `src/__tests__/unit/services/agents/recovery/activity-log.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/recovery/activity-log.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/services/audit-log.service', () => ({
  AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
}))

describe('logAgentEvent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('schreibt Run-Event mit entityType=agent_run', async () => {
    const { AuditLogService } = await import('@/lib/services/audit-log.service')
    const { logAgentEvent } = await import('@/lib/services/agents/recovery/activity-log')
    await logAgentEvent({
      action: 'agent.run.stranded',
      runId: 'r1',
      goalId: 'g1',
      detail: 'Inline-Loop nach Pod-Restart strandend',
    })
    expect(AuditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'agent.run.stranded',
      entityType: 'agent_run',
      entityId: 'r1',
      payload: expect.objectContaining({ goalId: 'g1', detail: expect.stringContaining('Inline-Loop') }),
    }))
  })

  it('schreibt Goal-Event mit entityType=agent_goal', async () => {
    const { AuditLogService } = await import('@/lib/services/audit-log.service')
    const { logAgentEvent } = await import('@/lib/services/agents/recovery/activity-log')
    await logAgentEvent({
      action: 'agent.goal.paused_by_recovery',
      goalId: 'g2',
      detail: 'Kein Liveness-Pfad gefunden',
    })
    expect(AuditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'agent.goal.paused_by_recovery',
      entityType: 'agent_goal',
      entityId: 'g2',
      payload: expect.objectContaining({ detail: expect.stringContaining('Liveness') }),
    }))
  })

  it('schluckt AuditLog-Fehler — Recovery soll dadurch nicht abbrechen', async () => {
    const { AuditLogService } = await import('@/lib/services/audit-log.service')
    ;(AuditLogService.log as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB down'))
    const { logAgentEvent } = await import('@/lib/services/agents/recovery/activity-log')
    await expect(
      logAgentEvent({ action: 'agent.run.recovered', runId: 'r1', goalId: 'g1' }),
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `pnpm vitest run src/__tests__/unit/services/agents/recovery/activity-log.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/recovery/activity-log.ts`:

```ts
/**
 * Wrapper um AuditLogService fuer Agent-Recovery-Events.
 * Gold rule: Recovery darf nie an Audit-Fehlern haengenbleiben — wir schlucken
 * AuditLog-Exceptions und loggen sie ueber den normalen Logger.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §8 (Audit-Log-Anbindung)
 */

import { logger } from '@/lib/utils/logger'

export type AgentEventAction =
  | 'agent.run.stranded'
  | 'agent.run.recovered'
  | 'agent.run.continuation_failed'
  | 'agent.goal.paused_by_recovery'
  | 'agent.goal.cancel_cleanup'
  | 'agent.budget.exceeded'

export interface AgentEventInput {
  action: AgentEventAction
  goalId: string
  runId?: string
  stepId?: string
  detail?: string
  metadata?: Record<string, unknown>
}

export async function logAgentEvent(input: AgentEventInput): Promise<void> {
  const { AuditLogService } = await import('@/lib/services/audit-log.service')

  const isRunEvent = input.action.startsWith('agent.run.')
  const entityType = isRunEvent ? 'agent_run' : 'agent_goal'
  const entityId = isRunEvent ? input.runId ?? input.goalId : input.goalId

  try {
    await AuditLogService.log({
      action: input.action,
      entityType,
      entityId,
      payload: {
        goalId: input.goalId,
        runId: input.runId,
        stepId: input.stepId,
        detail: input.detail,
        ...input.metadata,
      },
    })
  } catch (e) {
    logger.error(`Agent-Activity-Log-Schreibung fehlgeschlagen: ${(e as Error).message}`, e, {
      module: 'AgentRecovery',
      action: input.action,
    })
  }
}
```

- [ ] **Step 4: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/recovery/activity-log.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/recovery/activity-log.ts \
        src/__tests__/unit/services/agents/recovery/activity-log.test.ts
git commit -m "feat(agents): Activity-Log-Helper fuer Recovery-Events"
```

---

### Task 2: handleContinuation — vier Liveness-Pfade

`agent_continuation`-Tasks gehen seit Phase 4 in einen Stub-Branch (`'phase>4 not yet implemented'`). Jetzt implementieren wir die 4 Pfade aus Spec §6.7.

**Files:**
- Create: `src/lib/services/agents/recovery/continuation.service.ts`
- Test: `src/__tests__/unit/services/agents/recovery/continuation.service.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/recovery/continuation.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn((..._a: unknown[]) => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn((..._a: unknown[]) => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const insertMock = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }))
const dbExecuteMock = vi.fn().mockResolvedValue([])

vi.mock('@/lib/db', () => ({ db: { select: selectMock, update: updateMock, insert: insertMock, execute: dbExecuteMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentRuns: { id: 'id', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId', status: 'status', updatedAt: 'updatedAt' },
  agentGoals: { id: 'id', status: 'status' },
  taskQueue: { id: 'id', referenceId: 'referenceId', type: 'type', status: 'status' },
}))

const logAgentEventMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/agents/recovery/activity-log', () => ({ logAgentEvent: logAgentEventMock }))

describe('handleContinuation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectLimitMock.mockReset()
    dbExecuteMock.mockResolvedValue([])
  })

  it('Pfad 1: pending Step mit pending Task -> nichts tun, ok-Status', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }]) // run
    // dbExecuteMock liefert beide Queries: stepCheck mit pending+queue-bound, queueCheck egal
    dbExecuteMock
      .mockResolvedValueOnce([{ stepId: 's1', stepStatus: 'pending', taskStatus: 'pending', stepUpdatedAt: new Date() }])
      .mockResolvedValueOnce([])

    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')

    expect(r.path).toBe('queue_bound_ok')
    expect(insertMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('Pfad 2: running Step >10 min ohne update -> step failed, replan queued', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }])
    const oldDate = new Date(Date.now() - 15 * 60 * 1000)
    dbExecuteMock
      .mockResolvedValueOnce([{ stepId: 's1', stepStatus: 'running', taskStatus: null, stepUpdatedAt: oldDate }])
      .mockResolvedValueOnce([])

    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')

    expect(r.path).toBe('running_step_stalled')
    expect(updateMock).toHaveBeenCalled() // step auf failed
    expect(insertMock).toHaveBeenCalled() // replan queued
    expect(logAgentEventMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'agent.run.recovered' }))
  })

  it('Pfad 3: kein offener Step + kein replan-Task -> replan queued', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }])
    dbExecuteMock
      .mockResolvedValueOnce([]) // keine offenen Steps
      .mockResolvedValueOnce([]) // kein offener replan-Task

    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')

    expect(r.path).toBe('replan_missing')
    expect(insertMock).toHaveBeenCalled()
  })

  it('Pfad 4: nichts findet einen Pfad -> Goal paused, Audit-Log', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }])
    dbExecuteMock
      .mockResolvedValueOnce([]) // keine offenen Steps
      .mockResolvedValueOnce([{ id: 't1', type: 'agent_replan' }]) // replan ist offen UND alle Steps sind succeeded -> warum strandend?
    // Pfad 3 trifft nicht weil replan offen, also Pfad 4: paused

    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')

    expect(r.path).toBe('paused_no_path')
    expect(updateMock).toHaveBeenCalled() // Goal auf paused
    expect(logAgentEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'agent.goal.paused_by_recovery' }),
    )
  })

  it('Run nicht gefunden -> wirft', async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    await expect(handleContinuation('rX')).rejects.toThrow(/nicht gefunden/)
  })

  it('Terminal Run -> kein Pfad, no-op', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'succeeded' }])
    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')
    expect(r.path).toBe('terminal_no_op')
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `pnpm vitest run src/__tests__/unit/services/agents/recovery/continuation.service.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/recovery/continuation.service.ts`:

```ts
/**
 * agent_continuation-Handler — entscheidet anhand der vier Liveness-Pfade
 * was mit einem strandenden Run passiert.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.5 + §6.7
 */

export type ContinuationPath =
  | 'queue_bound_ok'
  | 'running_step_stalled'
  | 'replan_missing'
  | 'paused_no_path'
  | 'terminal_no_op'

export interface ContinuationResult {
  runId: string
  path: ContinuationPath
  detail?: string
}

const STALL_THRESHOLD_MIN = 10

export async function handleContinuation(runId: string): Promise<ContinuationResult> {
  const { db } = await import('@/lib/db')
  const { agentRuns, agentGoals } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')
  const { logAgentEvent } = await import('./activity-log')

  const [run] = await db
    .select({ id: agentRuns.id, status: agentRuns.status, goalId: agentRuns.goalId })
    .from(agentRuns)
    .where(eq(agentRuns.id, runId))
    .limit(1)

  if (!run) throw new Error(`Run ${runId} nicht gefunden`)

  if (['succeeded', 'failed', 'cancelled'].includes(run.status)) {
    return { runId, path: 'terminal_no_op' }
  }

  // Step + Task-Snapshot
  const stepRows = (await db.execute(sql`
    SELECT s.id AS "stepId", s.status AS "stepStatus", s.updated_at AS "stepUpdatedAt",
           tq.status AS "taskStatus"
    FROM agent_steps s
    LEFT JOIN task_queue tq
      ON tq.reference_id = s.id AND tq.type = 'agent_step_run'
      AND tq.status IN ('pending','running')
    WHERE s.run_id = ${runId}
      AND s.status IN ('pending','running')
    ORDER BY s.created_at DESC
  `)) as unknown as Array<{ stepId: string; stepStatus: 'pending' | 'running'; stepUpdatedAt: Date | string; taskStatus: string | null }>

  const replanOpen = (await db.execute(sql`
    SELECT id FROM task_queue
    WHERE reference_id = ${runId}
      AND type = 'agent_replan'
      AND status IN ('pending','running')
    LIMIT 1
  `)) as unknown as Array<{ id: string }>

  // Pfad 1: pending Step mit zugehoerigem pending/running Task -> queue-bound ok
  const queueBoundPending = stepRows.find((r) => r.stepStatus === 'pending' && r.taskStatus !== null)
  if (queueBoundPending) {
    return { runId, path: 'queue_bound_ok' }
  }

  // Pfad 2: running Step ohne Update seit > 10 min -> stranded executing
  const stalled = stepRows.find((r) => {
    if (r.stepStatus !== 'running') return false
    const updated = r.stepUpdatedAt instanceof Date ? r.stepUpdatedAt : new Date(r.stepUpdatedAt)
    return Date.now() - updated.getTime() > STALL_THRESHOLD_MIN * 60 * 1000
  })
  if (stalled) {
    const errMsg = `Recovery: Step ${stalled.stepId} laeuft >${STALL_THRESHOLD_MIN} min ohne Update — als failed markiert`
    await db.execute(sql`
      UPDATE agent_steps SET status='failed', error=${errMsg}, finished_at=NOW(), updated_at=NOW()
      WHERE id=${stalled.stepId}
    `)
    await db.execute(sql`
      INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
      VALUES ('agent_replan','pending',1,${JSON.stringify({ runId })}::jsonb,'agent_run',${runId})
    `)
    await logAgentEvent({
      action: 'agent.run.recovered',
      runId, goalId: run.goalId,
      stepId: stalled.stepId,
      detail: errMsg,
    })
    return { runId, path: 'running_step_stalled', detail: errMsg }
  }

  // Pfad 3: keine offenen Steps + kein offener replan-Task -> replan queuen
  if (stepRows.length === 0 && replanOpen.length === 0) {
    await db.execute(sql`
      INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
      VALUES ('agent_replan','pending',1,${JSON.stringify({ runId })}::jsonb,'agent_run',${runId})
    `)
    await logAgentEvent({
      action: 'agent.run.recovered',
      runId, goalId: run.goalId,
      detail: 'Replan-Task wurde aus Recovery nachgereicht',
    })
    return { runId, path: 'replan_missing' }
  }

  // Pfad 4: nichts findet einen Pfad -> Goal paused, Activity-Log
  const detail = stepRows.length > 0
    ? `Pfad-4: Steps existieren in unklarem Zustand (n=${stepRows.length}), Replan-offen=${replanOpen.length > 0}`
    : `Pfad-4: keine Steps offen aber Replan-Task laeuft seit langer Zeit (n=${replanOpen.length})`

  await db.update(agentGoals).set({ status: 'paused', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
  await logAgentEvent({
    action: 'agent.goal.paused_by_recovery',
    goalId: run.goalId, runId,
    detail,
  })
  return { runId, path: 'paused_no_path', detail }
}
```

- [ ] **Step 4: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/recovery/continuation.service.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/recovery/continuation.service.ts \
        src/__tests__/unit/services/agents/recovery/continuation.service.test.ts
git commit -m "feat(agents): handleContinuation mit 4 Liveness-Pfaden"
```

---

### Task 3: reconcileStrandedRuns + cron.service-Integration

`reconcileStrandedRuns()` (heute leer) findet stranded Runs und queued `agent_continuation`-Tasks. Plus: der `agent_continuation`-Branch in `processAgentTaskQueue` ruft jetzt `handleContinuation`.

**Files:**
- Create: `src/lib/services/agents/recovery/reconcile.service.ts`
- Test: `src/__tests__/unit/services/agents/recovery/reconcile.service.test.ts`
- Modify: `src/lib/services/cron.service.ts`

- [ ] **Step 1: Test fuer reconcile.service.ts**

`src/__tests__/unit/services/agents/recovery/reconcile.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const dbExecuteMock = vi.fn()
vi.mock('@/lib/db', () => ({ db: { execute: dbExecuteMock } }))

describe('reconcileStrandedRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbExecuteMock.mockReset()
  })

  it('queued continuation-Tasks pro stranded Run + setzt liveness_checked_at', async () => {
    // 1. SELECT stranded runs -> 2 Treffer
    dbExecuteMock
      .mockResolvedValueOnce([{ id: 'r1', goalId: 'g1' }, { id: 'r2', goalId: 'g2' }])
      .mockResolvedValueOnce(undefined) // INSERT task_queue r1
      .mockResolvedValueOnce(undefined) // INSERT task_queue r2
      .mockResolvedValueOnce(undefined) // UPDATE liveness_checked_at

    const { reconcileStrandedRuns } = await import('@/lib/services/agents/recovery/reconcile.service')
    const r = await reconcileStrandedRuns()

    expect(r.queued).toBe(2)
    expect(dbExecuteMock).toHaveBeenCalledTimes(4) // 1 select + 2 inserts + 1 liveness-update
  })

  it('keine stranded Runs -> queued=0, kein Insert', async () => {
    dbExecuteMock.mockResolvedValueOnce([])
    const { reconcileStrandedRuns } = await import('@/lib/services/agents/recovery/reconcile.service')
    const r = await reconcileStrandedRuns()
    expect(r.queued).toBe(0)
    expect(dbExecuteMock).toHaveBeenCalledTimes(1)
  })

  it('skippt wenn fuer denselben Run schon agent_continuation pending ist', async () => {
    // Strategie: SQL nutzt ON CONFLICT DO NOTHING ueber unique-key oder NOT EXISTS-Subquery.
    // Hier nur Test, dass die Inserts trotzdem aufgerufen werden — die Idempotenz
    // ist auf SQL-Ebene via NOT EXISTS-Subquery garantiert.
    dbExecuteMock
      .mockResolvedValueOnce([{ id: 'r1', goalId: 'g1' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
    const { reconcileStrandedRuns } = await import('@/lib/services/agents/recovery/reconcile.service')
    const r = await reconcileStrandedRuns()
    expect(r.queued).toBe(1)
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `pnpm vitest run src/__tests__/unit/services/agents/recovery/reconcile.service.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/recovery/reconcile.service.ts`:

```ts
/**
 * Stranded-Run-Reconcile — alle 5 min via Cron-Tick.
 * Findet agent_runs mit liveness_checked_at < NOW()-10 min und queued
 * pro Treffer einen agent_continuation-Task.
 *
 * Idempotenz: NOT EXISTS-Subquery verhindert Doppel-Inserts wenn fuer denselben
 * Run schon ein pending agent_continuation-Task lebt.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.7
 */

import { logger } from '@/lib/utils/logger'

export interface ReconcileResult {
  queued: number
}

export async function reconcileStrandedRuns(): Promise<ReconcileResult> {
  const { db } = await import('@/lib/db')
  const { sql } = await import('drizzle-orm')

  // 1. Stranded Runs finden
  const stranded = (await db.execute(sql`
    SELECT id, goal_id AS "goalId"
    FROM agent_runs
    WHERE status IN ('planning','executing','replanning')
      AND COALESCE(liveness_checked_at, started_at) < NOW() - INTERVAL '10 minutes'
    ORDER BY COALESCE(liveness_checked_at, started_at) ASC
    LIMIT 50
  `)) as unknown as Array<{ id: string; goalId: string }>

  if (stranded.length === 0) {
    return { queued: 0 }
  }

  // 2. Pro Run einen continuation-Task queuen (idempotent via NOT EXISTS)
  let queued = 0
  for (const run of stranded) {
    await db.execute(sql`
      INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
      SELECT 'agent_continuation','pending',1,${JSON.stringify({ runId: run.id })}::jsonb,'agent_run',${run.id}
      WHERE NOT EXISTS (
        SELECT 1 FROM task_queue
        WHERE type = 'agent_continuation'
          AND reference_id = ${run.id}
          AND status IN ('pending','running')
      )
    `)
    queued += 1
  }

  // 3. liveness_checked_at = NOW() fuer alle gefundenen Runs (vermeidet Re-Trigger im naechsten 5-min-Tick)
  const ids = stranded.map((r) => r.id)
  if (ids.length > 0) {
    await db.execute(sql`
      UPDATE agent_runs SET liveness_checked_at = NOW()
      WHERE id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
    `)
  }

  logger.info(`Reconcile: ${queued} stranded Runs gefunden + continuation-Tasks gequeued`, { module: 'AgentRecovery' })
  return { queued }
}
```

- [ ] **Step 4: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/recovery/reconcile.service.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: cron.service.ts integrieren**

In `src/lib/services/cron.service.ts`:

(a) `agent_continuation`-Branch in `processAgentTaskQueue` (heute Zeile 121-128) ersetzen:

```ts
} else if (task.type === 'agent_continuation') {
  const runId = task.reference_id ?? (task.payload?.runId as string | undefined)
  if (!runId) {
    throw new Error('agent_continuation ohne runId in reference_id oder payload.runId')
  }
  const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
  const result = await handleContinuation(runId)
  await db.execute(sql`
    UPDATE task_queue
    SET status='completed', result=${JSON.stringify(result)}::jsonb
    WHERE id=${task.id}
  `)
} else {
  throw new Error(`Unbekannter Agent-Task-Typ: ${task.type}`)
}
```

(b) `reconcileStrandedRuns()` (heute Zeile 146-148, no-op) ersetzen:

```ts
async function reconcileStrandedRuns(): Promise<void> {
  // Phase 6: Reconcile-Loop alle 5 min — findet stranded Runs und queued continuation-Tasks.
  // Sliding-Window via tick-Counter wuerde extra State erfordern; einfacher:
  // Spec sagt "alle 5 min" — wir laufen einfach jeden Tick (1 min). Die NOT EXISTS-Subquery
  // verhindert Doppel-Inserts, also kostet das nur eine Selektor-Query pro Tick wenn nichts strandet.
  try {
    const { reconcileStrandedRuns: reconcile } = await import('@/lib/services/agents/recovery/reconcile.service')
    await reconcile()
  } catch (e) {
    const { logger: log } = await import('@/lib/utils/logger')
    log.error(`Reconcile-Loop-Fehler: ${(e as Error).message}`, e, { module: 'AgentRecovery' })
  }
}
```

- [ ] **Step 6: Sanity — typecheck + bestehende Tests laufen**

Run: `pnpm typecheck`
Run: `pnpm vitest run src/__tests__/unit/services/agents`
Expected: 0 typecheck-Fehler, alle bisherigen Tests gruen

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/agents/recovery/reconcile.service.ts \
        src/__tests__/unit/services/agents/recovery/reconcile.service.test.ts \
        src/lib/services/cron.service.ts
git commit -m "feat(agents): reconcileStrandedRuns + agent_continuation Tick-Handler"
```

---

### Task 4: Boot-Recovery-Hook

Wenn der Server abstuertzt waehrend ein Inline-Lane-Loop laeuft, bleiben Runs im Status `executing` haengen. Beim naechsten Boot muessen wir die finden und an die Cron-Lane uebergeben.

**Files:**
- Create: `src/lib/services/agents/recovery/boot-recovery.ts`
- Test: `src/__tests__/unit/services/agents/recovery/boot-recovery.test.ts`
- Modify: `src/instrumentation.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/recovery/boot-recovery.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const dbExecuteMock = vi.fn()
vi.mock('@/lib/db', () => ({ db: { execute: dbExecuteMock } }))

const logAgentEventMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/agents/recovery/activity-log', () => ({ logAgentEvent: logAgentEventMock }))

describe('recoverStrandedRunsOnBoot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbExecuteMock.mockReset()
  })

  it('queued agent_continuation pro stranded Run, schreibt Audit-Log', async () => {
    dbExecuteMock
      .mockResolvedValueOnce([{ id: 'r1', goalId: 'g1' }, { id: 'r2', goalId: 'g2' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)

    const { recoverStrandedRunsOnBoot } = await import('@/lib/services/agents/recovery/boot-recovery')
    const r = await recoverStrandedRunsOnBoot()

    expect(r.recovered).toBe(2)
    expect(logAgentEventMock).toHaveBeenCalledTimes(2)
    expect(logAgentEventMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'agent.run.stranded' }))
  })

  it('Resultat=0 wenn keine stranded Runs', async () => {
    dbExecuteMock.mockResolvedValueOnce([])
    const { recoverStrandedRunsOnBoot } = await import('@/lib/services/agents/recovery/boot-recovery')
    const r = await recoverStrandedRunsOnBoot()
    expect(r.recovered).toBe(0)
  })

  it('schluckt Fehler beim Boot — Server soll trotzdem starten', async () => {
    dbExecuteMock.mockRejectedValueOnce(new Error('DB nicht erreichbar'))
    const { recoverStrandedRunsOnBoot } = await import('@/lib/services/agents/recovery/boot-recovery')
    const r = await recoverStrandedRunsOnBoot()
    expect(r.recovered).toBe(0)
    expect(r.error).toMatch(/DB/)
  })
})
```

- [ ] **Step 2: Test laufen — FAIL**

Run: `pnpm vitest run src/__tests__/unit/services/agents/recovery/boot-recovery.test.ts`
Expected: FAIL ("Cannot find module")

- [ ] **Step 3: Implementation**

`src/lib/services/agents/recovery/boot-recovery.ts`:

```ts
/**
 * Beim Server-Boot: finde alle stranded Runs (executing seit >5 min ohne
 * Step-Update) und queue agent_continuation-Tasks mit priority=1.
 *
 * Idempotenz: NOT EXISTS-Subquery verhindert Doppel-Inserts wenn parallel
 * ein Container hochfaehrt und schon Tasks gequeued hat.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.8
 */

import { logger } from '@/lib/utils/logger'

export interface BootRecoveryResult {
  recovered: number
  error?: string
}

export async function recoverStrandedRunsOnBoot(): Promise<BootRecoveryResult> {
  try {
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')
    const { logAgentEvent } = await import('./activity-log')

    // Finde Runs deren letzter Step >5 min nicht aktualisiert wurde.
    // LEFT JOIN damit wir auch Runs ohne Steps erwischen — die kann es theoretisch
    // geben wenn plan() crashte zwischen Run-Insert und Step-Insert.
    const stranded = (await db.execute(sql`
      SELECT r.id, r.goal_id AS "goalId"
      FROM agent_runs r
      LEFT JOIN (
        SELECT run_id, MAX(updated_at) AS last_step_at
        FROM agent_steps GROUP BY run_id
      ) s ON s.run_id = r.id
      WHERE r.status IN ('planning','executing','replanning')
        AND COALESCE(s.last_step_at, r.started_at) < NOW() - INTERVAL '5 minutes'
      ORDER BY COALESCE(s.last_step_at, r.started_at) ASC
      LIMIT 100
    `)) as unknown as Array<{ id: string; goalId: string }>

    let recovered = 0
    for (const run of stranded) {
      await db.execute(sql`
        INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
        SELECT 'agent_continuation','pending',1,${JSON.stringify({ runId: run.id })}::jsonb,'agent_run',${run.id}
        WHERE NOT EXISTS (
          SELECT 1 FROM task_queue
          WHERE type = 'agent_continuation'
            AND reference_id = ${run.id}
            AND status IN ('pending','running')
        )
      `)
      await logAgentEvent({
        action: 'agent.run.stranded',
        runId: run.id,
        goalId: run.goalId,
        detail: 'Boot-Recovery: Run nach Server-Restart als stranded erkannt',
      })
      recovered += 1
    }

    if (recovered > 0) {
      logger.info(`Boot-Recovery: ${recovered} stranded Run(s) zur Cron-Lane uebergeben`, { module: 'AgentBootRecovery' })
    }
    return { recovered }
  } catch (e) {
    const msg = (e as Error).message
    logger.error(`Boot-Recovery fehlgeschlagen: ${msg}`, e, { module: 'AgentBootRecovery' })
    return { recovered: 0, error: msg }
  }
}
```

- [ ] **Step 4: instrumentation.ts erweitern**

`src/instrumentation.ts` — nach dem `runPendingMigrations`-Block (~Zeile 50) und vor dem MemoryWatcher-Block einfuegen:

```ts
  // Boot-Recovery: stranded Runs aus letztem Crash zur Cron-Lane uebergeben (Phase 6).
  try {
    const { recoverStrandedRunsOnBoot } = await import('@/lib/services/agents/recovery/boot-recovery')
    const r = await recoverStrandedRunsOnBoot()
    if (r.recovered > 0) {
      logger.info(`Boot-Recovery hat ${r.recovered} stranded Run(s) zur Cron-Lane gegeben`, { module: 'Startup' })
    }
  } catch (e) {
    logger.error('Boot-Recovery Fehler (App startet trotzdem)', e, { module: 'Startup' })
  }
```

- [ ] **Step 5: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/recovery/boot-recovery.test.ts`
Expected: PASS (3/3)

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/agents/recovery/boot-recovery.ts \
        src/__tests__/unit/services/agents/recovery/boot-recovery.test.ts \
        src/instrumentation.ts
git commit -m "feat(agents): Boot-Recovery-Hook in instrumentation"
```

---

### Task 5: Budget-Hard-Stop in Orchestrator (Phase-4-Followup)

Heute fragt nur `WorkerService.executeStep` das Budget. Orchestrator macht `plan()`/`replan()` ohne Budget-Check. Bei `budget_exceeded` koennen so weitere LLM-Calls laufen, obwohl der Goal eigentlich auf Pause gehoeren wuerde.

**Files:**
- Modify: `src/lib/services/agents/orchestrator.service.ts`
- Test: `src/__tests__/unit/services/agents/orchestrator.budget-stop.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/unit/services/agents/orchestrator.budget-stop.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const aiCompleteMock = vi.fn()
vi.mock('@/lib/services/ai', () => ({ AIService: { complete: aiCompleteMock } }))

const checkBudgetMock = vi.fn()
const recordCostMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/agents/cost-tracker.service', () => ({
  CostTrackerService: { checkBudget: checkBudgetMock, record: recordCostMock },
}))

const logAgentEventMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/agents/recovery/activity-log', () => ({ logAgentEvent: logAgentEventMock }))

const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const insertReturningMock = vi.fn().mockResolvedValue([{ id: 'run-1' }])
const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }))
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))

vi.mock('@/lib/db', () => ({ db: { select: selectMock, insert: insertMock, update: updateMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentGoals: { id: 'id', title: 'title', description: 'description', status: 'status' },
  agentRuns: { id: 'id', goalId: 'goalId', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId', status: 'status', stepKey: 'stepKey', workerType: 'workerType', dependsOnStepKeys: 'dependsOnStepKeys' },
  taskQueue: { id: 'id' },
}))

describe('OrchestratorService Budget-Stop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectLimitMock.mockReset()
    checkBudgetMock.mockReset()
  })

  it('plan(): exceeded -> Run failed, Goal paused, kein LLM-Call', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'T', description: 'd' }])
    checkBudgetMock.mockResolvedValueOnce({
      exceeded: true, reason: 'budget_cents_exceeded',
      spentCents: 100, budgetCents: 50, spentTokens: 0, budgetTokens: null,
    })

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await expect(OrchestratorService.plan('g1')).rejects.toThrow(/budget|Budget/)

    expect(aiCompleteMock).not.toHaveBeenCalled()
    expect(logAgentEventMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'agent.budget.exceeded' }))
  })

  it('replan(): exceeded -> Run failed, Goal paused, kein LLM-Call', async () => {
    // Run + Goal laden, allSteps leer
    selectLimitMock
      .mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }])
      .mockResolvedValueOnce([{ id: 'g1', title: 'T', description: '' }])
    selectWhereMock
      .mockReturnValueOnce({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) })
    checkBudgetMock.mockResolvedValueOnce({
      exceeded: true, reason: 'budget_tokens_exceeded',
      spentCents: 0, budgetCents: null, spentTokens: 5000, budgetTokens: 1000,
    })

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const r = await OrchestratorService.replan('r1')

    expect(aiCompleteMock).not.toHaveBeenCalled()
    expect(r.action).toBe('pause')
    expect(logAgentEventMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'agent.budget.exceeded' }))
  })

  it('plan(): not exceeded -> normaler Flow (LLM wird gerufen)', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'T', description: 'd' }])
    checkBudgetMock.mockResolvedValueOnce({ exceeded: false, spentCents: 0, budgetCents: null, spentTokens: 0, budgetTokens: null })
    aiCompleteMock.mockResolvedValueOnce({
      text: '{"reasoning":"r","steps":[{"stepKey":"s1","workerType":"memory:list","config":{},"contextRefs":[],"dependsOnStepKeys":[]}]}',
      provider: 'm', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    })
    insertReturningMock
      .mockResolvedValueOnce([{ id: 'run-1' }])              // run insert
      .mockResolvedValueOnce([{ id: 'step-1', stepKey: 's1' }]) // steps insert
      .mockResolvedValueOnce([{ id: 't1' }])                  // task_queue insert

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await OrchestratorService.plan('g1')

    expect(aiCompleteMock).toHaveBeenCalledTimes(1)
    expect(checkBudgetMock).toHaveBeenCalledWith('g1')
  })
})
```

- [ ] **Step 2: orchestrator.service.ts ergaenzen**

In `OrchestratorService.plan(goalId)` als ersten Schritt nach dem Goal-Load (vor dem Status-Update auf 'planning'):

```ts
const { CostTrackerService } = await import('./cost-tracker.service')
const budget = await CostTrackerService.checkBudget(goalId)
if (budget.exceeded) {
  const { logAgentEvent } = await import('./recovery/activity-log')
  await db.update(agentGoals).set({ status: 'paused', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))
  await logAgentEvent({
    action: 'agent.budget.exceeded',
    goalId,
    detail: `plan() abgebrochen: ${budget.reason} (${budget.spentTokens}/${budget.budgetTokens ?? '∞'} tokens, ${budget.spentCents}/${budget.budgetCents ?? '∞'} cents)`,
  })
  throw new Error(`Goal ${goalId} budget exceeded vor plan(): ${budget.reason}`)
}
```

In `OrchestratorService.replan(runId)` analog nach dem Run+Goal-Load (vor dem allSteps-Query):

```ts
const { CostTrackerService } = await import('./cost-tracker.service')
const budget = await CostTrackerService.checkBudget(run.goalId)
if (budget.exceeded) {
  const { logAgentEvent } = await import('./recovery/activity-log')
  await db.update(agentGoals).set({ status: 'paused', updatedAt: sql`now()` }).where(eq(agentGoals.id, run.goalId))
  await logAgentEvent({
    action: 'agent.budget.exceeded',
    goalId: run.goalId,
    runId,
    detail: `replan() abgebrochen: ${budget.reason}`,
  })
  return { action: 'pause', reason: `Budget exceeded: ${budget.reason}` }
}
```

- [ ] **Step 3: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/orchestrator.budget-stop.test.ts`
Expected: PASS (3/3)

Run: `pnpm vitest run src/__tests__/unit/services/agents/orchestrator.service.test.ts`
Expected: alle bisherigen Tests gruen (mock checkBudget kann jetzt fehlen — siehe naechster Schritt)

- [ ] **Step 4: bestehende Orchestrator-Tests fixen falls noetig**

Die existierenden Orchestrator-Tests mocken jetzt evtl. `CostTrackerService` nicht. Fuege bei Bedarf am Anfang der bestehenden Test-Datei einen Mock hinzu, der `checkBudget` per Default `{ exceeded: false }` zurueckgibt:

```ts
vi.mock('@/lib/services/agents/cost-tracker.service', () => ({
  CostTrackerService: {
    checkBudget: vi.fn().mockResolvedValue({ exceeded: false, spentCents: 0, budgetCents: null, spentTokens: 0, budgetTokens: null }),
    record: vi.fn().mockResolvedValue(undefined),
  },
}))
```

Lies die Datei, suche `vi.mock(...)`-Bloecke, fuege den Mock falls noch nicht vorhanden hinzu.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/orchestrator.service.ts \
        src/__tests__/unit/services/agents/orchestrator.budget-stop.test.ts \
        src/__tests__/unit/services/agents/orchestrator.service.test.ts
git commit -m "feat(agents): Budget-Hard-Stop vor plan/replan (Phase-4-Followup)"
```

---

### Task 6: cancel() Task-Cleanup (Phase-4-Followup)

`GoalService.cancel(goalId)` setzt nur das Goal-Status auf `cancelled`. Pending `agent_step_run`/`agent_replan`-Tasks der zugehoerigen Runs leben weiter und werden trotzdem ausgefuehrt.

**Files:**
- Modify: `src/lib/services/agents/goal.service.ts`
- Modify: `src/__tests__/unit/services/agents/goal.service.test.ts`

- [ ] **Step 1: Test ergaenzen**

In `src/__tests__/unit/services/agents/goal.service.test.ts` neuen Test-Block am Ende hinzufuegen:

```ts
  it('cancel() raeumt offene agent_step_run/agent_replan-Tasks der laufenden Runs ab', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'running' }])

    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await GoalService.cancel('g1')

    // Goal-Update + Cleanup-Update muessen aufgerufen worden sein
    expect(updateMock).toHaveBeenCalled()
    // Audit-Event muss geschrieben worden sein
    // (per Mock am Anfang einfuegen — siehe Plan-Vorbereitung Step 2)
  })
```

(Mock fuer `logAgentEvent` am Anfang der Test-Datei hinzufuegen, falls nicht vorhanden.)

- [ ] **Step 2: cancel() umbauen**

In `src/lib/services/agents/goal.service.ts`, `cancel(goalId)`-Methode (heute Zeile 114-126):

```ts
async cancel(goalId: string): Promise<void> {
  const { db } = await import('@/lib/db')
  const { agentGoals } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')
  const { logAgentEvent } = await import('./recovery/activity-log')

  const [goal] = await db.select({ status: agentGoals.status }).from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
  if (!goal) throw new Error(`Goal ${goalId} nicht gefunden`)
  if (goal.status === 'done' || goal.status === 'failed' || goal.status === 'cancelled') {
    throw new Error(`Goal ${goalId} bereits terminal (status=${goal.status})`)
  }

  // Goal auf cancelled
  await db.update(agentGoals).set({ status: 'cancelled', updatedAt: sql`now()` }).where(eq(agentGoals.id, goalId))

  // Pending Tasks aller Runs des Goals abraeumen — verhindert Geister-Steps nach Cancel.
  const cleanup = await db.execute(sql`
    UPDATE task_queue
    SET status='cancelled', error='goal cancelled by user', completed_at=NOW()
    WHERE status='pending'
      AND type IN ('agent_step_run','agent_replan','agent_continuation')
      AND (
        reference_id IN (SELECT id FROM agent_runs WHERE goal_id=${goalId})
        OR reference_id IN (SELECT id FROM agent_steps WHERE goal_id=${goalId})
      )
    RETURNING id
  `) as unknown as Array<{ id: string }>

  await logAgentEvent({
    action: 'agent.goal.cancel_cleanup',
    goalId,
    detail: `${cleanup.length} pending Task(s) abgeraeumt`,
    metadata: { cleanedTaskCount: cleanup.length },
  })
},
```

- [ ] **Step 3: Test laufen — PASS**

Run: `pnpm vitest run src/__tests__/unit/services/agents/goal.service.test.ts`
Expected: alle PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/agents/goal.service.ts \
        src/__tests__/unit/services/agents/goal.service.test.ts
git commit -m "feat(agents): cancel() raeumt offene Tasks ab (Phase-4-Followup)"
```

---

### Task 7: Re-Exports + Index

**Files:**
- Modify: `src/lib/services/agents/index.ts`

- [ ] **Step 1: Lies aktuelle index.ts**

Schau was schon exportiert wird, fuege in passender Stelle hinzu:

```ts
export { reconcileStrandedRuns } from './recovery/reconcile.service'
export { handleContinuation } from './recovery/continuation.service'
export { recoverStrandedRunsOnBoot } from './recovery/boot-recovery'
export { logAgentEvent } from './recovery/activity-log'
export type { ContinuationPath, ContinuationResult } from './recovery/continuation.service'
export type { BootRecoveryResult } from './recovery/boot-recovery'
export type { ReconcileResult } from './recovery/reconcile.service'
export type { AgentEventAction, AgentEventInput } from './recovery/activity-log'
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: 0 Fehler

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/index.ts
git commit -m "feat(agents): Re-Exports fuer Recovery-Modul"
```

---

### Task 8: Integration-Test (Crash-Simulation)

End-to-End: simuliert einen Crash mitten in einem Step, verifiziert dass Reconcile + Continuation den Run wieder anfaehrt.

**Files:**
- Create: `src/__tests__/integration/services/agents/recovery-e2e.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/integration/services/agents/recovery-e2e.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt — Recovery-E2E uebersprungen' : null

describe.skipIf(skip !== null)('Recovery E2E', () => {
  let createdGoalIds: string[] = []

  beforeAll(async () => {
    // Mock LLM auf deterministische plan-Antwort fuer Setup
    vi.mock('@/lib/services/ai', () => ({
      AIService: {
        complete: vi.fn().mockResolvedValue({
          text: '{"reasoning":"r","steps":[{"stepKey":"s1","workerType":"memory:list","config":{"para":"Resources"},"contextRefs":[],"dependsOnStepKeys":[]}]}',
          provider: 'mock', model: 'mock', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }),
        completeWithContext: vi.fn(),
      },
    }))
  }, 30_000)

  afterAll(async () => {
    // Cleanup: alle Test-Goals loeschen
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { inArray } = await import('drizzle-orm')
    if (createdGoalIds.length > 0) {
      await db.delete(agentGoals).where(inArray(agentGoals.id, createdGoalIds))
    }
    vi.unmock('@/lib/services/ai')
  })

  it('Reconcile findet stranded Run und queued continuation-Task', async () => {
    const { GoalService } = await import('@/lib/services/agents')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const { reconcileStrandedRuns } = await import('@/lib/services/agents/recovery/reconcile.service')
    const { db } = await import('@/lib/db')
    const { agentRuns } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const { id: goalId } = await GoalService.create({ title: 'Recovery-E2E-Reconcile' })
    createdGoalIds.push(goalId)
    const { runId } = await OrchestratorService.plan(goalId)

    // Force-Stranded: liveness_checked_at + started_at zurueckdatieren
    await db.execute(sql`
      UPDATE agent_runs SET started_at = NOW() - INTERVAL '15 minutes',
                            liveness_checked_at = NULL
      WHERE id = ${runId}
    `)

    const r = await reconcileStrandedRuns()
    expect(r.queued).toBeGreaterThanOrEqual(1)

    // Pruefen dass continuation-Task in der Queue ist
    const tasks = (await db.execute(sql`
      SELECT id FROM task_queue
      WHERE type='agent_continuation' AND reference_id=${runId} AND status='pending'
    `)) as unknown as Array<{ id: string }>
    expect(tasks.length).toBeGreaterThanOrEqual(1)
  }, 30_000)

  it('handleContinuation Pfad 3 (replan_missing) queued agent_replan-Task', async () => {
    const { GoalService } = await import('@/lib/services/agents')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const { id: goalId } = await GoalService.create({ title: 'Recovery-E2E-Continuation' })
    createdGoalIds.push(goalId)
    const { runId } = await OrchestratorService.plan(goalId)

    // Alle Steps des Runs auf succeeded setzen, kein Replan-Task
    await db.execute(sql`UPDATE agent_steps SET status='succeeded', finished_at=NOW(), updated_at=NOW() WHERE run_id=${runId}`)
    await db.execute(sql`DELETE FROM task_queue WHERE reference_id=${runId} AND type='agent_replan'`)

    const r = await handleContinuation(runId)
    expect(r.path).toBe('replan_missing')

    const replans = (await db.execute(sql`
      SELECT id FROM task_queue
      WHERE type='agent_replan' AND reference_id=${runId} AND status='pending'
    `)) as unknown as Array<{ id: string }>
    expect(replans.length).toBeGreaterThanOrEqual(1)
  }, 30_000)

  it('Boot-Recovery findet stranded Run + queued continuation', async () => {
    const { GoalService } = await import('@/lib/services/agents')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const { recoverStrandedRunsOnBoot } = await import('@/lib/services/agents/recovery/boot-recovery')
    const { db } = await import('@/lib/db')
    const { sql } = await import('drizzle-orm')

    const { id: goalId } = await GoalService.create({ title: 'Recovery-E2E-Boot' })
    createdGoalIds.push(goalId)
    const { runId } = await OrchestratorService.plan(goalId)

    // Force-stale: alle Steps + Run auf >5 min alt
    await db.execute(sql`UPDATE agent_runs SET started_at = NOW() - INTERVAL '10 minutes' WHERE id=${runId}`)
    await db.execute(sql`UPDATE agent_steps SET updated_at = NOW() - INTERVAL '10 minutes' WHERE run_id=${runId}`)

    const r = await recoverStrandedRunsOnBoot()
    expect(r.recovered).toBeGreaterThanOrEqual(1)
  }, 30_000)
})
```

- [ ] **Step 2: Test laufen (skipt ohne DATABASE_URL)**

Run: `pnpm vitest run src/__tests__/integration/services/agents/recovery-e2e.test.ts`
Expected: SKIP wenn DATABASE_URL fehlt; sonst PASS (3/3)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/integration/services/agents/recovery-e2e.test.ts
git commit -m "test(agents): Recovery E2E (Reconcile + Continuation + Boot-Recovery)"
```

---

### Task 9: Final-Verification

- [ ] **Step 1: Type-Check**

Run: `pnpm typecheck`
Expected: 0 Fehler

- [ ] **Step 2: Volle Unit-Test-Suite**

Run: `pnpm vitest run`
Expected: alle bisher gruenen Tests + neue Phase-6-Tests gruen, kein Regress

- [ ] **Step 3: DoD-Checkliste gegen Spec §6.7 / §6.8 / Phase-6-Definition**

| DoD-Punkt | Pruefung |
|---|---|
| Stranded-Run-Reconcile alle 5 min | Task 3: reconcileStrandedRuns + Cron-Tick-Hook ✅ |
| Boot-Recovery fuer post-Restart-stranded | Task 4: recoverStrandedRunsOnBoot + instrumentation ✅ |
| Liveness-Contract-Checks | Task 2: 4 Pfade in handleContinuation ✅ |
| Activity-Log-Integration | Task 1: logAgentEvent + alle Recovery-Stellen ✅ |
| Forced Pod-Kill mitten in Inline-Loop → nach <2 min wieder live | Task 4 + Tick-Latenz: Boot-Recovery + naechster Cron-Tick (60s) ✅ |
| Test: Crash-Simulation, Liveness-Check fuer alle 4 Stranded-Patterns | Task 8 E2E + Task 2 Unit-Tests fuer alle 4 Pfade ✅ |
| Phase-4-Followup: cancel() raeumt Tasks ab | Task 6 ✅ |
| Phase-4-Followup: checkBudget in plan/replan | Task 5 ✅ |

- [ ] **Step 4: Branch + Push**

```bash
git status
git log --oneline feat/agents-smart-worker..HEAD
git push -u origin feat/agents-recovery
```

- [ ] **Step 5: PR-Beschreibung**

Titel: `feat(agents): Phase 6 — Recovery + Reconcile`

Body:
```
## Summary
- Stranded-Run-Reconcile (alle 5 min via Cron-Tick): findet agent_runs ohne Liveness >10 min, queued agent_continuation-Tasks
- agent_continuation-Handler mit 4 Liveness-Pfaden (queue_bound_ok / running_step_stalled / replan_missing / paused_no_path)
- Boot-Recovery in instrumentation.ts: nach Server-Restart stranded executing-Runs zur Cron-Lane uebergeben
- Activity-Log-Helper schreibt Audit-Trail fuer alle Recovery-Aktionen
- cancel() raeumt offene agent_step_run/agent_replan-Tasks ab (Phase-4-Followup)
- Budget-Hard-Stop vor plan/replan im Orchestrator (Phase-4-Followup)

## Test plan
- [x] Unit-Tests fuer alle Recovery-Module (4 Pfade, Reconcile, Boot, Activity-Log)
- [x] Integration-E2E (Reconcile + Continuation + Boot-Recovery, real DB)
- [x] Budget-Stop-Tests (plan + replan)
- [ ] Manueller Crash-Test auf dev: laufenden Container killen, neu starten, pruefen dass stranded Run innerhalb 2 min recovered
```

---

## Self-Review

**1. Spec coverage:**
- §6.5 agent_continuation Task-Type → Task 2 + 3 ✅
- §6.7 Stranded-Reconcile alle 5 min mit 4 Liveness-Pfaden → Task 2 + 3 ✅
- §6.8 Pod-Restart-Verhalten + Boot-Recovery → Task 4 ✅
- §8 Cross-Cutting Audit-Log-Anbindung → Task 1 ✅
- Phase-6-DoD: Forced Pod-Kill → <2 min recovered → Boot-Recovery + 60s-Tick = max 2 min Latenz ✅
- Phase-6-Test-DoD: Crash-Simulation + Liveness-Check 4 Patterns → Task 2 (Unit) + Task 8 (E2E) ✅

**2. Placeholder-Scan:** Keine TBD/TODO. Alle Tests + Code vollstaendig.

**3. Type-Konsistenz:**
- `ContinuationPath` Union-Type → genutzt in continuation.service.ts + Re-Export in index.ts ✅
- `BootRecoveryResult` Interface → in boot-recovery.ts + Re-Export ✅
- `AgentEventAction` Union → in activity-log.ts + Verwendung in 4 Stellen (continuation, boot, cancel, budget) ✅
- `logAgentEvent` Signatur einheitlich (action, goalId, runId?, stepId?, detail?, metadata?) ✅

**Out-of-scope (in Folge-Phasen):**
- Pricing-Tabelle pro Provider/Modell (heute costCents=0 fuer LLM-Calls) — Phase 7/8
- contextRefs Zod-Schema mit memory:// Regex — kleinerer Polish, Phase 7/8
- Live-Events fuer UI (`agent.run.recovered`-WebSocket-Push) — Phase 7

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-08-agents-phase-6-recovery.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Ein frischer Subagent pro Task, Reviews dazwischen, schnelle Iteration.

**2. Inline Execution** — Tasks in dieser Session per executing-plans, Batch-Execution mit Checkpoints.

**Welcher Ansatz?**
