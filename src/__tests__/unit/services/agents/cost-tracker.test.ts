import { describe, it, expect, vi, beforeEach } from 'vitest'

const insertValuesMock = vi.fn().mockResolvedValue(undefined)
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const selectFromWhereMock = vi.fn().mockResolvedValue([
  { spentTokens: 100, spentCents: 5, budgetTokens: 1000, budgetCents: 50 },
])
const selectFromMock = vi.fn(() => ({ where: vi.fn(() => ({ limit: () => selectFromWhereMock() })) }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))

vi.mock('@/lib/db', () => ({
  db: { insert: insertMock, update: updateMock, select: selectMock },
}))
vi.mock('@/lib/db/schema', () => ({
  agentCostEvents: { _: 'agentCostEvents' },
  agentGoals: { id: 'id', spentTokens: 'spentTokens', spentCents: 'spentCents' },
  agentRuns: { id: 'id', goalId: 'goalId', inputTokens: 'inputTokens', outputTokens: 'outputTokens', cachedInputTokens: 'cachedInputTokens', costCents: 'costCents' },
}))

describe('CostTrackerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('record schreibt agent_cost_events Eintrag', async () => {
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    await CostTrackerService.record({
      runId: 'r1',
      stepId: 's1',
      goalId: 'g1',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      callRole: 'orchestrator_plan',
      inputTokens: 100,
      outputTokens: 50,
      costCents: 1,
    })
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(insertValuesMock).toHaveBeenCalledTimes(1)
    const args = insertValuesMock.mock.calls[0][0]
    expect(args.provider).toBe('gemini')
    expect(args.callRole).toBe('orchestrator_plan')
    expect(args.inputTokens).toBe(100)
  })

  it('record aktualisiert spent-Counter auf goal und run', async () => {
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    await CostTrackerService.record({
      runId: 'r1', goalId: 'g1', provider: 'gemini', model: 'm',
      callRole: 'smart_worker', inputTokens: 200, outputTokens: 100, costCents: 3,
    })
    // 1 update for goal + 1 update for run
    expect(updateMock).toHaveBeenCalledTimes(2)
  })

  it('checkBudget liefert exceeded=false wenn unter Limit', async () => {
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    const r = await CostTrackerService.checkBudget('g1')
    expect(r.exceeded).toBe(false)
    expect(r.spentCents).toBe(5)
    expect(r.budgetCents).toBe(50)
  })

  it('checkBudget liefert exceeded=true wenn ueber Token-Limit', async () => {
    selectFromWhereMock.mockResolvedValueOnce([
      { spentTokens: 1500, spentCents: 5, budgetTokens: 1000, budgetCents: 50 },
    ])
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    const r = await CostTrackerService.checkBudget('g1')
    expect(r.exceeded).toBe(true)
    expect(r.reason).toBe('tokens')
  })

  it('checkBudget liefert exceeded=true wenn ueber Cents-Limit', async () => {
    selectFromWhereMock.mockResolvedValueOnce([
      { spentTokens: 100, spentCents: 60, budgetTokens: 1000, budgetCents: 50 },
    ])
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    const r = await CostTrackerService.checkBudget('g1')
    expect(r.exceeded).toBe(true)
    expect(r.reason).toBe('cents')
  })

  it('checkBudget mit null-Budget liefert exceeded=false', async () => {
    selectFromWhereMock.mockResolvedValueOnce([
      { spentTokens: 1000000, spentCents: 1000, budgetTokens: null, budgetCents: null },
    ])
    const { CostTrackerService } = await import('@/lib/services/agents/cost-tracker.service')
    const r = await CostTrackerService.checkBudget('g1')
    expect(r.exceeded).toBe(false)
  })
})
