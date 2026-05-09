import { describe, it, expect, vi, beforeEach } from 'vitest'

const aiCompleteMock = vi.fn()
vi.mock('@/lib/services/ai', () => ({ AIService: { complete: aiCompleteMock } }))
vi.mock('@/lib/services/agents/cost-tracker.service', () => ({
  CostTrackerService: {
    checkBudget: vi.fn().mockResolvedValue({ exceeded: false, spentCents: 0, budgetCents: null, spentTokens: 0, budgetTokens: null }),
    record: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/lib/services/agents/recovery/activity-log', () => ({ logAgentEvent: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/services/agents/tool-registry', () => ({ ToolRegistry: { listAll: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/lib/services/agents/tools/bootstrap', () => ({ initializeToolRegistry: vi.fn() }))

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
  agentGoals: { id: 'id', title: 'title', description: 'description', status: 'status', requirePlanApproval: 'requirePlanApproval' },
  agentRuns: { id: 'id', goalId: 'goalId', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId', stepKey: 'stepKey', dependsOnStepKeys: 'dependsOnStepKeys' },
  taskQueue: { id: 'id' },
}))

describe('OrchestratorService.plan() Approval-Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectLimitMock.mockReset()
    aiCompleteMock.mockReset()
    insertReturningMock.mockReset()
    insertReturningMock.mockResolvedValue([{ id: 'run-1' }])
  })

  it('requirePlanApproval=true → Goal-Status=awaiting_approval, KEIN Step-Task gequeued', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'T', description: '', requirePlanApproval: true }])
    aiCompleteMock.mockResolvedValueOnce({
      text: '{"reasoning":"r","steps":[{"stepKey":"s1","workerType":"memory:list","config":{},"contextRefs":[],"dependsOnStepKeys":[]}]}',
      provider: 'm', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    })
    insertReturningMock
      .mockResolvedValueOnce([{ id: 'run-1' }])
      .mockResolvedValueOnce([{ id: 'step-1', stepKey: 's1' }])

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await OrchestratorService.plan('g1')

    // Goal-Updates: status=planning, danach status=awaiting_approval (NICHT running)
    const updateCalls = updateSetMock.mock.calls.map((c) => c[0] as Record<string, unknown>)
    const lastGoalUpdate = updateCalls[updateCalls.length - 1]
    expect(lastGoalUpdate.status).toBe('awaiting_approval')

    // KEIN task_queue-Insert mit type=agent_step_run
    const taskQueueInserts = insertValuesMock.mock.calls.filter((c) => {
      const v = c[0] as Record<string, unknown>
      return v.type === 'agent_step_run'
    })
    expect(taskQueueInserts).toHaveLength(0)
  })

  it('requirePlanApproval=false → Goal-Status=running, Steps werden gequeued (default-Pfad)', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'T', description: '', requirePlanApproval: false }])
    aiCompleteMock.mockResolvedValueOnce({
      text: '{"reasoning":"r","steps":[{"stepKey":"s1","workerType":"memory:list","config":{},"contextRefs":[],"dependsOnStepKeys":[]}]}',
      provider: 'm', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    })
    insertReturningMock
      .mockResolvedValueOnce([{ id: 'run-1' }])
      .mockResolvedValueOnce([{ id: 'step-1', stepKey: 's1' }])
      .mockResolvedValueOnce([{ id: 't1' }])

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await OrchestratorService.plan('g1')

    const updateCalls = updateSetMock.mock.calls.map((c) => c[0] as Record<string, unknown>)
    const lastGoalUpdate = updateCalls[updateCalls.length - 1]
    expect(lastGoalUpdate.status).toBe('running')
  })
})
