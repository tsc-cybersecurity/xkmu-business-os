import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound, apiError } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  const { db } = await import('@/lib/db')
  const { agentGoalTemplates } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const [row] = await db.select().from(agentGoalTemplates).where(eq(agentGoalTemplates.id, id)).limit(1)
  if (!row) return apiNotFound('Template nicht gefunden')
  return NextResponse.json(row)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('BAD_REQUEST', 'Body nicht parseable', 400) }

  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string') update.name = body.name
  if (typeof body.description === 'string') update.description = body.description
  if (typeof body.titleTemplate === 'string') update.titleTemplate = body.titleTemplate
  if (typeof body.descriptionTemplate === 'string') update.descriptionTemplate = body.descriptionTemplate
  if (Array.isArray(body.requiredVariables)) {
    update.requiredVariables = body.requiredVariables.filter((v) => typeof v === 'string' && v.length > 0)
  }
  if (typeof body.defaultBudgetCents === 'number' || body.defaultBudgetCents === null) update.defaultBudgetCents = body.defaultBudgetCents
  if (typeof body.defaultBudgetTokens === 'number' || body.defaultBudgetTokens === null) update.defaultBudgetTokens = body.defaultBudgetTokens
  if (typeof body.defaultExecutionMode === 'string') update.defaultExecutionMode = body.defaultExecutionMode
  if (typeof body.defaultPriority === 'number') update.defaultPriority = body.defaultPriority
  if (typeof body.defaultRequirePlanApproval === 'boolean') update.defaultRequirePlanApproval = body.defaultRequirePlanApproval
  if (typeof body.isActive === 'boolean') update.isActive = body.isActive

  if (Object.keys(update).length === 0) return apiError('BAD_REQUEST', 'Kein Update-Feld', 400)

  const { db } = await import('@/lib/db')
  const { agentGoalTemplates } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')

  await db.update(agentGoalTemplates).set({ ...update, updatedAt: sql`now()` }).where(eq(agentGoalTemplates.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  const { db } = await import('@/lib/db')
  const { agentGoalTemplates } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  // Hard-Delete: Templates haben keine FK-Refs.
  await db.delete(agentGoalTemplates).where(eq(agentGoalTemplates.id, id))
  return NextResponse.json({ ok: true })
}
