import { NextRequest, NextResponse } from 'next/server'
import { MemoryService } from '@/lib/services/agents'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiError } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

const PARA_VALUES = ['projects', 'areas', 'resources', 'archives'] as const
type Para = typeof PARA_VALUES[number]

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const para = request.nextUrl.searchParams.get('para') as Para | null
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const n = Number(limitRaw)
  const limit = Number.isFinite(n) ? Math.max(1, Math.min(200, Math.trunc(n))) : 50
  if (!para || !(PARA_VALUES as readonly string[]).includes(para)) {
    return NextResponse.json({ error: "para muss eines von 'projects'|'areas'|'resources'|'archives' sein" }, { status: 400 })
  }
  const items = await MemoryService.list(para, limit)
  return NextResponse.json({ items })
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope')
  if (!scope) return apiError('BAD_REQUEST', '?scope=... erforderlich', 400)

  let body: { body?: unknown; title?: unknown }
  try { body = await req.json() } catch { return apiError('BAD_REQUEST', 'Body nicht parseable', 400) }
  if (typeof body.body !== 'string') return apiError('BAD_REQUEST', 'body (string) erforderlich', 400)

  await MemoryService.write(scope, body.body)

  return NextResponse.json({ ok: true })
}
