import { NextRequest, NextResponse } from 'next/server'
import { MemoryService } from '@/lib/services/agents'

export const dynamic = 'force-dynamic'

const PARA_VALUES = ['projects', 'areas', 'resources', 'archives'] as const
type Para = typeof PARA_VALUES[number]

export async function GET(request: NextRequest) {
  const para = request.nextUrl.searchParams.get('para') as Para | null
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : 50
  if (!para || !(PARA_VALUES as readonly string[]).includes(para)) {
    return NextResponse.json({ error: "para muss eines von 'projects'|'areas'|'resources'|'archives' sein" }, { status: 400 })
  }
  const items = await MemoryService.list(para, limit)
  return NextResponse.json({ items })
}
