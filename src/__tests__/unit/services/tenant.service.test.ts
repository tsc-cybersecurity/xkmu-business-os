import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID } from '../../helpers/fixtures'

const TEST_TENANT_ID_2 = '00000000-0000-0000-0000-000000000099'

function tenantFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_TENANT_ID,
    name: 'Test GmbH',
    slug: 'test-gmbh',
    status: 'active',
    plan: 'basic',
    settings: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function createTenantInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test GmbH',
    slug: 'test-gmbh',
    status: 'active' as const,
    plan: 'basic',
    settings: {},
    ...overrides,
  }
}

describe('TenantService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/tenant.service')
    return mod.TenantService
  }

  // ---- create ----

  describe('create', () => {
    it('inserts tenant and returns it', async () => {
      const fixture = tenantFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(createTenantInput())

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns tenant when found', async () => {
      const fixture = tenantFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID)

      expect(result).toBeNull()
    })
  })

  // ---- getBySlug ----

  describe('getBySlug', () => {
    it('returns tenant when found', async () => {
      const fixture = tenantFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getBySlug('test-gmbh')

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getBySlug('nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates fields and returns updated tenant', async () => {
      const updated = tenantFixture({ name: 'Updated GmbH' })
      dbMock.mockUpdate.mockResolvedValue([updated])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, { name: 'Updated GmbH' })

      expect(result).toEqual(updated)
      expect(dbMock.db.update).toHaveBeenCalled()
    })

    it('returns null when tenant not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update('nonexistent-id', { name: 'X' })

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_TENANT_ID }])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete('nonexistent-id')

      expect(result).toBe(false)
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with metadata', async () => {
      const fixture = tenantFixture()
      dbMock.mockSelect.mockResolvedValueOnce([fixture])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])

      const service = await getService()
      const result = await service.list({ page: 1, limit: 20 })

      expect(result.items).toEqual([fixture])
      expect(result.meta.total).toBe(1)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
      expect(result.meta.totalPages).toBe(1)
    })
  })

  // ---- slugExists ----

  describe('slugExists', () => {
    it('returns true when slug is taken by another tenant', async () => {
      dbMock.mockSelect.mockResolvedValue([{ id: TEST_TENANT_ID_2 }])

      const service = await getService()
      const result = await service.slugExists('test-gmbh')

      expect(result).toBe(true)
    })

    it('returns false when slug is free', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.slugExists('free-slug')

      expect(result).toBe(false)
    })

    it('returns false when slug belongs to the excluded tenant (update case)', async () => {
      dbMock.mockSelect.mockResolvedValue([{ id: TEST_TENANT_ID }])

      const service = await getService()
      const result = await service.slugExists('test-gmbh', TEST_TENANT_ID)

      expect(result).toBe(false)
    })
  })
})
