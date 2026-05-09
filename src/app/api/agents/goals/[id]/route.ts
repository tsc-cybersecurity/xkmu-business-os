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
  const input = body as { action?: string }

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
    } else {
      return NextResponse.json({ error: "action muss eines von 'pause'|'resume'|'cancel'|'start' sein" }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
