import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiNotFound, apiError } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const [row] = await db.select().from(agentDefinitions).where(eq(agentDefinitions.id, id)).limit(1)
  if (!row) return apiNotFound('Definition nicht gefunden')
  return NextResponse.json(row)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', 'Body nicht parseable', 400)
  }

  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string') update.name = body.name
  if (typeof body.systemPrompt === 'string') update.systemPrompt = body.systemPrompt
  if (Array.isArray(body.allowedTools)) {
    update.allowedTools = body.allowedTools.filter((t) => typeof t === 'string')
  }
  if (typeof body.modelHint === 'string') update.modelHint = body.modelHint
  if (typeof body.maxTokensPerCall === 'number') update.maxTokensPerCall = body.maxTokensPerCall
  if (typeof body.maxIterations === 'number') update.maxIterations = body.maxIterations
  if (typeof body.isActive === 'boolean') update.isActive = body.isActive

  if (Object.keys(update).length === 0) {
    return apiError('BAD_REQUEST', 'Kein Update-Feld', 400)
  }

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')

  await db
    .update(agentDefinitions)
    .set({ ...update, updatedAt: sql`now()` })
    .where(eq(agentDefinitions.id, id))

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { eq, sql } = await import('drizzle-orm')

  // Soft-Delete via isActive=false (nicht hart loeschen — historische Step-Refs zeigen darauf)
  await db
    .update(agentDefinitions)
    .set({ isActive: false, updatedAt: sql`now()` })
    .where(eq(agentDefinitions.id, id))

  return NextResponse.json({ ok: true })
}
