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
vi.mock('@/lib/services/agents/memory.service', () => ({
  MemoryService: { compactRunHistory: vi.fn().mockResolvedValue('Step old-step: succeeded') },
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

describe('OrchestratorService.replan', () => {
  beforeEach(() => {
    aiCompleteMock.mockReset()
    insertMock.mockClear()
    insertValuesMock.mockClear()
    insertReturningMock.mockReset()
    selectLimitMock.mockReset()
    selectWhereMock.mockReset()
    selectWhereMock.mockReturnValue({ limit: selectLimitMock })
  })

  it('replan continue: nextStepIds enthaelt frisch gequeute Step-IDs', async () => {
    // db.select() Aufrufe in replan():
    // 1. agentRuns: .where().limit() -> run
    // 2. agentGoals: .where().limit() -> goal
    // 3. agentSteps: .where() direkt awaited -> allSteps (alle succeeded, kein pending)
    selectLimitMock
      .mockResolvedValueOnce([{ id: 'run-1', goalId: 'g1', planJson: null, status: 'executing' }]) // run
      .mockResolvedValueOnce([{ id: 'g1', title: 'T', description: '' }]) // goal

    // allSteps: 3. select-Aufruf — .where() muss direkt eine Promise zurueckgeben (kein .limit())
    selectWhereMock
      .mockReturnValueOnce({ limit: selectLimitMock }) // run
      .mockReturnValueOnce({ limit: selectLimitMock }) // goal
      .mockResolvedValueOnce([                          // allSteps: alle succeeded -> LLM-Pfad
        { id: 'step-old', stepKey: 'old-step', status: 'succeeded', workerType: 'memory:list', dependsOnStepKeys: [] },
      ] as never)

    // LLM antwortet continue mit 1 neuem Step + nextStepMode=immediate
    aiCompleteMock.mockResolvedValueOnce({
      text: JSON.stringify({
        action: 'continue',
        reasoning: 'r',
        newSteps: [{ stepKey: 'new-step', workerType: 'memory:list', config: {}, contextRefs: [], dependsOnStepKeys: [] }],
        nextStepMode: 'immediate',
      }),
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
    })

    // insert agentSteps returning -> neue Step-ID
    insertReturningMock.mockResolvedValueOnce([{ id: 'new-step-id', stepKey: 'new-step' }])

    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    const result = await OrchestratorService.replan('run-1')

    expect(result.action).toBe('continue')
    expect(result.nextStepIds).toBeDefined()
    expect(result.nextStepIds!.length).toBe(1)
    expect(result.nextStepMode).toBe('immediate')
  })
})
