/**
 * POST /api/agents/steps/[id]/retry
 *
 * Setzt einen fehlgeschlagenen Step zurueck auf pending (null'd error/finishedAt/startedAt)
 * und queued einen agent_step_run-Task mit priority=1.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §7.4 (Manual-Trigger-Hooks)
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound } from '@/lib/utils/api-response'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { id: stepId } = await params

  const { db } = await import('@/lib/db')
  const { agentSteps } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')

  const [step] = await db.select().from(agentSteps).where(eq(agentSteps.id, stepId)).limit(1)
  if (!step) return apiNotFound('Step nicht gefunden')

  await db
    .update(agentSteps)
    .set({ status: 'pending', error: null, finishedAt: null, startedAt: null, updatedAt: sql`now()` })
    .where(eq(agentSteps.id, stepId))

  await db.execute(sql`
    INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
    VALUES ('agent_step_run','pending',1,${JSON.stringify({ stepId, runId: step.runId, goalId: step.goalId })}::jsonb,'agent_step',${stepId})
  `)

  return NextResponse.json({ ok: true })
}
