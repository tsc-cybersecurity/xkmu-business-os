import { NextRequest, NextResponse } from 'next/server'
import { MemoryService } from '@/lib/services/agents'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id } = await params
  try {
    const result = await MemoryService.read(id)
    return NextResponse.json(result)
  } catch {
    // Generic 404 — don't leak internal error message
    return NextResponse.json({ error: 'Memory-Entry nicht gefunden' }, { status: 404 })
  }
}
