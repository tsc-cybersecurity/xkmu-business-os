import { describe, it, expect, vi, beforeEach } from 'vitest'

const planMock = vi.fn()
const insertReturningMock = vi.fn()
const insertValuesMock = vi.fn((..._args: any[]) => ({ returning: insertReturningMock }))
const insertMock = vi.fn((..._args: any[]) => ({ values: insertValuesMock }))
const updateSetMock = vi.fn((..._args: any[]) => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn((..._args: any[]) => ({ set: updateSetMock }))
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn((..._args: any[]) => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectOrderByMock = vi.fn().mockResolvedValue([])
const selectFromMock = vi.fn((..._args: any[]) => ({ where: selectWhereMock, orderBy: selectOrderByMock }))
const selectMock = vi.fn((..._args: any[]) => ({ from: selectFromMock }))

vi.mock('@/lib/db', () => ({ db: { insert: insertMock, update: updateMock, select: selectMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentGoals: { id: 'id', status: 'status', createdAt: 'createdAt' },
  agentRuns: { id: 'id', goalId: 'goalId', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId' },
}))
vi.mock('@/lib/services/agents/orchestrator.service', () => ({
  OrchestratorService: { plan: planMock },
}))

describe('GoalService', () => {
  beforeEach(() => {
    insertMock.mockClear()
    insertReturningMock.mockReset()
    selectLimitMock.mockReset()
    planMock.mockReset()
    updateSetMock.mockClear()
  })

  it('create() legt Goal mit status=draft an', async () => {
    insertReturningMock.mockResolvedValueOnce([{ id: 'g1' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    const r = await GoalService.create({
      title: 'Test',
      description: 'beschr',
      executionMode: 'cron',
      budgetCents: 100,
    })
    expect(r.id).toBe('g1')
    const args = insertValuesMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args.title).toBe('Test')
    expect(args.status).toBe('draft')
    expect(args.executionMode).toBe('cron')
    expect(args.budgetCents).toBe(100)
  })

  it('start() ruft OrchestratorService.plan und liefert runId zurueck', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'draft' }])
    planMock.mockResolvedValueOnce({ runId: 'run-1', steps: [] })
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    const r = await GoalService.start('g1')
    expect(r.runId).toBe('run-1')
    expect(planMock).toHaveBeenCalledWith('g1')
  })

  it('start() wirft wenn Goal nicht in draft-Status', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'running' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await expect(GoalService.start('g1')).rejects.toThrow(/draft|gestartet/)
  })

  it('pause() setzt Goal-Status auf paused', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'running' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await GoalService.pause('g1')
    expect(updateSetMock).toHaveBeenCalled()
    const args = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args.status).toBe('paused')
  })

  it('resume() setzt paused-Goal auf running', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'paused' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await GoalService.resume('g1')
    const args = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args.status).toBe('running')
  })

  it('cancel() setzt Goal-Status auf cancelled (auch von running)', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'running' }])
    const { GoalService } = await import('@/lib/services/agents/goal.service')
    await GoalService.cancel('g1')
    const args = updateSetMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(args.status).toBe('cancelled')
  })
})
