import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../../helpers/mock-db'

const TOPIC_ID = '00000000-0000-0000-0000-000000000a01'

function topicFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TOPIC_ID,
    name: 'IT-Sicherheit',
    description: null,
    color: '#3b82f6',
    keywords: ['NIS2', 'KMU'],
    sourceType: 'serpapi_news',
    sourceConfig: { maxResults: 10 },
    isActive: true,
    sortOrder: 0,
    createdAt: new Date('2026-05-08T00:00:00Z'),
    updatedAt: new Date('2026-05-08T00:00:00Z'),
    ...overrides,
  }
}

describe('NewsService — Topics', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/news.service')
    return mod.NewsService
  }

  it('listTopics returns all topics ordered by sortOrder', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([topicFixture()])
    const svc = await getService()
    const result = await svc.listTopics()
    expect(result).toHaveLength(1)
    expect(dbMock.db.select).toHaveBeenCalled()
  })

  it('listTopics with activeOnly filter', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([topicFixture({ isActive: true })])
    const svc = await getService()
    const result = await svc.listTopics({ activeOnly: true })
    expect(result).toHaveLength(1)
  })

  it('getTopic returns topic when found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([topicFixture()])
    const svc = await getService()
    const t = await svc.getTopic(TOPIC_ID)
    expect(t?.id).toBe(TOPIC_ID)
  })

  it('getTopic returns null when not found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    const svc = await getService()
    const t = await svc.getTopic(TOPIC_ID)
    expect(t).toBeNull()
  })

  it('createTopic inserts and returns the row', async () => {
    dbMock.mockInsert.mockResolvedValueOnce([topicFixture()])
    const svc = await getService()
    const t = await svc.createTopic({
      name: 'IT-Sicherheit',
      keywords: ['NIS2', 'KMU'],
    })
    expect(t.id).toBe(TOPIC_ID)
    expect(dbMock.db.insert).toHaveBeenCalled()
  })

  it('updateTopic updates and returns the row', async () => {
    dbMock.mockUpdate.mockResolvedValueOnce([topicFixture({ name: 'Geändert' })])
    const svc = await getService()
    const t = await svc.updateTopic(TOPIC_ID, { name: 'Geändert' })
    expect(t?.name).toBe('Geändert')
  })

  it('deleteTopic returns true on success', async () => {
    dbMock.mockDelete.mockResolvedValueOnce([{ id: TOPIC_ID }])
    const svc = await getService()
    const ok = await svc.deleteTopic(TOPIC_ID)
    expect(ok).toBe(true)
  })
})
