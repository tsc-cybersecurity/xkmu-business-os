import { describe, it, expect, vi, beforeEach } from 'vitest'

const aiCompleteMock = vi.fn()
const insertReturningMock = vi.fn()
const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }))
const insertMock = vi.fn(() => ({ values: insertValuesMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))

vi.mock('@/lib/db', () => ({
  db: { insert: insertMock, update: updateMock, select: selectMock },
}))
vi.mock('@/lib/db/schema', () => ({
  agentGoals: { id: 'id', title: 'title', description: 'description', status: 'status' },
  agentRuns: { id: 'id', goalId: 'goalId', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId', goalId: 'goalId', stepKey: 'stepKey' },
  taskQueue: { id: 'id', type: 'type', status: 'status', referenceType: 'referenceType', referenceId: 'referenceId' },
}))
vi.mock('@/lib/services/ai', () => ({
  AIService: { complete: aiCompleteMock },
}))
vi.mock('@/lib/services/agents/tool-registry', () => ({
  ToolRegistry: {
    listAll: vi.fn().mockResolvedValue([
      { ref: { namespace: 'memory', name: 'search', raw: 'memory:search' }, description: 'Search', inputSchema: {} },
      { ref: { namespace: 'service', name: 'lead-research', raw: 'service:lead-research' }, description: 'Lead-Research', inputSchema: {} },
    ]),
  },
}))
vi.mock('@/lib/services/agents/tools/bootstrap', () => ({
  initializeToolRegistry: vi.fn(),
}))
vi.mock('@/lib/services/agents/cost-tracker.service', () => ({
  CostTrackerService: { record: vi.fn().mockResolvedValue(undefined), checkBudget: vi.fn().mockResolvedValue({ exceeded: false }) },
}))

describe('OrchestratorService.plan', () => {
  beforeEach(() => {
    aiCompleteMock.mockReset()
    insertMock.mockClear()
    insertValuesMock.mockClear()
    insertReturningMock.mockReset()
    selectLimitMock.mockReset()
  })

  it('plan() ruft LLM, parst JSON, persistiert run + steps + queues task', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'Acme recherchieren', description: 'Mach das' }])
    insertReturningMock.mockResolvedValueOnce([{ id: 'run-1' }])
    insertReturningMock.mockResolvedValueOnce([{ id: 'step-1', stepKey: 'research' }, { id: 'step-2', stepKey: 'summary' }])
    insertReturningMock.mockResolvedValueOnce([{ id: 'tq-1' }])
    insertReturningMock.mockResolvedValueOnce([{ id: 'tq-2' }])

    aiCompleteMock.mockResolvedValueOnce({
      text: JSON.stringify({
        reasoning: 'Plan: Recherche dann Summary.',
        steps: [
          { stepKey: 'research', workerType: 'service:lead-research', config: { companyName: 'Acme' }, contextRefs: [], dependsOnStepKeys: [] },
          { stepKey: 'summary', workerType: 'memory:write', config: { scope: 'projects/acme', body: '#Acme' }, contextRefs: [], dependsOnStepKeys: ['research'] },
        ],
      }),
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
    })

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const r = await OrchestratorService.plan('g1')

    expect(aiCompleteMock).toHaveBeenCalledTimes(1)
    expect(r.runId).toBe('run-1')
    expect(r.steps).toHaveLength(2)
    expect(r.steps[0].stepKey).toBe('research')
    // 1 run + 1 multi-row steps + 1 step-task (research, no deps) — summary depends on research, not queued yet
    // Insert calls: run (1), steps (1), task_queue (1 for research only)
    expect(insertMock.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('plan() wirft wenn Goal nicht gefunden', async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await expect(OrchestratorService.plan('unknown')).rejects.toThrow(/nicht gefunden/)
  })

  it('plan() wirft bei ungueltigem JSON-Output', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', title: 'X', description: '' }])
    insertReturningMock.mockResolvedValueOnce([{ id: 'run-err' }])
    aiCompleteMock.mockResolvedValueOnce({
      text: 'kein JSON',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    })
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    await expect(OrchestratorService.plan('g1')).rejects.toThrow(/JSON/)
  })
})
