import { describe, it, expect, vi, beforeEach } from 'vitest'

const dbExecuteMock = vi.fn()
vi.mock('@/lib/db', () => ({ db: { execute: dbExecuteMock } }))

const logAgentEventMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/agents/recovery/activity-log', () => ({ logAgentEvent: logAgentEventMock }))

describe('recoverStrandedRunsOnBoot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbExecuteMock.mockReset()
  })

  it('queued agent_continuation pro stranded Run, schreibt Audit-Log', async () => {
    dbExecuteMock
      .mockResolvedValueOnce([{ id: 'r1', goalId: 'g1' }, { id: 'r2', goalId: 'g2' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)

    const { recoverStrandedRunsOnBoot } = await import('@/lib/services/agents/recovery/boot-recovery')
    const r = await recoverStrandedRunsOnBoot()

    expect(r.recovered).toBe(2)
    expect(logAgentEventMock).toHaveBeenCalledTimes(2)
    expect(logAgentEventMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'agent.run.stranded' }))
  })

  it('Resultat=0 wenn keine stranded Runs', async () => {
    dbExecuteMock.mockResolvedValueOnce([])
    const { recoverStrandedRunsOnBoot } = await import('@/lib/services/agents/recovery/boot-recovery')
    const r = await recoverStrandedRunsOnBoot()
    expect(r.recovered).toBe(0)
  })

  it('schluckt Fehler beim Boot — Server soll trotzdem starten', async () => {
    dbExecuteMock.mockRejectedValueOnce(new Error('DB nicht erreichbar'))
    const { recoverStrandedRunsOnBoot } = await import('@/lib/services/agents/recovery/boot-recovery')
    const r = await recoverStrandedRunsOnBoot()
    expect(r.recovered).toBe(0)
    expect(r.error).toMatch(/DB/)
  })
})
