import { describe, it, expect, vi, beforeEach } from 'vitest'

const dbExecuteMock = vi.fn()
vi.mock('@/lib/db', () => ({ db: { execute: dbExecuteMock } }))

describe('CostAggregation.byDay', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert Tages-Buckets mit gesamt + tokens + cents', async () => {
    dbExecuteMock.mockResolvedValueOnce([
      { day: '2026-05-01', totalCents: 50, totalTokens: '1234', callCount: '5' },
      { day: '2026-05-02', totalCents: 80, totalTokens: '2000', callCount: '8' },
    ])
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    const r = await CostAggregation.byDay({ rangeDays: 7 })
    expect(r).toEqual([
      { day: '2026-05-01', totalCents: 50, totalTokens: 1234, callCount: 5 },
      { day: '2026-05-02', totalCents: 80, totalTokens: 2000, callCount: 8 },
    ])
  })

  it('range=7 default', async () => {
    dbExecuteMock.mockResolvedValueOnce([])
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    await CostAggregation.byDay()
    // Pruefen, dass eine SQL-Query abgesetzt wurde (range=7 default)
    expect(dbExecuteMock).toHaveBeenCalled()
  })
})

describe('CostAggregation.byGoal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert Goals nach Cost sortiert', async () => {
    dbExecuteMock.mockResolvedValueOnce([
      { goalId: 'g1', goalTitle: 'A', totalCents: 100, totalTokens: '5000' },
      { goalId: 'g2', goalTitle: 'B', totalCents: 30, totalTokens: '1000' },
    ])
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    const r = await CostAggregation.byGoal({ limit: 10 })
    expect(r[0].goalId).toBe('g1')
    expect(r[0].totalTokens).toBe(5000)
  })
})

describe('CostAggregation.byModel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Gruppiert nach Provider+Modell', async () => {
    dbExecuteMock.mockResolvedValueOnce([
      { provider: 'gemini', model: 'gemini-2.5-flash', totalCents: 60, totalTokens: '3000', callCount: '20' },
    ])
    const { CostAggregation } = await import('@/lib/services/agents/cost-aggregation.service')
    const r = await CostAggregation.byModel()
    expect(r[0].provider).toBe('gemini')
    expect(r[0].callCount).toBe(20)
  })
})
