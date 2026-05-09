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
  const { agentRuns, agentGoals, agentSteps, taskQueue } = await import('@/lib/db/schema')
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

  // Step + Task-Snapshot via raw SQL (JOIN ueber Step + Task-Status)
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
    await db
      .update(agentSteps)
      .set({ status: 'failed', error: errMsg, finishedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(agentSteps.id, stalled.stepId))
    await db
      .insert(taskQueue)
      .values({
        type: 'agent_replan',
        status: 'pending',
        priority: 1,
        payload: { runId },
        referenceType: 'agent_run',
        referenceId: runId,
      } as never)
    await logAgentEvent({
      action: 'agent.run.recovered',
      runId,
      goalId: run.goalId,
      stepId: stalled.stepId,
      detail: errMsg,
    })
    return { runId, path: 'running_step_stalled', detail: errMsg }
  }

  // Pfad 3: keine offenen Steps + kein offener replan-Task -> replan queuen
  if (stepRows.length === 0 && replanOpen.length === 0) {
    await db
      .insert(taskQueue)
      .values({
        type: 'agent_replan',
        status: 'pending',
        priority: 1,
        payload: { runId },
        referenceType: 'agent_run',
        referenceId: runId,
      } as never)
    await logAgentEvent({
      action: 'agent.run.recovered',
      runId,
      goalId: run.goalId,
      detail: 'Replan-Task wurde aus Recovery nachgereicht',
    })
    return { runId, path: 'replan_missing' }
  }

  // Pfad 4: nichts findet einen Pfad -> Goal paused, Activity-Log
  const detail =
    stepRows.length > 0
      ? `Pfad-4: Steps existieren in unklarem Zustand (n=${stepRows.length}), Replan-offen=${replanOpen.length > 0}`
      : `Pfad-4: keine Steps offen aber Replan-Task laeuft seit langer Zeit (n=${replanOpen.length})`

  await db
    .update(agentGoals)
    .set({ status: 'paused', updatedAt: sql`now()` })
    .where(eq(agentGoals.id, run.goalId))
  await logAgentEvent({
    action: 'agent.goal.paused_by_recovery',
    goalId: run.goalId,
    runId,
    detail,
  })
  return { runId, path: 'paused_no_path', detail }
}
