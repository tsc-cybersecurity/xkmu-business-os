import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const TEST_TOPIC_ID = '00000000-0000-0000-0000-000000000070'
const TEST_TOPIC_ID_2 = '00000000-0000-0000-0000-000000000071'

function topicFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_TOPIC_ID,
    name: 'AI & Automation',
    description: null,
    color: '#3b82f6',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('SocialMediaTopicService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/social-media-topic.service')
    return mod.SocialMediaTopicService
  }

  // ---- list ----

  describe('list', () => {
    it('returns all topics', async () => {
      const topics = [topicFixture(), topicFixture({ id: TEST_TOPIC_ID_2, name: 'Cyber Security' })]
      dbMock.mockSelect.mockResolvedValueOnce(topics)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(dbMock.db.select).toHaveBeenCalled()
    })

    it('returns empty array when no topics', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items).toEqual([])
      expect(result.meta.total).toBe(0)
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns topic when found', async () => {
      const fixture = topicFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_TOPIC_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById('nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- create ----

  describe('create', () => {
    it('creates a topic and returns it', async () => {
      const fixture = topicFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'AI & Automation',
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('sets default color to #3b82f6', async () => {
      const fixture = topicFixture({ color: '#3b82f6' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Marketing',
      })

      expect(result.color).toBe('#3b82f6')
    })

    it('uses provided color when specified', async () => {
      const fixture = topicFixture({ color: '#ff0000' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Urgent',
        color: '#ff0000',
      })

      expect(result.color).toBe('#ff0000')
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns topic', async () => {
      const fixture = topicFixture({ name: 'Updated Topic' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TOPIC_ID, {
        name: 'Updated Topic',
      })

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Updated Topic')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update('nonexistent', { name: 'X' })

      expect(result).toBeNull()
    })

    it('can update color', async () => {
      const fixture = topicFixture({ color: '#00ff00' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TOPIC_ID, {
        color: '#00ff00',
      })

      expect(result!.color).toBe('#00ff00')
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_TOPIC_ID }])

      const service = await getService()
      const result = await service.delete(TEST_TOPIC_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete('nonexistent')

      expect(result).toBe(false)
    })
  })
})
