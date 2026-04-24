import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

describe('OrderService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getSvc() {
    const mod = await import('@/lib/services/order.service')
    return mod.OrderService
  }

  describe('create', () => {
    it('inserts order and returns row', async () => {
      const svc = await getSvc()
      dbMock.mockInsert.mockResolvedValueOnce([{ id: 'o1', status: 'pending' }])
      const order = await svc.create({
        companyId: 'c1',
        requestedBy: 'u1',
        title: 'Neuer Support',
        description: 'Passwort vergessen',
        priority: 'mittel',
      })
      expect(order.id).toBe('o1')
    })
  })

  describe('list', () => {
    it('filters by companyId', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'o1' }])
      const rows = await svc.list({ companyId: 'c1' })
      expect(rows).toHaveLength(1)
    })
    it('filters by status', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([])
      const rows = await svc.list({ status: 'done' })
      expect(rows).toEqual([])
    })
    it('applies multiple filters', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'o2' }])
      const rows = await svc.list({
        companyId: 'c1', status: 'pending', priority: 'hoch',
        categoryId: 'cat1', assignedTo: 'a1',
      })
      expect(rows).toHaveLength(1)
    })
  })

  describe('getById', () => {
    it('returns row when found', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'o1' }])
      const row = await svc.getById('o1')
      expect(row?.id).toBe('o1')
    })
    it('returns null when not found', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([])
      const row = await svc.getById('nope')
      expect(row).toBeNull()
    })
  })

  describe('cancel', () => {
    it('returns true when row updated', async () => {
      const svc = await getSvc()
      dbMock.mockUpdate.mockResolvedValueOnce([{ id: 'o1' }])
      const ok = await svc.cancel('o1', 'u1')
      expect(ok).toBe(true)
    })
    it('returns false when no row matched', async () => {
      const svc = await getSvc()
      dbMock.mockUpdate.mockResolvedValueOnce([])
      const ok = await svc.cancel('o1', 'u1')
      expect(ok).toBe(false)
    })
  })

  describe('transitionStatus', () => {
    it('accept: pending → accepted sets acceptedAt', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'o1', status: 'pending' }])
      dbMock.mockUpdate.mockResolvedValueOnce([{ id: 'o1', status: 'accepted', acceptedAt: expect.any(Date) }])
      const out = await svc.transitionStatus('o1', 'accept')
      expect(out.status).toBe('accepted')
    })

    it('throws NOT_FOUND when order missing', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([])
      await expect(svc.transitionStatus('nope', 'accept'))
        .rejects.toThrow(/NOT_FOUND/)
    })

    it('throws INVALID_TRANSITION when illegal jump', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'o1', status: 'pending' }])
      // pending → complete not allowed
      await expect(svc.transitionStatus('o1', 'complete'))
        .rejects.toThrow(/INVALID_TRANSITION/)
    })

    it('reject sets rejectReason when provided', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'o1', status: 'pending' }])
      dbMock.mockUpdate.mockResolvedValueOnce([{ id: 'o1', status: 'rejected', rejectReason: 'nicht möglich' }])
      const out = await svc.transitionStatus('o1', 'reject', 'nicht möglich')
      expect(out.rejectReason).toBe('nicht möglich')
    })

    it('done → any action throws INVALID_TRANSITION (final state)', async () => {
      const svc = await getSvc()
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'o1', status: 'done' }])
      await expect(svc.transitionStatus('o1', 'accept'))
        .rejects.toThrow(/INVALID_TRANSITION/)
    })
  })

  describe('assign', () => {
    it('assigns user and returns row', async () => {
      const svc = await getSvc()
      dbMock.mockUpdate.mockResolvedValueOnce([{ id: 'o1', assignedTo: 'a1' }])
      const out = await svc.assign('o1', 'a1')
      expect(out.assignedTo).toBe('a1')
    })
    it('throws NOT_FOUND when missing', async () => {
      const svc = await getSvc()
      dbMock.mockUpdate.mockResolvedValueOnce([])
      await expect(svc.assign('o1', 'a1')).rejects.toThrow(/NOT_FOUND/)
    })
  })
})
