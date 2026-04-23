import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { companyFixture, TEST_COMPANY_ID, TEST_USER_ID } from '../../helpers/fixtures'

// Mock webhook service (fire-and-forget side effect)
vi.mock('@/lib/services/webhook.service', () => ({
  WebhookService: { fire: vi.fn().mockResolvedValue(undefined) },
}))

describe('CompanyService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/company.service')
    return mod.CompanyService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a company and returns it', async () => {
      const fixture = companyFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Test GmbH',
        city: 'Berlin',
      }, TEST_USER_ID)

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('converts empty strings to null', async () => {
      const fixture = companyFixture({ legalForm: null, street: null })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Test',
        legalForm: '',
        street: '',
      })

      expect(result.legalForm).toBeNull()
      expect(result.street).toBeNull()
    })

    it('sets default country to DE', async () => {
      const fixture = companyFixture({ country: 'DE' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({ name: 'Test' })

      expect(result.country).toBe('DE')
    })

    it('sets default status to prospect', async () => {
      const fixture = companyFixture({ status: 'prospect' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({ name: 'Test' })

      expect(result.status).toBe('prospect')
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns company when found', async () => {
      const fixture = companyFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_COMPANY_ID)

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
    it('updates and returns company', async () => {
      const fixture = companyFixture({ name: 'Updated GmbH' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_COMPANY_ID, {
        name: 'Updated GmbH',
      })

      expect(result).toEqual(fixture)
      expect(result!.name).toBe('Updated GmbH')
    })

    it('converts annualRevenue number to string', async () => {
      const fixture = companyFixture({ annualRevenue: '500000.00' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_COMPANY_ID, {
        annualRevenue: 500000,
      })

      expect(result).toBeDefined()
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update('nonexistent', { name: 'X' })

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_COMPANY_ID }])

      const service = await getService()
      const result = await service.delete(TEST_COMPANY_ID)

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
      const fixtures = [companyFixture(), companyFixture({ id: '00000000-0000-0000-0000-000000000004', name: 'Other GmbH' })]

      // First call: items, second call: count
      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 2 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
      expect(result.meta.totalPages).toBe(1)
    })

    it('uses default page=1 and limit=20', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      const result = await service.list()

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 50 }])

      const service = await getService()
      const result = await service.list({ page: 3, limit: 10 })

      expect(result.meta.page).toBe(3)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(5)
    })

    it('passes status filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ status: 'customer' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes search filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ search: 'Test' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes tags filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ tags: ['premium'] })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })
  })

  // ---- search ----

  describe('search', () => {
    it('returns matching companies', async () => {
      const fixture = companyFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.search('Test')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test GmbH')
    })

    it('returns empty array for empty query', async () => {
      const service = await getService()
      const result = await service.search('   ')

      expect(result).toEqual([])
      expect(dbMock.db.select).not.toHaveBeenCalled()
    })
  })

  // ---- addTag ----

  describe('addTag', () => {
    it('adds tag to company', async () => {
      const fixture = companyFixture({ tags: [] })
      const updated = companyFixture({ tags: ['new-tag'] })

      dbMock.mockSelect.mockResolvedValue([fixture])
      dbMock.mockUpdate.mockResolvedValue([updated])

      const service = await getService()
      const result = await service.addTag(TEST_COMPANY_ID, 'new-tag')

      expect(result!.tags).toContain('new-tag')
    })

    it('does not duplicate existing tag', async () => {
      const fixture = companyFixture({ tags: ['existing'] })
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.addTag(TEST_COMPANY_ID, 'existing')

      expect(result).toEqual(fixture)
      expect(dbMock.db.update).not.toHaveBeenCalled()
    })

    it('returns null if company not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.addTag('nonexistent', 'tag')

      expect(result).toBeNull()
    })
  })

  // ---- removeTag ----

  describe('removeTag', () => {
    it('removes tag from company', async () => {
      const fixture = companyFixture({ tags: ['keep', 'remove'] })
      const updated = companyFixture({ tags: ['keep'] })

      dbMock.mockSelect.mockResolvedValue([fixture])
      dbMock.mockUpdate.mockResolvedValue([updated])

      const service = await getService()
      const result = await service.removeTag(TEST_COMPANY_ID, 'remove')

      expect(result!.tags).toEqual(['keep'])
    })

    it('returns null if company not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.removeTag('nonexistent', 'tag')

      expect(result).toBeNull()
    })
  })

  // ---- getPersons ----

  describe('getPersons', () => {
    it('returns persons for company', async () => {
      const person = { id: 'p1', firstName: 'Max', lastName: 'Mustermann', companyId: TEST_COMPANY_ID }
      dbMock.mockSelect.mockResolvedValue([person])

      const service = await getService()
      const result = await service.getPersons(TEST_COMPANY_ID)

      expect(result).toHaveLength(1)
      expect(result[0].firstName).toBe('Max')
    })

    it('returns empty array when no persons', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getPersons(TEST_COMPANY_ID)

      expect(result).toEqual([])
    })
  })

  // ---- checkDuplicate ----

  describe('checkDuplicate', () => {
    it('finds duplicate by name (case-insensitive)', async () => {
      const fixture = companyFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.checkDuplicate('test gmbh')

      expect(result).toEqual(fixture)
    })

    it('finds duplicate by website domain', async () => {
      const fixture = companyFixture()
      // First select (by name) returns nothing
      dbMock.mockSelect.mockResolvedValueOnce([])
      // Second select (by domain) returns match
      dbMock.mockSelect.mockResolvedValueOnce([fixture])

      const service = await getService()
      const result = await service.checkDuplicate('Other Name', 'https://test-gmbh.de')

      expect(result).toEqual(fixture)
    })

    it('returns null when no duplicate', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.checkDuplicate('Unique Corp')

      expect(result).toBeNull()
    })

    it('handles invalid URL gracefully', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.checkDuplicate('Test', ':::invalid')

      expect(result).toBeNull()
    })
  })
})
