import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const TEST_USER_ID = '00000000-0000-0000-0000-000000000002'
const TEST_PERSON_ID = '00000000-0000-0000-0000-000000000010'
const TEST_COMPANY_ID = '00000000-0000-0000-0000-000000000003'

function personFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PERSON_ID,
    companyId: TEST_COMPANY_ID,
    salutation: 'Herr',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@example.de',
    phone: '+49 30 12345678',
    mobile: null,
    jobTitle: 'CEO',
    department: 'Geschäftsführung',
    street: 'Teststraße',
    houseNumber: '1',
    postalCode: '12345',
    city: 'Berlin',
    country: 'DE',
    status: 'active',
    isPrimaryContact: false,
    tags: [],
    notes: null,
    customFields: {},
    createdBy: TEST_USER_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('PersonService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/person.service')
    return mod.PersonService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a person and returns it', async () => {
      const fixture = personFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@example.de',
      }, TEST_USER_ID)

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('converts empty strings to null', async () => {
      const fixture = personFixture({ salutation: null, phone: null, mobile: null })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        firstName: 'Max',
        lastName: 'Mustermann',
        salutation: '',
        phone: '',
        mobile: '',
      })

      expect(result.salutation).toBeNull()
      expect(result.phone).toBeNull()
      expect(result.mobile).toBeNull()
    })

    it('sets default country to DE', async () => {
      const fixture = personFixture({ country: 'DE' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        firstName: 'Max',
        lastName: 'Mustermann',
      })

      expect(result.country).toBe('DE')
    })

    it('sets default status to active', async () => {
      const fixture = personFixture({ status: 'active' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        firstName: 'Max',
        lastName: 'Mustermann',
      })

      expect(result.status).toBe('active')
    })

    it('sets default isPrimaryContact to false', async () => {
      const fixture = personFixture({ isPrimaryContact: false })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        firstName: 'Max',
        lastName: 'Mustermann',
      })

      expect(result.isPrimaryContact).toBe(false)
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns person when found', async () => {
      const fixture = personFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_PERSON_ID)

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
    it('updates and returns person', async () => {
      const fixture = personFixture({ firstName: 'Updated' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_PERSON_ID, {
        firstName: 'Updated',
      })

      expect(result).toEqual(fixture)
      expect(result!.firstName).toBe('Updated')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update('nonexistent', { firstName: 'X' })

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_PERSON_ID }])

      const service = await getService()
      const result = await service.delete(TEST_PERSON_ID)

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
      const fixture = personFixture({ company: { id: TEST_COMPANY_ID, name: 'Test GmbH' } })
      const fixtures = [fixture, personFixture({ id: '00000000-0000-0000-0000-000000000011', lastName: 'Schmidt', company: null })]

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

    it('passes companyId filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ companyId: TEST_COMPANY_ID })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes status filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ status: 'active' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes search filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ search: 'Max' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('nullifies company when company has no id', async () => {
      const rowWithNullCompany = { ...personFixture(), company: { id: null, name: null } }
      dbMock.mockSelect.mockResolvedValueOnce([rowWithNullCompany])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items[0].company).toBeNull()
    })
  })

  // ---- search ----

  describe('search', () => {
    it('returns matching persons', async () => {
      const fixture = personFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.search('Max')

      expect(result).toHaveLength(1)
      expect(result[0].firstName).toBe('Max')
    })

    it('returns empty array for empty query', async () => {
      const service = await getService()
      const result = await service.search('   ')

      expect(result).toEqual([])
      expect(dbMock.db.select).not.toHaveBeenCalled()
    })

    it('returns empty array for empty string', async () => {
      const service = await getService()
      const result = await service.search('')

      expect(result).toEqual([])
      expect(dbMock.db.select).not.toHaveBeenCalled()
    })
  })

  // ---- addTag ----

  describe('addTag', () => {
    it('adds tag to person', async () => {
      const fixture = personFixture({ tags: [] })
      const updated = personFixture({ tags: ['vip'] })

      dbMock.mockSelect.mockResolvedValue([fixture])
      dbMock.mockUpdate.mockResolvedValue([updated])

      const service = await getService()
      const result = await service.addTag(TEST_PERSON_ID, 'vip')

      expect(result!.tags).toContain('vip')
    })

    it('does not duplicate existing tag', async () => {
      const fixture = personFixture({ tags: ['vip'] })
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.addTag(TEST_PERSON_ID, 'vip')

      expect(result).toEqual(fixture)
      expect(dbMock.db.update).not.toHaveBeenCalled()
    })

    it('returns null if person not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.addTag('nonexistent', 'tag')

      expect(result).toBeNull()
    })
  })

  // ---- removeTag ----

  describe('removeTag', () => {
    it('removes tag from person', async () => {
      const fixture = personFixture({ tags: ['keep', 'remove'] })
      const updated = personFixture({ tags: ['keep'] })

      dbMock.mockSelect.mockResolvedValue([fixture])
      dbMock.mockUpdate.mockResolvedValue([updated])

      const service = await getService()
      const result = await service.removeTag(TEST_PERSON_ID, 'remove')

      expect(result!.tags).toEqual(['keep'])
    })

    it('returns null if person not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.removeTag('nonexistent', 'tag')

      expect(result).toBeNull()
    })
  })

  // ---- setPrimaryContact ----

  describe('setPrimaryContact', () => {
    it('sets person as primary contact', async () => {
      const fixture = personFixture({ isPrimaryContact: true })
      // First update (unset others) returns nothing, second update (set new) returns fixture
      dbMock.mockUpdate.mockResolvedValueOnce([])
      dbMock.mockUpdate.mockResolvedValueOnce([fixture])

      const service = await getService()
      const result = await service.setPrimaryContact(TEST_COMPANY_ID, TEST_PERSON_ID)

      expect(result!.isPrimaryContact).toBe(true)
      expect(dbMock.db.update).toHaveBeenCalledTimes(2)
    })

    it('returns null if person not found', async () => {
      dbMock.mockUpdate.mockResolvedValueOnce([])
      dbMock.mockUpdate.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.setPrimaryContact(TEST_COMPANY_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })
})
