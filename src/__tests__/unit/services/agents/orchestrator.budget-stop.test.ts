import { describe, it, expect, vi, beforeEach } from 'vitest'

const aiCompleteMock = vi.fn()
vi.mock('@/lib/services/ai', () => ({ AIService: { complete: aiCompleteMock } }))

const checkBudgetMock = vi.fn()
const recordCostMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/agents/cost-tracker.service', () => ({
  CostTrackerService: { checkBudget: checkBudgetMock, record: recordCostMock },
}))

const logAgentEventMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/agents/recovery/activity-log', () => ({ logAgentEvent: logAgentEventMock }))

vi.mock('@/lib/services/agents/tool-registry', () => ({
  ToolRegistry: {
    listAll: vi.fn().mockResolvedValue([
      { ref: { namespace: 'memory', name: 'list', raw: 'memory:list' }, description: 'List', inputSchema: {} },
    ]),
  },
}))
vi.mock('@/lib/services/agents/tools/bootstrap', () => ({
  initializeToolRegistry: vi.fn(),
}))
vi.mock('@/lib/services/agents/memory.service', () => ({
  MemoryService: { compactRunHistory: vi.fn().mockResolvedValue('') },
}))

const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const insertReturningMock = vi.fn().mockResolvedValue([{ id: 'run-1' }])
const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }))
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))

vi.mock('@/lib/db', () => ({ db: { select: selectMock, insert: insertMock, update: updateMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentGoals: { id: 'id', title: 'title', description: 'description', status: 'status' },
  agentRuns: { id: 'id', goalId: 'goalId', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId', status: 'status', stepKey: 'stepKey', workerType: 'workerType', dependsOnStepKeys: 'dependsOnStepKeys' },
  taskQueue: { id: 'id' },
}))

describe('OrchestratorService Budget-Stop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectLimitMock.mockReset()
    checkBudgetMock.mockReset()
  })

  it('plan(): exceeded -> Run failed, Goal paused, kein LLM-Call', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'T', description: 'd' }])
    checkBudgetMock.mockResolvedValueOnce({
      exceeded: true, reason: 'budget_cents_exceeded',
      spentCents: 100, budgetCents: 50, spentTokens: 0, budgetTokens: null,
    })

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await expect(OrchestratorService.plan('g1')).rejects.toThrow(/budget|Budget/)

    expect(aiCompleteMock).not.toHaveBeenCalled()
    expect(logAgentEventMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'agent.budget.exceeded' }))
  })

  it('replan(): exceeded -> Run failed, Goal paused, kein LLM-Call', async () => {
    // Run + Goal laden, allSteps leer
    selectLimitMock
      .mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }])
      .mockResolvedValueOnce([{ id: 'g1', title: 'T', description: '' }])
    selectWhereMock
      .mockReturnValueOnce({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) })
    checkBudgetMock.mockResolvedValueOnce({
      exceeded: true, reason: 'budget_tokens_exceeded',
      spentCents: 0, budgetCents: null, spentTokens: 5000, budgetTokens: 1000,
    })

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const r = await OrchestratorService.replan('r1')

    expect(aiCompleteMock).not.toHaveBeenCalled()
    expect(r.action).toBe('pause')
    expect(logAgentEventMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'agent.budget.exceeded' }))
  })

  it('plan(): not exceeded -> normaler Flow (LLM wird gerufen)', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'T', description: 'd' }])
    checkBudgetMock.mockResolvedValueOnce({ exceeded: false, spentCents: 0, budgetCents: null, spentTokens: 0, budgetTokens: null })
    aiCompleteMock.mockResolvedValueOnce({
      text: '{"reasoning":"r","steps":[{"stepKey":"s1","workerType":"memory:list","config":{},"contextRefs":[],"dependsOnStepKeys":[]}]}',
      provider: 'm', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    })
    insertReturningMock
      .mockResolvedValueOnce([{ id: 'run-1' }])              // run insert
      .mockResolvedValueOnce([{ id: 'step-1', stepKey: 's1' }]) // steps insert
      .mockResolvedValueOnce([{ id: 't1' }])                  // task_queue insert

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await OrchestratorService.plan('g1')

    expect(aiCompleteMock).toHaveBeenCalledTimes(1)
    expect(checkBudgetMock).toHaveBeenCalledWith('g1')
  })
})
