import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiError } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { desc } = await import('drizzle-orm')

  const definitions = await db.select().from(agentDefinitions).orderBy(desc(agentDefinitions.createdAt))
  return NextResponse.json({ definitions })
}

interface CreateInput {
  slug?: unknown
  role?: unknown
  name?: unknown
  systemPrompt?: unknown
  allowedTools?: unknown
  modelHint?: unknown
  maxTokensPerCall?: unknown
  maxIterations?: unknown
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  let body: CreateInput
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', 'Body nicht parseable', 400)
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  const role = typeof body.role === 'string' ? body.role.trim() : ''
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : ''
  if (!slug || !role || !systemPrompt) {
    return apiError('BAD_REQUEST', 'slug + role + systemPrompt erforderlich', 400)
  }

  const allowedTools = Array.isArray(body.allowedTools)
    ? body.allowedTools.filter((t): t is string => typeof t === 'string')
    : []
  const name = typeof body.name === 'string' ? body.name : null
  const modelHint = typeof body.modelHint === 'string' ? body.modelHint : null
  const maxTokensPerCall = typeof body.maxTokensPerCall === 'number' ? body.maxTokensPerCall : 4096
  const maxIterations = typeof body.maxIterations === 'number' ? body.maxIterations : 8

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')

  const [row] = await db
    .insert(agentDefinitions)
    .values({ slug, role, name, systemPrompt, allowedTools, modelHint, maxTokensPerCall, maxIterations })
    .returning({ id: agentDefinitions.id })

  return NextResponse.json({ id: row.id }, { status: 201 })
}
