import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID, TEST_COMPANY_ID } from '../../helpers/fixtures'

const TEST_ACTIVITY_ID = '00000000-0000-0000-0000-000000000020'
const TEST_LEAD_ID = '00000000-0000-0000-0000-000000000021'
const TEST_PERSON_ID = '00000000-0000-0000-0000-000000000022'

function activityFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ACTIVITY_ID,
    leadId: null,
    companyId: null,
    personId: null,
    type: 'note',
    subject: 'Test Subject',
    content: 'Test Content',
    metadata: {},
    userId: TEST_USER_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function activityWithUserFixture(overrides: Record<string, unknown> = {}) {
  return {
    ...activityFixture(overrides),
    user: {
      id: TEST_USER_ID,
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max@test.de',
    },
  }
}

describe('ActivityService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/activity.service')
    return mod.ActivityService
  }

  // ---- create ----

  describe('create', () => {
    it('creates an activity and returns it', async () => {
      const fixture = activityFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        type: 'note',
        subject: 'Test Subject',
        content: 'Test Content',
      }, TEST_USER_ID)

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('creates activity with lead reference', async () => {
      const fixture = activityFixture({ leadId: TEST_LEAD_ID })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        type: 'call',
        leadId: TEST_LEAD_ID,
      })

      expect(result.leadId).toBe(TEST_LEAD_ID)
    })

    it('creates activity with company reference', async () => {
      const fixture = activityFixture({ companyId: TEST_COMPANY_ID })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        type: 'meeting',
        companyId: TEST_COMPANY_ID,
      })

      expect(result.companyId).toBe(TEST_COMPANY_ID)
    })

    it('creates activity without userId when not provided', async () => {
      const fixture = activityFixture({ userId: null })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        type: 'note',
      })

      expect(dbMock.db.insert).toHaveBeenCalled()
      expect(result).toEqual(fixture)
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns activity when found', async () => {
      const fixture = activityFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_ACTIVITY_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById('nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_ACTIVITY_ID }])

      const service = await getService()
      const result = await service.delete(TEST_ACTIVITY_ID)

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
        activityWithUserFixture(),
        activityWithUserFixture({ id: '00000000-0000-0000-0000-000000000023', type: 'call' }),
      ]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(50)
      expect(result.meta.totalPages).toBe(1)
    })

    it('uses default page=1 and limit=50', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.list()

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(50)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 100 }])

      const service = await getService()
      const result = await service.list({ page: 2, limit: 25 })

      expect(result.meta.page).toBe(2)
      expect(result.meta.limit).toBe(25)
      expect(result.meta.totalPages).toBe(4)
    })

    it('passes leadId filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ leadId: TEST_LEAD_ID })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes companyId filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ companyId: TEST_COMPANY_ID })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes type filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ type: 'call' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('nullifies user when user has no id', async () => {
      const fixtureWithoutUser = {
        ...activityFixture(),
        user: { id: null, firstName: null, lastName: null, email: null },
      }
      dbMock.mockSelect.mockResolvedValueOnce([fixtureWithoutUser])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 1 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items[0].user).toBeNull()
    })
  })

  // ---- listByLead ----

  describe('listByLead', () => {
    it('returns activities for a lead', async () => {
      const fixtures = [activityWithUserFixture({ leadId: TEST_LEAD_ID })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 1 }])

      const service = await getService()
      const result = await service.listByLead(TEST_LEAD_ID)

      expect(result.items).toHaveLength(1)
      expect(result.meta.total).toBe(1)
    })

    it('returns empty list when no activities for lead', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.listByLead('nonexistent-lead')

      expect(result.items).toHaveLength(0)
      expect(result.meta.total).toBe(0)
    })
  })

  // ---- listByCompany ----

  describe('listByCompany', () => {
    it('returns activities for a company', async () => {
      const fixtures = [activityWithUserFixture({ companyId: TEST_COMPANY_ID })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 1 }])

      const service = await getService()
      const result = await service.listByCompany(TEST_COMPANY_ID)

      expect(result.items).toHaveLength(1)
      expect(result.meta.total).toBe(1)
    })

    it('returns empty list when no activities for company', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.listByCompany('nonexistent-company')

      expect(result.items).toHaveLength(0)
    })

    it('respects pagination for company list', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 200 }])

      const service = await getService()
      const result = await service.listByCompany(TEST_COMPANY_ID, { page: 2, limit: 50 })

      expect(result.meta.page).toBe(2)
      expect(result.meta.totalPages).toBe(4)
    })
  })
})
