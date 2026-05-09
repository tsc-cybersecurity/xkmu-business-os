import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) }))

const dbExecuteMock = vi.fn().mockResolvedValue([])
const selectLimitMock = vi.fn()
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) }))
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }))
const selectMock = vi.fn(() => ({ from: selectFromMock }))
const updateSetMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const updateMock = vi.fn(() => ({ set: updateSetMock }))
vi.mock('@/lib/db', () => ({ db: { execute: dbExecuteMock, select: selectMock, update: updateMock } }))
vi.mock('@/lib/db/schema', () => ({
  agentGoals: { id: 'id', status: 'status', executionMode: 'executionMode', updatedAt: 'updatedAt' },
  agentRuns: { id: 'id', goalId: 'goalId', createdAt: 'createdAt' },
  agentSteps: { id: 'id', runId: 'runId', goalId: 'goalId' },
}))

describe('Manual Triggers', () => {
  beforeEach(() => { vi.clearAllMocks(); selectLimitMock.mockReset() })

  it('POST /runs/[id]/replan-now: queued task', async () => {
    const { POST } = await import('@/app/api/agents/runs/[id]/replan-now/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(200)
    expect(dbExecuteMock).toHaveBeenCalled()
  })

  it('POST /steps/[id]/retry: 404 wenn Step nicht existiert', async () => {
    selectLimitMock.mockResolvedValueOnce([])
    const { POST } = await import('@/app/api/agents/steps/[id]/retry/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 'sX' }) })
    expect(res.status).toBe(404)
  })

  it('POST /steps/[id]/retry: ok wenn Step existiert', async () => {
    selectLimitMock.mockResolvedValueOnce([{ id: 's1', runId: 'r1', goalId: 'g1', status: 'failed' }])
    const { POST } = await import('@/app/api/agents/steps/[id]/retry/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalled()
    expect(dbExecuteMock).toHaveBeenCalled()
  })

  it('POST /goals/[id]/run-immediate: setzt executionMode + queued replan wenn Run existiert', async () => {
    selectLimitMock
      .mockResolvedValueOnce([{ id: 'g1', status: 'running' }])
      .mockResolvedValueOnce([{ id: 'r1' }])
    selectWhereMock
      .mockReturnValueOnce({ limit: selectLimitMock, orderBy: vi.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ limit: selectLimitMock, orderBy: vi.fn().mockReturnValue({ limit: selectLimitMock }) })
    const { POST } = await import('@/app/api/agents/goals/[id]/run-immediate/route')
    const res = await POST(new Request('http://x'), { params: Promise.resolve({ id: 'g1' }) })
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalled()
  })
})
