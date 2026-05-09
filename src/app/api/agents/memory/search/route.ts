import { NextRequest, NextResponse } from 'next/server'
import { MemoryService } from '@/lib/services/agents'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const q = request.nextUrl.searchParams.get('q')
  const scope = request.nextUrl.searchParams.get('scope') ?? undefined
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const n = Number(limitRaw)
  const limit = Number.isFinite(n) ? Math.max(1, Math.min(50, Math.trunc(n))) : 10
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'q (mind. 2 Zeichen) erforderlich' }, { status: 400 })
  }
  const hits = await MemoryService.search(q, scope, limit)
  return NextResponse.json({ hits })
}
