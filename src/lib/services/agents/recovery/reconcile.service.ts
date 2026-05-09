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
