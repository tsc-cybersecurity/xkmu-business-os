/**
 * POST /api/agents/goals/[id]/run-immediate
 *
 * Setzt executionMode='immediate' auf dem Goal und queued sofortiges agent_replan
 * fuer den letzten Run (falls vorhanden).
 *
 * 400 wenn Goal terminal (done/failed/cancelled).
 * 404 wenn Goal nicht existiert.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §7.4 (Manual-Trigger-Hooks)
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound, apiError } from '@/lib/utils/api-response'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { id: goalId } = await params

  const { db } = await import('@/lib/db')
  const { agentGoals, agentRuns } = await import('@/lib/db/schema')
  const { eq, desc, sql } = await import('drizzle-orm')

  const [goal] = await db.select().from(agentGoals).where(eq(agentGoals.id, goalId)).limit(1)
  if (!goal) return apiNotFound('Goal nicht gefunden')

  if (['done', 'failed', 'cancelled'].includes(goal.status)) {
    return apiError('BAD_REQUEST', `Goal ist terminal (status=${goal.status})`, 400)
  }

  // executionMode auf immediate setzen (auch wenn vorher cron)
  await db
    .update(agentGoals)
    .set({ executionMode: 'immediate', updatedAt: sql`now()` })
    .where(eq(agentGoals.id, goalId))

  // Letzten Run finden + replan-Task queuen
  const [latestRun] = await db
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(eq(agentRuns.goalId, goalId))
    .orderBy(desc(agentRuns.createdAt))
    .limit(1)

  if (latestRun) {
    await db.execute(sql`
      INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
      VALUES ('agent_replan','pending',1,${JSON.stringify({ runId: latestRun.id })}::jsonb,'agent_run',${latestRun.id})
    `)
  }

  return NextResponse.json({ ok: true, runId: latestRun?.id ?? null })
}
