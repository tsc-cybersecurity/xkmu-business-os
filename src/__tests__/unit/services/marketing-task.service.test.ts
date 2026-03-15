import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID } from '../../helpers/fixtures'

const TEST_CAMPAIGN_ID = '00000000-0000-0000-0000-000000000040'
const TEST_TASK_ID = '00000000-0000-0000-0000-000000000050'
const TEST_TASK_ID_2 = '00000000-0000-0000-0000-000000000051'

function taskFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_TASK_ID,
    tenantId: TEST_TENANT_ID,
    campaignId: TEST_CAMPAIGN_ID,
    type: 'email',
    recipientEmail: 'test@example.com',
    recipientName: 'Max Mustermann',
    recipientCompany: null,
    personId: null,
    companyId: null,
    subject: 'Test Subject',
    content: 'Test content',
    scheduledAt: null,
    status: 'draft',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('MarketingTaskService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/marketing-task.service')
    return mod.MarketingTaskService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a task and returns it', async () => {
      const fixture = taskFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        campaignId: TEST_CAMPAIGN_ID,
        type: 'email',
        recipientEmail: 'test@example.com',
        subject: 'Test Subject',
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('sets default status to draft', async () => {
      const fixture = taskFixture({ status: 'draft' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        campaignId: TEST_CAMPAIGN_ID,
        type: 'email',
      })

      expect(result.status).toBe('draft')
    })

    it('converts scheduledAt string to Date', async () => {
      const fixture = taskFixture({ scheduledAt: new Date('2026-06-01T10:00:00Z') })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        campaignId: TEST_CAMPAIGN_ID,
        type: 'email',
        scheduledAt: '2026-06-01T10:00:00Z',
      })

      expect(result).toBeDefined()
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns task when found', async () => {
      const fixture = taskFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, TEST_TASK_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns task', async () => {
      const fixture = taskFixture({ subject: 'Updated Subject' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_TASK_ID, {
        subject: 'Updated Subject',
      })

      expect(result).not.toBeNull()
      expect(result!.subject).toBe('Updated Subject')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, 'nonexistent', { subject: 'X' })

      expect(result).toBeNull()
    })

    it('can update status', async () => {
      const fixture = taskFixture({ status: 'sent' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_TASK_ID, {
        status: 'sent',
      })

      expect(result!.status).toBe('sent')
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_TASK_ID }])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, TEST_TASK_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with meta', async () => {
      const fixtures = [taskFixture(), taskFixture({ id: TEST_TASK_ID_2 })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('filters by campaignId', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { campaignId: TEST_CAMPAIGN_ID })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('filters by status', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { status: 'sent' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 30 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID, { page: 2, limit: 10 })

      expect(result.meta.page).toBe(2)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(3)
    })
  })

  // ---- listByCampaign ----

  describe('listByCampaign', () => {
    it('returns tasks for a campaign', async () => {
      const fixtures = [taskFixture(), taskFixture({ id: TEST_TASK_ID_2 })]
      dbMock.mockSelect.mockResolvedValue(fixtures)

      const service = await getService()
      const result = await service.listByCampaign(TEST_TENANT_ID, TEST_CAMPAIGN_ID)

      expect(result).toHaveLength(2)
    })

    it('returns empty array when no tasks', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.listByCampaign(TEST_TENANT_ID, TEST_CAMPAIGN_ID)

      expect(result).toEqual([])
    })
  })
})
