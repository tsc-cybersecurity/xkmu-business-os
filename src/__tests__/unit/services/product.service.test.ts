import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const TEST_PRODUCT_ID = '00000000-0000-0000-0000-000000000010'
const TEST_CATEGORY_ID = '00000000-0000-0000-0000-000000000011'

function productFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PRODUCT_ID,
    type: 'product',
    name: 'Test Produkt',
    description: null,
    sku: 'SKU-001',
    categoryId: null,
    priceNet: '99.99',
    vatRate: '19',
    unit: 'Stück',
    status: 'active',
    tags: [],
    notes: null,
    customFields: {},
    isPublic: false,
    isHighlight: false,
    shortDescription: null,
    slug: 'test-produkt',
    seoTitle: null,
    seoDescription: null,
    images: [],
    weight: null,
    dimensions: null,
    manufacturer: null,
    ean: null,
    minOrderQuantity: 1,
    deliveryTime: null,
    createdBy: TEST_USER_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function productWithCategoryFixture(overrides: Record<string, unknown> = {}) {
  return {
    ...productFixture(overrides),
    category: null,
  }
}

describe('ProductService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/product.service')
    return mod.ProductService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a product and returns it', async () => {
      const fixture = productFixture()
      // generateSlug calls select (no existing slug found), then insert
      dbMock.mockSelect.mockResolvedValue([])
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        type: 'product',
        name: 'Test Produkt',
        sku: 'SKU-001',
      }, TEST_USER_ID)

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('uses provided slug without generating one', async () => {
      const fixture = productFixture({ slug: 'my-custom-slug' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        type: 'product',
        name: 'Test Produkt',
        slug: 'my-custom-slug',
      })

      expect(result.slug).toBe('my-custom-slug')
      // No select needed for slug generation when slug is provided
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('defaults vatRate to 19 and unit to Stück', async () => {
      const fixture = productFixture({ vatRate: '19', unit: 'Stück' })
      dbMock.mockSelect.mockResolvedValue([])
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        type: 'product',
        name: 'Test',
      })

      expect(result.vatRate).toBe('19')
      expect(result.unit).toBe('Stück')
    })

    it('defaults status to active', async () => {
      const fixture = productFixture({ status: 'active' })
      dbMock.mockSelect.mockResolvedValue([])
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        type: 'product',
        name: 'Test',
      })

      expect(result.status).toBe('active')
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns product with category when found', async () => {
      const fixture = productWithCategoryFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_PRODUCT_ID)

      expect(result).toBeDefined()
      expect(result!.id).toBe(TEST_PRODUCT_ID)
      expect(result!.category).toBeNull()
    })

    it('returns product with category object when categoryId exists', async () => {
      const fixture = {
        ...productWithCategoryFixture({ categoryId: TEST_CATEGORY_ID }),
        category: { id: TEST_CATEGORY_ID, name: 'Software' },
      }
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_PRODUCT_ID)

      expect(result!.category).toEqual({ id: TEST_CATEGORY_ID, name: 'Software' })
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
    it('updates and returns product', async () => {
      const fixture = productFixture({ name: 'Updated Produkt' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_PRODUCT_ID, {
        name: 'Updated Produkt',
      })

      expect(result).toEqual(fixture)
      expect(result!.name).toBe('Updated Produkt')
    })

    it('converts priceNet number to string', async () => {
      const fixture = productFixture({ priceNet: '149.99' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_PRODUCT_ID, {
        priceNet: 149.99,
      })

      expect(result).toBeDefined()
      expect(result!.priceNet).toBe('149.99')
    })

    it('converts vatRate number to string', async () => {
      const fixture = productFixture({ vatRate: '7' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_PRODUCT_ID, {
        vatRate: 7,
      })

      expect(result!.vatRate).toBe('7')
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
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_PRODUCT_ID }])

      const service = await getService()
      const result = await service.delete(TEST_PRODUCT_ID)

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
        productWithCategoryFixture(),
        productWithCategoryFixture({ id: '00000000-0000-0000-0000-000000000012', name: 'Second Produkt' }),
      ]

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

    it('passes type filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ type: 'service' })

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
    it('returns matching products', async () => {
      const fixture = productFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.search('Test')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Produkt')
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
    it('adds tag to product', async () => {
      const fixture = productFixture({ tags: [] })
      const updated = productFixture({ tags: ['new-tag'] })

      dbMock.mockSelect.mockResolvedValue([fixture])
      dbMock.mockUpdate.mockResolvedValue([updated])

      const service = await getService()
      const result = await service.addTag(TEST_PRODUCT_ID, 'new-tag')

      expect(result!.tags).toContain('new-tag')
    })

    it('does not duplicate existing tag', async () => {
      const fixture = productFixture({ tags: ['existing'] })
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.addTag(TEST_PRODUCT_ID, 'existing')

      expect(result).toEqual(fixture)
      expect(dbMock.db.update).not.toHaveBeenCalled()
    })

    it('returns null if product not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.addTag('nonexistent', 'tag')

      expect(result).toBeNull()
    })
  })

  // ---- removeTag ----

  describe('removeTag', () => {
    it('removes tag from product', async () => {
      const fixture = productFixture({ tags: ['keep', 'remove'] })
      const updated = productFixture({ tags: ['keep'] })

      dbMock.mockSelect.mockResolvedValue([fixture])
      dbMock.mockUpdate.mockResolvedValue([updated])

      const service = await getService()
      const result = await service.removeTag(TEST_PRODUCT_ID, 'remove')

      expect(result!.tags).toEqual(['keep'])
    })

    it('returns null if product not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.removeTag('nonexistent', 'tag')

      expect(result).toBeNull()
    })
  })

  // ---- generateSlug ----

  describe('generateSlug', () => {
    it('generates slug from name', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const slug = await service.generateSlug('Mein Produkt')

      expect(slug).toBe('mein-produkt')
    })

    it('converts German umlauts', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const slug = await service.generateSlug('Müller & Söhne')

      expect(slug).toBe('mueller-soehne')
    })

    it('appends counter when slug already exists', async () => {
      // First call: slug exists, second call: unique
      dbMock.mockSelect.mockResolvedValueOnce([{ id: 'existing-id' }])
      dbMock.mockSelect.mockResolvedValueOnce([])

      const service = await getService()
      const slug = await service.generateSlug('Test')

      expect(slug).toBe('test-2')
    })
  })
})
