import { describe, it, expect, vi, beforeEach } from 'vitest'

const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn((..._a: unknown[]) => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn((..._a: unknown[]) => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
const insertMock = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }))
const dbExecuteMock = vi.fn().mockResolvedValue([])

vi.mock('@/lib/db', () => ({ db: { select: selectMock, update: updateMock, insert: insertMock, execute: dbExecuteMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentRuns: { id: 'id', status: 'status' },
  agentSteps: { id: 'id', runId: 'runId', status: 'status', updatedAt: 'updatedAt' },
  agentGoals: { id: 'id', status: 'status' },
  taskQueue: { id: 'id', referenceId: 'referenceId', type: 'type', status: 'status' },
}))

const logAgentEventMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/agents/recovery/activity-log', () => ({ logAgentEvent: logAgentEventMock }))

describe('handleContinuation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectLimitMock.mockReset()
    dbExecuteMock.mockResolvedValue([])
  })

  it('Pfad 1: pending Step mit pending Task -> nichts tun, ok-Status', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }]) // run
    // dbExecuteMock liefert beide Queries: stepCheck mit pending+queue-bound, queueCheck egal
    dbExecuteMock
      .mockResolvedValueOnce([{ stepId: 's1', stepStatus: 'pending', taskStatus: 'pending', stepUpdatedAt: new Date() }])
      .mockResolvedValueOnce([])

    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')

    expect(r.path).toBe('queue_bound_ok')
    expect(insertMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('Pfad 2: running Step >10 min ohne update -> step failed, replan queued', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }])
    const oldDate = new Date(Date.now() - 15 * 60 * 1000)
    dbExecuteMock
      .mockResolvedValueOnce([{ stepId: 's1', stepStatus: 'running', taskStatus: null, stepUpdatedAt: oldDate }])
      .mockResolvedValueOnce([])

    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')

    expect(r.path).toBe('running_step_stalled')
    expect(updateMock).toHaveBeenCalled() // step auf failed
    expect(insertMock).toHaveBeenCalled() // replan queued
    expect(logAgentEventMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'agent.run.recovered' }))
  })

  it('Pfad 3: kein offener Step + kein replan-Task -> replan queued', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }])
    dbExecuteMock
      .mockResolvedValueOnce([]) // keine offenen Steps
      .mockResolvedValueOnce([]) // kein offener replan-Task

    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')

    expect(r.path).toBe('replan_missing')
    expect(insertMock).toHaveBeenCalled()
  })

  it('Pfad 4: nichts findet einen Pfad -> Goal paused, Audit-Log', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'executing' }])
    dbExecuteMock
      .mockResolvedValueOnce([]) // keine offenen Steps
      .mockResolvedValueOnce([{ id: 't1', type: 'agent_replan' }]) // replan ist offen UND alle Steps sind succeeded -> warum strandend?
    // Pfad 3 trifft nicht weil replan offen, also Pfad 4: paused

    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')

    expect(r.path).toBe('paused_no_path')
    expect(updateMock).toHaveBeenCalled() // Goal auf paused
    expect(logAgentEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'agent.goal.paused_by_recovery' }),
    )
  })

  it('Run nicht gefunden -> wirft', async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    await expect(handleContinuation('rX')).rejects.toThrow(/nicht gefunden/)
  })

  it('Terminal Run -> kein Pfad, no-op', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 'r1', goalId: 'g1', status: 'succeeded' }])
    const { handleContinuation } = await import('@/lib/services/agents/recovery/continuation.service')
    const r = await handleContinuation('r1')
    expect(r.path).toBe('terminal_no_op')
  })
})
