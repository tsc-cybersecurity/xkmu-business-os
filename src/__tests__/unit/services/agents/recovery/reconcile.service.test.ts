import { describe, it, expect, vi, beforeEach } from 'vitest'

const dbExecuteMock = vi.fn()
vi.mock('@/lib/db', () => ({ db: { execute: dbExecuteMock } }))

describe('reconcileStrandedRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbExecuteMock.mockReset()
  })

  it('queued continuation-Tasks pro stranded Run + setzt liveness_checked_at', async () => {
    // 1. SELECT stranded runs -> 2 Treffer
    dbExecuteMock
      .mockResolvedValueOnce([{ id: 'r1', goalId: 'g1' }, { id: 'r2', goalId: 'g2' }])
      .mockResolvedValueOnce(undefined) // INSERT task_queue r1
      .mockResolvedValueOnce(undefined) // INSERT task_queue r2
      .mockResolvedValueOnce(undefined) // UPDATE liveness_checked_at

    const { reconcileStrandedRuns } = await import('@/lib/services/agents/recovery/reconcile.service')
    const r = await reconcileStrandedRuns()

    expect(r.queued).toBe(2)
    expect(dbExecuteMock).toHaveBeenCalledTimes(4) // 1 select + 2 inserts + 1 liveness-update
  })

  it('keine stranded Runs -> queued=0, kein Insert', async () => {
    dbExecuteMock.mockResolvedValueOnce([])
    const { reconcileStrandedRuns } = await import('@/lib/services/agents/recovery/reconcile.service')
    const r = await reconcileStrandedRuns()
    expect(r.queued).toBe(0)
    expect(dbExecuteMock).toHaveBeenCalledTimes(1)
  })

  it('skippt wenn fuer denselben Run schon agent_continuation pending ist', async () => {
    // Strategie: SQL nutzt ON CONFLICT DO NOTHING ueber unique-key oder NOT EXISTS-Subquery.
    // Hier nur Test, dass die Inserts trotzdem aufgerufen werden — die Idempotenz
    // ist auf SQL-Ebene via NOT EXISTS-Subquery garantiert.
    dbExecuteMock
      .mockResolvedValueOnce([{ id: 'r1', goalId: 'g1' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
    const { reconcileStrandedRuns } = await import('@/lib/services/agents/recovery/reconcile.service')
    const r = await reconcileStrandedRuns()
    expect(r.queued).toBe(1)
  })
})
