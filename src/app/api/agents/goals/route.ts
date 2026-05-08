import { NextRequest, NextResponse } from 'next/server'
import { GoalService } from '@/lib/services/agents'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const goals = await GoalService.list(100)
  return NextResponse.json({ goals })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON-Body erwartet' }, { status: 400 })
  }
  const input = body as Record<string, unknown>

  if (typeof input.title !== 'string' || input.title.trim().length === 0) {
    return NextResponse.json({ error: 'title ist erforderlich' }, { status: 400 })
  }

  const created = await GoalService.create({
    title: input.title.trim(),
    description: typeof input.description === 'string' ? input.description : undefined,
    executionMode: input.executionMode === 'immediate' ? 'immediate' : 'cron',
    budgetTokens: typeof input.budgetTokens === 'number' ? input.budgetTokens : undefined,
    budgetCents: typeof input.budgetCents === 'number' ? input.budgetCents : undefined,
    priority: typeof input.priority === 'number' && [1, 2, 3].includes(input.priority) ? (input.priority as 1 | 2 | 3) : undefined,
    requirePlanApproval: typeof input.requirePlanApproval === 'boolean' ? input.requirePlanApproval : undefined,
    createdByUserId: session.user?.id,
  })

  // Sofort starten wenn input.startNow !== false
  if (input.startNow !== false) {
    try {
      const start = await GoalService.start(created.id)
      return NextResponse.json({ id: created.id, runId: start.runId, started: true }, { status: 201 })
    } catch (e) {
      // Goal angelegt aber Start fehlgeschlagen — Goal bleibt im draft
      return NextResponse.json(
        { id: created.id, started: false, startError: (e as Error).message },
        { status: 201 },
      )
    }
  }
  return NextResponse.json({ id: created.id, started: false }, { status: 201 })
}
