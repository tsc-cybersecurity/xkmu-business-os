import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID, TEST_USER_ID } from '../../helpers/fixtures'

const TEST_POST_ID = '00000000-0000-0000-0000-000000000050'

function blogPostFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_POST_ID,
    tenantId: TEST_TENANT_ID,
    title: 'Test Post',
    slug: 'test-post',
    excerpt: 'An excerpt',
    content: '<p>Hello World</p>',
    featuredImage: null,
    featuredImageAlt: null,
    seoTitle: null,
    seoDescription: null,
    seoKeywords: null,
    tags: [],
    category: null,
    status: 'draft',
    source: 'manual',
    aiMetadata: null,
    authorId: TEST_USER_ID,
    publishedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('BlogPostService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/blog-post.service')
    return mod.BlogPostService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a blog post and returns it', async () => {
      const fixture = blogPostFixture()
      // generateSlug -> select (no existing slugs)
      dbMock.mockSelect.mockResolvedValueOnce([])
      // insert
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, { title: 'Test Post' }, TEST_USER_ID)

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('uses provided slug without generating one', async () => {
      const fixture = blogPostFixture({ slug: 'custom-slug' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, { title: 'Test', slug: 'custom-slug' })

      expect(result.slug).toBe('custom-slug')
      // generateSlug should NOT be called (no select for slug check)
      expect(dbMock.db.select).not.toHaveBeenCalled()
    })

    it('sets default status to draft', async () => {
      const fixture = blogPostFixture({ status: 'draft' })
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, { title: 'Test Post' })

      expect(result.status).toBe('draft')
    })

    it('sets default source to manual', async () => {
      const fixture = blogPostFixture({ source: 'manual' })
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, { title: 'Test Post' })

      expect(result.source).toBe('manual')
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns post when found', async () => {
      const fixture = blogPostFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, TEST_POST_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- getBySlug ----

  describe('getBySlug', () => {
    it('returns post when found', async () => {
      const fixture = blogPostFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getBySlug(TEST_TENANT_ID, 'test-post')

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getBySlug(TEST_TENANT_ID, 'nonexistent-slug')

      expect(result).toBeNull()
    })
  })

  // ---- getBySlugPublic ----

  describe('getBySlugPublic', () => {
    it('returns published post when found', async () => {
      const fixture = blogPostFixture({ status: 'published' })
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getBySlugPublic('test-post')

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getBySlugPublic('draft-post')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns post', async () => {
      const fixture = blogPostFixture({ title: 'Updated Title' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_POST_ID, { title: 'Updated Title' })

      expect(result).toEqual(fixture)
      expect(result!.title).toBe('Updated Title')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, 'nonexistent', { title: 'X' })

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_POST_ID }])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, TEST_POST_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- publish ----

  describe('publish', () => {
    it('publishes post and returns it', async () => {
      const fixture = blogPostFixture({ status: 'published', publishedAt: new Date() })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.publish(TEST_TENANT_ID, TEST_POST_ID)

      expect(result).not.toBeNull()
      expect(result!.status).toBe('published')
      expect(result!.publishedAt).not.toBeNull()
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.publish(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- unpublish ----

  describe('unpublish', () => {
    it('unpublishes post and returns it as draft', async () => {
      const fixture = blogPostFixture({ status: 'draft', publishedAt: null })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.unpublish(TEST_TENANT_ID, TEST_POST_ID)

      expect(result).not.toBeNull()
      expect(result!.status).toBe('draft')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.unpublish(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with meta', async () => {
      const fixtures = [blogPostFixture(), blogPostFixture({ id: '00000000-0000-0000-0000-000000000051' })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('uses default page=1 and limit=20', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('filters by status', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { status: 'published' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('filters by category', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { category: 'news' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 100 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID, { page: 2, limit: 10 })

      expect(result.meta.page).toBe(2)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(10)
    })
  })

  // ---- listPublished ----

  describe('listPublished', () => {
    it('returns published posts with meta', async () => {
      const fixtures = [blogPostFixture({ status: 'published', publishedAt: new Date() })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 1 }])

      const service = await getService()
      const result = await service.listPublished()

      expect(result.items).toHaveLength(1)
      expect(result.meta.total).toBe(1)
    })

    it('uses default page=1 and limit=12', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.listPublished()

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(12)
    })

    it('filters by category when provided', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.listPublished({ category: 'tech' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })
  })

  // ---- generateSlug ----

  describe('generateSlug', () => {
    it('generates a slug from a simple title', async () => {
      // No existing slugs
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.generateSlug('Hello World', TEST_TENANT_ID)

      expect(result).toBe('hello-world')
    })

    it('replaces German umlauts', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.generateSlug('Über die Größe', TEST_TENANT_ID)

      expect(result).toBe('ueber-die-groesse')
    })

    it('replaces ß with ss', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.generateSlug('Straße', TEST_TENANT_ID)

      expect(result).toBe('strasse')
    })

    it('appends counter when slug already exists', async () => {
      // Existing slug matches "test-post"
      dbMock.mockSelect.mockResolvedValue([{ slug: 'test-post' }, { slug: 'test-post-2' }])

      const service = await getService()
      const result = await service.generateSlug('Test Post', TEST_TENANT_ID)

      expect(result).toBe('test-post-3')
    })

    it('returns base slug when no duplicates', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.generateSlug('Unique Title', TEST_TENANT_ID)

      expect(result).toBe('unique-title')
    })

    it('removes special characters', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.generateSlug('Hello! @World #2026', TEST_TENANT_ID)

      expect(result).toBe('hello-world-2026')
    })
  })
})
