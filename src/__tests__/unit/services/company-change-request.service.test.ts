import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

vi.mock('@/lib/services/company.service', () => ({
  CompanyService: {
    update: vi.fn().mockResolvedValue({ id: 'c1', name: 'Updated Co' }),
  },
}))

describe('CompanyChangeRequestService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/company-change-request.service')
    return mod.CompanyChangeRequestService
  }

  // Fixture factory
  function makeRequest(overrides: Record<string, unknown> = {}) {
    return {
      id: 'req-1',
      companyId: 'c1',
      requestedBy: 'u1',
      requestedAt: new Date('2026-04-22T10:00:00Z'),
      proposedChanges: { name: 'New Name' },
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewComment: null,
      createdAt: new Date('2026-04-22T10:00:00Z'),
      updatedAt: new Date('2026-04-22T10:00:00Z'),
      ...overrides,
    }
  }

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('inserts and returns the new row', async () => {
      const svc = await getService()
      const row = makeRequest()

      // duplicate check: no existing pending
      dbMock.mockSelect.mockResolvedValueOnce([])
      // insert returning
      dbMock.mockInsert.mockResolvedValueOnce([row])

      const result = await svc.create({
        companyId: 'c1',
        requestedBy: 'u1',
        proposedChanges: { name: 'New Name' },
      })

      expect(result).toEqual(row)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('throws PENDING_REQUEST_EXISTS when a pending request exists for the same company', async () => {
      const svc = await getService()

      // duplicate check returns an existing row
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'req-existing' }])

      await expect(
        svc.create({
          companyId: 'c1',
          requestedBy: 'u1',
          proposedChanges: { name: 'New Name' },
        }),
      ).rejects.toThrow('PENDING_REQUEST_EXISTS')

      // Insert should NOT have been called
      expect(dbMock.db.insert).not.toHaveBeenCalled()
    })
  })

  // ─── list ─────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns all entries when called with no filter', async () => {
      const svc = await getService()
      const rows = [makeRequest(), makeRequest({ id: 'req-2' })]

      dbMock.mockSelect.mockResolvedValue(rows)

      const result = await svc.list()

      expect(dbMock.db.select).toHaveBeenCalled()
      expect(result).toEqual(rows)
    })

    it('filters by companyId', async () => {
      const svc = await getService()
      const rows = [makeRequest()]

      dbMock.mockSelect.mockResolvedValue(rows)

      const result = await svc.list({ companyId: 'c1' })

      expect(dbMock.db.select).toHaveBeenCalled()
      expect(result).toEqual(rows)
    })

    it('filters by status', async () => {
      const svc = await getService()
      const rows = [makeRequest({ status: 'approved' })]

      dbMock.mockSelect.mockResolvedValue(rows)

      const result = await svc.list({ status: 'approved' })

      expect(dbMock.db.select).toHaveBeenCalled()
      expect(result).toEqual(rows)
    })
  })

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns the row when found', async () => {
      const svc = await getService()
      const row = makeRequest()

      dbMock.mockSelect.mockResolvedValueOnce([row])

      const result = await svc.getById('req-1')

      expect(result).toEqual(row)
    })

    it('returns null when not found', async () => {
      const svc = await getService()

      dbMock.mockSelect.mockResolvedValueOnce([])

      const result = await svc.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  // ─── cancel ───────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('returns true when a pending own request is deleted', async () => {
      const svc = await getService()

      dbMock.mockDelete.mockResolvedValueOnce([{ id: 'req-1' }])

      const result = await svc.cancel('req-1', 'u1')

      expect(result).toBe(true)
      expect(dbMock.db.delete).toHaveBeenCalled()
    })

    it('returns false when nothing was deleted (not-own or not-pending)', async () => {
      const svc = await getService()

      // DELETE WHERE returns empty (no matching row)
      dbMock.mockDelete.mockResolvedValueOnce([])

      const result = await svc.cancel('req-1', 'u-other')

      expect(result).toBe(false)
    })
  })

  // ─── approve ──────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('calls CompanyService.update with proposedChanges and sets status=approved', async () => {
      const svc = await getService()
      const { CompanyService } = await import('@/lib/services/company.service')
      const pendingRow = makeRequest()
      const approvedRow = makeRequest({ status: 'approved', reviewedBy: 'admin-1' })

      // getById (select)
      dbMock.mockSelect.mockResolvedValueOnce([pendingRow])
      // update returning
      dbMock.mockUpdate.mockResolvedValueOnce([approvedRow])

      const result = await svc.approve('req-1', 'admin-1')

      expect(CompanyService.update).toHaveBeenCalledWith('c1', { name: 'New Name' })
      expect(result.status).toBe('approved')
      expect(result.reviewedBy).toBe('admin-1')
    })

    it('throws NOT_PENDING when status is not pending', async () => {
      const svc = await getService()
      const approvedRow = makeRequest({ status: 'approved' })

      dbMock.mockSelect.mockResolvedValueOnce([approvedRow])

      await expect(svc.approve('req-1', 'admin-1')).rejects.toThrow('NOT_PENDING')
    })

    it('throws NOT_FOUND when request does not exist', async () => {
      const svc = await getService()

      dbMock.mockSelect.mockResolvedValueOnce([])

      await expect(svc.approve('non-existent', 'admin-1')).rejects.toThrow('NOT_FOUND')
    })
  })

  // ─── reject ───────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('sets status=rejected and stores reviewComment', async () => {
      const svc = await getService()
      const pendingRow = makeRequest()
      const rejectedRow = makeRequest({
        status: 'rejected',
        reviewedBy: 'admin-1',
        reviewComment: 'Bitte korrigieren.',
      })

      // getById
      dbMock.mockSelect.mockResolvedValueOnce([pendingRow])
      // update returning
      dbMock.mockUpdate.mockResolvedValueOnce([rejectedRow])

      const result = await svc.reject('req-1', 'admin-1', 'Bitte korrigieren.')

      expect(result.status).toBe('rejected')
      expect(result.reviewComment).toBe('Bitte korrigieren.')
      expect(result.reviewedBy).toBe('admin-1')
      expect(dbMock.db.update).toHaveBeenCalled()
    })

    it('throws NOT_PENDING when status is not pending', async () => {
      const svc = await getService()
      const rejectedRow = makeRequest({ status: 'rejected' })

      dbMock.mockSelect.mockResolvedValueOnce([rejectedRow])

      await expect(
        svc.reject('req-1', 'admin-1', 'Some comment'),
      ).rejects.toThrow('NOT_PENDING')
    })

    it('throws NOT_FOUND when request does not exist', async () => {
      const svc = await getService()

      dbMock.mockSelect.mockResolvedValueOnce([])

      await expect(
        svc.reject('non-existent', 'admin-1', 'Some comment'),
      ).rejects.toThrow('NOT_FOUND')
    })
  })
})
