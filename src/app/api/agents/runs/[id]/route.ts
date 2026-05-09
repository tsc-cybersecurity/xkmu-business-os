/**
 * GET /api/agents/runs/[id]
 *
 * Liefert Run-Detail: der Run selbst + alle Steps (geordnet nach createdAt) +
 * alle Cost-Events (geordnet nach occurredAt).
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §7 (Run-Detail-Page)
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { agentRuns, agentSteps, agentCostEvents } from '@/lib/db/schema'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { id } = await params

  // 1. Run-Lookup
  const runs = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.id, id))
    .limit(1)

  if (runs.length === 0) {
    return apiNotFound('Run nicht gefunden')
  }

  const run = runs[0]

  // 2. Steps (chronologisch)
  const steps = await db
    .select()
    .from(agentSteps)
    .where(eq(agentSteps.runId, id))
    .orderBy(agentSteps.createdAt)

  // 3. Cost-Events (chronologisch)
  const costEvents = await db
    .select()
    .from(agentCostEvents)
    .where(eq(agentCostEvents.runId, id))
    .orderBy(agentCostEvents.occurredAt)

  return NextResponse.json({ run, steps, costEvents })
}
