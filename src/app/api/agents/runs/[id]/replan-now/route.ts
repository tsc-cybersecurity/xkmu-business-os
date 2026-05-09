/**
 * POST /api/agents/runs/[id]/replan-now
 *
 * Queued sofortiges agent_replan fuer den angegebenen Run.
 * Setzt einen Task-Queue-Eintrag mit priority=1.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §7.4 (Manual-Trigger-Hooks)
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { id: runId } = await params

  const { db } = await import('@/lib/db')
  const { sql } = await import('drizzle-orm')

  await db.execute(sql`
    INSERT INTO task_queue (type, status, priority, payload, reference_type, reference_id)
    VALUES ('agent_replan','pending',1,${JSON.stringify({ runId })}::jsonb,'agent_run',${runId})
  `)

  return NextResponse.json({ ok: true })
}
