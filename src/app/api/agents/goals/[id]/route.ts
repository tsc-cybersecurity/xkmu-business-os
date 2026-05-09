import { NextRequest, NextResponse } from 'next/server'
import { GoalService } from '@/lib/services/agents'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params
  const detail = await GoalService.getDetail(id)
  if (!detail) return NextResponse.json({ error: 'Goal nicht gefunden' }, { status: 404 })
  return NextResponse.json(detail)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON-Body erwartet' }, { status: 400 })
  }
  const input = body as {
    action?: string
    title?: unknown
    description?: unknown
    budgetCents?: unknown
    budgetTokens?: unknown
    priority?: unknown
  }

  try {
    if (input.action === 'pause') {
      await GoalService.pause(id)
    } else if (input.action === 'resume') {
      await GoalService.resume(id)
    } else if (input.action === 'cancel') {
      await GoalService.cancel(id)
    } else if (input.action === 'start') {
      const r = await GoalService.start(id)
      return NextResponse.json({ runId: r.runId })
    } else if (input.action === 'update' || input.title !== undefined || input.description !== undefined || input.budgetCents !== undefined || input.budgetTokens !== undefined || input.priority !== undefined) {
      // Edit Goal-Felder (Title/Description/Budget/Priority)
      const update: Record<string, unknown> = {}
      if (typeof input.title === 'string' && input.title.trim().length > 0) update.title = input.title.trim()
      if (typeof input.description === 'string') update.description = input.description
      if (typeof input.budgetCents === 'number' || input.budgetCents === null) update.budgetCents = input.budgetCents
      if (typeof input.budgetTokens === 'number' || input.budgetTokens === null) update.budgetTokens = input.budgetTokens
      if (typeof input.priority === 'number') update.priority = input.priority
      if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Kein Update-Feld' }, { status: 400 })

      const { db } = await import('@/lib/db')
      const { agentGoals } = await import('@/lib/db/schema')
      const { eq, sql } = await import('drizzle-orm')
      await db.update(agentGoals).set({ ...update, updatedAt: sql`now()` }).where(eq(agentGoals.id, id))
    } else {
      return NextResponse.json({ error: "action muss eines von 'pause'|'resume'|'cancel'|'start'|'update' sein, oder einzelne Felder im Body" }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  try {
    const { db } = await import('@/lib/db')
    const { agentGoals } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    // CASCADE auf agent_runs/agent_steps via FK ON DELETE CASCADE (Migration 020)
    await db.delete(agentGoals).where(eq(agentGoals.id, id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
