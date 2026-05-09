import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiUnauthorized } from '@/lib/utils/api-response'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiUnauthorized('Nicht autorisiert')

  const url = new URL(req.url)
  const rangeRaw = Number(url.searchParams.get('range') ?? '7')
  const rangeDays = Number.isFinite(rangeRaw) ? Math.max(1, Math.min(90, Math.trunc(rangeRaw))) : 7

  const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
  const [byDay, byGoal, byModel] = await Promise.all([
    CostAggregation.byDay({ rangeDays }),
    CostAggregation.byGoal({ rangeDays, limit: 10 }),
    CostAggregation.byModel({ rangeDays }),
  ])

  return NextResponse.json({ byDay, byGoal, byModel, rangeDays })
}
