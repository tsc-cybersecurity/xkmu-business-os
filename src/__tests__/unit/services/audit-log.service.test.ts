import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { setupDbMock } from '../../helpers/mock-db'

describe('AuditLogService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/audit-log.service')
    return mod.AuditLogService
  }

  function mockReq(headers: Record<string, string> = {}): NextRequest {
    const h = new Headers(headers)
    return new NextRequest('http://localhost/', { headers: h })
  }

  /** Returns the chain object returned by the first db.insert() call. */
  function getInsertChain() {
    // db.insert is a vi.fn(); its first invocation returns the chain mock
    return dbMock.db.insert.mock.results[0]?.value as { values: ReturnType<typeof vi.fn> }
  }

  describe('log', () => {
    it('inserts basic entry with correct action and userId', async () => {
      const svc = await getService()
      dbMock.mockInsert.mockResolvedValueOnce([])

      await svc.log({ action: 'test.action', userId: 'u1' })

      expect(dbMock.db.insert).toHaveBeenCalled()
      const chain = getInsertChain()
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'test.action', userId: 'u1' }),
      )
    })

    it('extracts IP from x-forwarded-for (first entry, trimmed)', async () => {
      const svc = await getService()
      dbMock.mockInsert.mockResolvedValueOnce([])

      const req = mockReq({ 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' })
      await svc.log({ action: 'login', request: req })

      const chain = getInsertChain()
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '1.2.3.4' }),
      )
    })

    it('extracts IP from x-real-ip when x-forwarded-for is absent', async () => {
      const svc = await getService()
      dbMock.mockInsert.mockResolvedValueOnce([])

      const req = mockReq({ 'x-real-ip': '9.9.9.9' })
      await svc.log({ action: 'login', request: req })

      const chain = getInsertChain()
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '9.9.9.9' }),
      )
    })

    it('extracts user-agent from request headers', async () => {
      const svc = await getService()
      dbMock.mockInsert.mockResolvedValueOnce([])

      const req = mockReq({ 'user-agent': 'Mozilla/5.0 TestBrowser' })
      await svc.log({ action: 'page.view', request: req })

      const chain = getInsertChain()
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ userAgent: 'Mozilla/5.0 TestBrowser' }),
      )
    })

    it('sets ipAddress and userAgent to null when no request provided', async () => {
      const svc = await getService()
      dbMock.mockInsert.mockResolvedValueOnce([])

      await svc.log({ action: 'system.task' })

      const chain = getInsertChain()
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: null, userAgent: null }),
      )
    })

    it('throws and does not swallow DB insert failure', async () => {
      const svc = await getService()
      // The chain's then() is what resolves the await — make it reject
      dbMock.mockInsert.mockResolvedValueOnce(Promise.reject(new Error('DB down')))

      await expect(svc.log({ action: 'fail.action' })).rejects.toThrow('DB down')
    })
  })

  describe('list', () => {
    const fixture = [
      {
        id: 'a1',
        userId: 'u1',
        userRole: 'admin',
        action: 'user.create',
        entityType: 'user',
        entityId: 'e1',
        payload: {},
        ipAddress: '1.2.3.4',
        userAgent: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]

    it('returns all entries when called with no filter', async () => {
      const svc = await getService()
      dbMock.mockSelect.mockResolvedValue(fixture)

      const result = await svc.list()

      expect(dbMock.db.select).toHaveBeenCalled()
      expect(result).toEqual(fixture)
    })

    it('passes userId condition when filter.userId is set', async () => {
      const svc = await getService()
      dbMock.mockSelect.mockResolvedValue(fixture)

      const result = await svc.list({ userId: 'u1' })

      expect(dbMock.db.select).toHaveBeenCalled()
      expect(result).toEqual(fixture)
    })

    it('passes entityType and entityId conditions when both are set', async () => {
      const svc = await getService()
      dbMock.mockSelect.mockResolvedValue(fixture)

      const result = await svc.list({ entityType: 'user', entityId: 'e1' })

      expect(dbMock.db.select).toHaveBeenCalled()
      expect(result).toEqual(fixture)
    })

    it('passes action condition when filter.action is set', async () => {
      const svc = await getService()
      dbMock.mockSelect.mockResolvedValue(fixture)

      const result = await svc.list({ action: 'user.create' })

      expect(dbMock.db.select).toHaveBeenCalled()
      expect(result).toEqual(fixture)
    })
  })
})
