import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'admin' } }),
}))
vi.mock('@/lib/services/agents/cost-aggregation.service', () => ({
  CostAggregation: {
    byDay: vi.fn().mockResolvedValue([{ day: '2026-05-09', totalCents: 50, totalTokens: 1000, callCount: 5 }]),
    byGoal: vi.fn().mockResolvedValue([]),
    byModel: vi.fn().mockResolvedValue([]),
  },
}))

describe('GET /api/agents/cost', () => {
  beforeEach(() => vi.clearAllMocks())

  it('default: liefert byDay+byGoal+byModel', async () => {
    const { GET } = await import('@/app/api/agents/cost/route')
    const req = new Request('http://x/api/agents/cost')
    const res = await GET(req as unknown as import('next/server').NextRequest)
    const data = await res.json()
    expect(data.byDay).toHaveLength(1)
    expect(data.byGoal).toEqual([])
    expect(data.byModel).toEqual([])
  })

  it('range-Param wird an Aggregation weitergereicht', async () => {
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    const { GET } = await import('@/app/api/agents/cost/route')
    const req = new Request('http://x/api/agents/cost?range=30')
    await GET(req as unknown as import('next/server').NextRequest)
    expect(CostAggregation.byDay).toHaveBeenCalledWith({ rangeDays: 30 })
    expect(CostAggregation.byGoal).toHaveBeenCalledWith({ rangeDays: 30, limit: 10 })
    expect(CostAggregation.byModel).toHaveBeenCalledWith({ rangeDays: 30 })
  })

  it('ohne Session: 401', async () => {
    const { getSession } = await import('@/lib/auth/session')
    ;(getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/agents/cost/route')
    const req = new Request('http://x/api/agents/cost')
    const res = await GET(req as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(401)
  })
})
