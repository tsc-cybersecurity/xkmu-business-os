import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const TEST_POST_ID = '00000000-0000-0000-0000-000000000060'
const TEST_POST_ID_2 = '00000000-0000-0000-0000-000000000061'
const TEST_TOPIC_ID = '00000000-0000-0000-0000-000000000070'

function postFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_POST_ID,
    topicId: null,
    platform: 'linkedin',
    title: null,
    content: 'Test post content',
    hashtags: [],
    imageUrl: null,
    scheduledAt: null,
    postedAt: null,
    status: 'draft',
    aiGenerated: false,
    createdBy: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('SocialMediaPostService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/social-media-post.service')
    return mod.SocialMediaPostService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a post and returns it', async () => {
      const fixture = postFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        platform: 'linkedin',
        content: 'Test post content',
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('sets default status to draft', async () => {
      const fixture = postFixture({ status: 'draft' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        platform: 'twitter',
        content: 'Hello Twitter!',
      })

      expect(result.status).toBe('draft')
    })

    it('sets default aiGenerated to false', async () => {
      const fixture = postFixture({ aiGenerated: false })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        platform: 'linkedin',
        content: 'Manual post',
      })

      expect(result.aiGenerated).toBe(false)
    })

    it('passes createdBy to insert', async () => {
      const fixture = postFixture({ createdBy: TEST_USER_ID })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        platform: 'linkedin',
        content: 'Test',
      }, TEST_USER_ID)

      expect(result.createdBy).toBe(TEST_USER_ID)
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns post when found', async () => {
      const fixture = postFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_POST_ID)

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
    it('updates and returns post', async () => {
      const fixture = postFixture({ content: 'Updated content' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_POST_ID, {
        content: 'Updated content',
      })

      expect(result).not.toBeNull()
      expect(result!.content).toBe('Updated content')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update('nonexistent', { content: 'X' })

      expect(result).toBeNull()
    })

    it('can update platform', async () => {
      const fixture = postFixture({ platform: 'twitter' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_POST_ID, {
        platform: 'twitter',
      })

      expect(result!.platform).toBe('twitter')
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_POST_ID }])

      const service = await getService()
      const result = await service.delete(TEST_POST_ID)

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
        postFixture(),
        postFixture({ id: TEST_POST_ID_2, platform: 'twitter' }),
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

    it('filters by platform', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ platform: 'linkedin' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('filters by status', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ status: 'scheduled' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('filters by topicId', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list({ topicId: TEST_TOPIC_ID })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 40 }])

      const service = await getService()
      const result = await service.list({ page: 2, limit: 10 })

      expect(result.meta.page).toBe(2)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(4)
    })
  })

  // ---- bulkCreate ----

  describe('bulkCreate', () => {
    it('creates multiple posts and returns them', async () => {
      const fixtures = [postFixture(), postFixture({ id: TEST_POST_ID_2 })]
      dbMock.mockInsert.mockResolvedValue(fixtures)

      const service = await getService()
      const result = await service.bulkCreate([
        { platform: 'linkedin', content: 'Post 1' },
        { platform: 'twitter', content: 'Post 2' },
      ])

      expect(result).toHaveLength(2)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('returns empty array for empty input', async () => {
      const service = await getService()
      const result = await service.bulkCreate([])

      expect(result).toEqual([])
      expect(dbMock.db.insert).not.toHaveBeenCalled()
    })
  })
})
