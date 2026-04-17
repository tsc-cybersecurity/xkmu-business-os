import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID } from '../../helpers/fixtures'

const TEST_PAGE_ID = '00000000-0000-0000-0000-000000000010'
const TEST_PAGE_ID_2 = '00000000-0000-0000-0000-000000000011'

function cmsPageFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PAGE_ID,
    tenantId: TEST_TENANT_ID,
    slug: 'test-page',
    title: 'Test Page',
    seoTitle: null,
    seoDescription: null,
    seoKeywords: null,
    ogImage: null,
    status: 'draft',
    publishedAt: null,
    publishedBlocks: null,
    publishedTitle: null,
    publishedSeoTitle: null,
    publishedSeoDescription: null,
    publishedSeoKeywords: null,
    hasDraftChanges: false,
    createdBy: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function cmsBlockFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000020',
    tenantId: TEST_TENANT_ID,
    pageId: TEST_PAGE_ID,
    blockType: 'hero',
    sortOrder: 0,
    content: {},
    settings: {},
    isVisible: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('CmsPageService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/cms-page.service')
    return mod.CmsPageService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a page and returns it', async () => {
      const fixture = cmsPageFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        slug: 'test-page',
        title: 'Test Page',
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('sets default status to draft', async () => {
      const fixture = cmsPageFixture({ status: 'draft' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        slug: 'test-page',
        title: 'Test Page',
      })

      expect(result.status).toBe('draft')
    })

    it('passes createdBy to insert', async () => {
      const fixture = cmsPageFixture({ createdBy: 'user-1' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        slug: 'test-page',
        title: 'Test Page',
      }, 'user-1')

      expect(result.createdBy).toBe('user-1')
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns page with blocks when found', async () => {
      const page = cmsPageFixture()
      const block = cmsBlockFixture()

      dbMock.mockSelect.mockResolvedValueOnce([page])
      dbMock.mockSelect.mockResolvedValueOnce([block])

      const service = await getService()
      const result = await service.getById(TEST_PAGE_ID)

      expect(result).not.toBeNull()
      expect(result!.id).toBe(TEST_PAGE_ID)
      expect(result!.blocks).toHaveLength(1)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.getById('nonexistent')

      expect(result).toBeNull()
    })

    it('returns page with empty blocks array when no blocks', async () => {
      const page = cmsPageFixture()
      dbMock.mockSelect.mockResolvedValueOnce([page])
      dbMock.mockSelect.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.getById(TEST_PAGE_ID)

      expect(result!.blocks).toEqual([])
    })
  })

  // ---- getBySlug ----

  describe('getBySlug', () => {
    it('returns page with blocks when found by slug', async () => {
      const page = cmsPageFixture()
      const block = cmsBlockFixture()

      dbMock.mockSelect.mockResolvedValueOnce([page])
      dbMock.mockSelect.mockResolvedValueOnce([block])

      const service = await getService()
      const result = await service.getBySlug('test-page')

      expect(result).not.toBeNull()
      expect(result!.slug).toBe('test-page')
      expect(result!.blocks).toHaveLength(1)
    })

    it('returns null when slug not found', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.getBySlug('nonexistent-slug')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns page', async () => {
      const existingPage = cmsPageFixture({ status: 'draft' })
      const updatedPage = cmsPageFixture({ title: 'Updated Title' })

      dbMock.mockSelect.mockResolvedValueOnce([existingPage])
      dbMock.mockUpdate.mockResolvedValueOnce([updatedPage])

      const service = await getService()
      const result = await service.update(TEST_PAGE_ID, {
        title: 'Updated Title',
      })

      expect(result).not.toBeNull()
      expect(result!.title).toBe('Updated Title')
    })

    it('returns null when page not found', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockUpdate.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.update('nonexistent', { title: 'X' })

      expect(result).toBeNull()
    })

    it('marks hasDraftChanges when updating published page', async () => {
      const existingPage = cmsPageFixture({ status: 'published' })
      const updatedPage = cmsPageFixture({ status: 'published', hasDraftChanges: true })

      dbMock.mockSelect.mockResolvedValueOnce([existingPage])
      dbMock.mockUpdate.mockResolvedValueOnce([updatedPage])

      const service = await getService()
      const result = await service.update(TEST_PAGE_ID, {
        title: 'New Title',
      })

      expect(dbMock.db.update).toHaveBeenCalled()
      expect(result).not.toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_PAGE_ID }])

      const service = await getService()
      const result = await service.delete(TEST_PAGE_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete('nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- publish ----

  describe('publish', () => {
    it('publishes page and returns updated page', async () => {
      const blocks = [cmsBlockFixture()]
      const page = cmsPageFixture()
      const publishedPage = cmsPageFixture({ status: 'published', publishedAt: new Date() })

      dbMock.mockSelect.mockResolvedValueOnce(blocks)
      dbMock.mockSelect.mockResolvedValueOnce([page])
      dbMock.mockUpdate.mockResolvedValueOnce([publishedPage])

      const service = await getService()
      const result = await service.publish(TEST_PAGE_ID)

      expect(result).not.toBeNull()
      expect(result!.status).toBe('published')
      expect(dbMock.db.update).toHaveBeenCalled()
    })

    it('returns null when page not found during publish', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.publish('nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with meta', async () => {
      const fixtures = [cmsPageFixture(), cmsPageFixture({ id: TEST_PAGE_ID_2, slug: 'another' })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(50)
    })

    it('uses default page=1 and limit=50', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.list()

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(50)
    })

    it('filters by status', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ status: 'published' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 100 }])

      const service = await getService()
      const result = await service.list({ page: 2, limit: 10 })

      expect(result.meta.page).toBe(2)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(10)
    })
  })
})
