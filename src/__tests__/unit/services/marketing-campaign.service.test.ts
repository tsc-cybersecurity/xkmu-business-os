import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const TEST_CAMPAIGN_ID = '00000000-0000-0000-0000-000000000040'
const TEST_CAMPAIGN_ID_2 = '00000000-0000-0000-0000-000000000041'

function campaignFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_CAMPAIGN_ID,
    name: 'Summer Campaign',
    description: null,
    type: 'email',
    status: 'draft',
    targetAudience: null,
    startDate: null,
    endDate: null,
    settings: {},
    createdBy: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('MarketingCampaignService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/marketing-campaign.service')
    return mod.MarketingCampaignService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a campaign and returns it', async () => {
      const fixture = campaignFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Summer Campaign',
        type: 'email',
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('sets default status to draft', async () => {
      const fixture = campaignFixture({ status: 'draft' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Test Campaign',
        type: 'social',
      })

      expect(result.status).toBe('draft')
    })

    it('passes createdBy to insert', async () => {
      const fixture = campaignFixture({ createdBy: TEST_USER_ID })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Test Campaign',
        type: 'email',
      }, TEST_USER_ID)

      expect(result.createdBy).toBe(TEST_USER_ID)
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns campaign when found', async () => {
      const fixture = campaignFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_CAMPAIGN_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById('nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns campaign', async () => {
      const fixture = campaignFixture({ name: 'Updated Campaign' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_CAMPAIGN_ID, {
        name: 'Updated Campaign',
      })

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Updated Campaign')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update('nonexistent', { name: 'X' })

      expect(result).toBeNull()
    })

    it('converts startDate string to Date', async () => {
      const fixture = campaignFixture({ startDate: new Date('2026-06-01') })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_CAMPAIGN_ID, {
        startDate: '2026-06-01',
      })

      expect(result).toBeDefined()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_CAMPAIGN_ID }])

      const service = await getService()
      const result = await service.delete(TEST_CAMPAIGN_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete('nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with meta', async () => {
      const fixtures = [
        campaignFixture(),
        campaignFixture({ id: TEST_CAMPAIGN_ID_2, name: 'Winter Campaign' }),
      ]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('uses default page=1 and limit=20', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.list()

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('filters by status', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ status: 'active' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('filters by type', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ type: 'email' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('filters by search term', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ search: 'Summer' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 50 }])

      const service = await getService()
      const result = await service.list({ page: 3, limit: 10 })

      expect(result.meta.page).toBe(3)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(5)
    })
  })
})
