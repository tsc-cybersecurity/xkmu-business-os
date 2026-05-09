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
