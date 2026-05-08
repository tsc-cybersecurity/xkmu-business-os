import { NextRequest, NextResponse } from 'next/server'
import { MemoryService } from '@/lib/services/agents'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

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
