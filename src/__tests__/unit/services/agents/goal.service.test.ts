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
  agentGoals: { id: 'id', status: 'status', executionMode: 'executionMode', createdAt: 'createdAt' },
  agentRuns: { id: 'id', goalId: 'goalId', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId', status: 'status' },
}))
vi.mock('@/lib/services/agents/orchestrator.service', () => ({
  OrchestratorService: { plan: planMock },
}))

const runImmediateMock = vi.fn()
vi.mock('@/lib/services/agents/immediate-lane.service', () => ({
  runImmediate: runImmediateMock,
}))

describe('GoalService', () => {
  beforeEach(() => {
    insertMock.mockClear()
    insertReturningMock.mockReset()
    selectLimitMock.mockReset()
    planMock.mockReset()
    updateSetMock.mockClear()
    runImmediateMock.mockReset()
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

  it('start() triggert runImmediate fuer executionMode=immediate Goals', async () => {
    // Goal mit executionMode=immediate und status=draft
    // select-Aufruf 1: agentGoals.where().limit() -> goal
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'draft', executionMode: 'immediate' }])
    planMock.mockResolvedValueOnce({ runId: 'run-1', steps: [{ stepKey: 'step-a', dependsOnStepKeys: [] }] })
    // select-Aufruf 2: agentSteps.where(and(...)) -> direkt awaited ohne .limit()
    selectWhereMock
      .mockReturnValueOnce({ limit: selectLimitMock })   // erster Aufruf: goal
      .mockResolvedValueOnce([{ id: 'step-1' }])         // zweiter Aufruf: readySteps
    runImmediateMock.mockResolvedValueOnce({ iterations: 1, terminalReason: 'goal_complete' })

    const { GoalService } = await import('@/lib/services/agents/goal.service')
    const r = await GoalService.start('g1')

    expect(planMock).toHaveBeenCalledWith('g1')
    expect(runImmediateMock).toHaveBeenCalledWith({ runId: 'run-1', startStepIds: ['step-1'] })
    expect(r.runId).toBe('run-1')
    expect(r.immediate?.terminalReason).toBe('goal_complete')
    expect(r.immediate?.iterations).toBe(1)
  })

  it('start() triggert KEIN runImmediate fuer executionMode=cron Goals (default)', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'g1', status: 'draft', executionMode: 'cron' }])
    planMock.mockResolvedValueOnce({ runId: 'run-2', steps: [] })

    const { GoalService } = await import('@/lib/services/agents/goal.service')
    const r = await GoalService.start('g1')

    expect(planMock).toHaveBeenCalledWith('g1')
    expect(runImmediateMock).not.toHaveBeenCalled()
    expect(r.runId).toBe('run-2')
    expect(r.immediate).toBeUndefined()
  })
})
