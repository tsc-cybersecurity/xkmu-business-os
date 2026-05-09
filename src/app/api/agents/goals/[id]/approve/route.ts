import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized, apiError } from '@/lib/utils/api-response'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')
  const { id: goalId } = await params

  try {
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    const r = await GoalService.approve(goalId)
    return NextResponse.json(r)
  } catch (e) {
    return apiError('BAD_REQUEST', (e as Error).message, 400)
  }
}
