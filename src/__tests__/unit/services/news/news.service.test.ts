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

describe('NewsService — Items', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/news.service')
    return mod.NewsService
  }

  const ITEM_ID = '00000000-0000-0000-0000-000000000b01'

  function itemFixture(overrides: Record<string, unknown> = {}) {
    return {
      id: ITEM_ID,
      topicId: '00000000-0000-0000-0000-000000000a01',
      title: 'Test',
      url: 'https://example.com/a',
      snippet: null,
      source: 'example.com',
      imageUrl: null,
      publishedAt: new Date('2026-05-07'),
      urlHash: 'hash',
      pipelineStatus: 'idle',
      pipelineError: null,
      pipelineTaskId: null,
      researchData: null,
      isHidden: false,
      createdAt: new Date('2026-05-08'),
      updatedAt: new Date('2026-05-08'),
      ...overrides,
    }
  }

  it('listItemsByTopic returns non-hidden items by default', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([itemFixture()])
    const svc = await getService()
    const items = await svc.listItemsByTopic('00000000-0000-0000-0000-000000000a01')
    expect(items).toHaveLength(1)
  })

  it('listItemsByTopic includes hidden when hidden=true', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([itemFixture({ isHidden: true })])
    const svc = await getService()
    const items = await svc.listItemsByTopic('00000000-0000-0000-0000-000000000a01', { hidden: true })
    expect(items).toHaveLength(1)
  })

  it('hideItem updates isHidden flag', async () => {
    dbMock.mockUpdate.mockResolvedValueOnce([itemFixture({ isHidden: true })])
    const svc = await getService()
    const ok = await svc.hideItem(ITEM_ID, true)
    expect(ok).toBe(true)
  })

  it('getItem returns null when not found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    const svc = await getService()
    const r = await svc.getItem(ITEM_ID)
    expect(r).toBeNull()
  })

  it('getItem returns item when found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([itemFixture()])
    const svc = await getService()
    const r = await svc.getItem(ITEM_ID)
    expect(r?.id).toBe(ITEM_ID)
  })

  it('listAllForDashboard returns active topics with their items grouped', async () => {
    dbMock.mockSelect
      .mockResolvedValueOnce([{ id: 't1', name: 'IT', color: '#fff', sortOrder: 0, keywords: [], sourceType: 'serpapi_news', sourceConfig: {}, isActive: true, description: null, createdAt: new Date(), updatedAt: new Date() }])
      .mockResolvedValueOnce([itemFixture({ topicId: 't1' })])
    const svc = await getService()
    const result = await svc.listAllForDashboard()
    expect(result).toHaveLength(1)
    expect(result[0].topic.id).toBe('t1')
    expect(result[0].items).toHaveLength(1)
  })
})

describe('NewsService — runResearchForTopic', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  function setupAdapterMock(results: Array<{ title: string; url: string }>) {
    vi.doMock('@/lib/services/news/index', () => ({
      resolveNewsAdapter: () => ({
        search: vi.fn().mockResolvedValue(results),
      }),
    }))
  }

  it('throws when topic not found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    setupAdapterMock([])
    const { NewsService } = await import('@/lib/services/news.service')

    await expect(NewsService.runResearchForTopic('missing')).rejects.toThrow(/topic not found/i)
  })

  it('returns 0/0 when adapter returns no results', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 't1', name: 'X', sourceType: 'serpapi_news', sourceConfig: {}, keywords: ['k1'],
      isActive: true, color: null, description: null, sortOrder: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }])
    setupAdapterMock([])
    const { NewsService } = await import('@/lib/services/news.service')

    const result = await NewsService.runResearchForTopic('t1')
    expect(result).toEqual({ inserted: 0, skipped: 0 })
  })

  it('inserts items with sha256 urlHash and counts inserted vs skipped', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 't1', name: 'X', sourceType: 'serpapi_news', sourceConfig: {}, keywords: ['k1'],
      isActive: true, color: null, description: null, sortOrder: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }])
    setupAdapterMock([
      { title: 'A', url: 'https://example.com/a' },
      { title: 'B', url: 'https://example.com/b' },
    ])
    // .returning() liefert nur die wirklich inserted rows zurück (1 von 2 → 1 inserted, 1 skipped)
    dbMock.mockInsert.mockResolvedValueOnce([{ id: 'i1' }])

    const { NewsService } = await import('@/lib/services/news.service')
    const result = await NewsService.runResearchForTopic('t1')
    expect(result.inserted).toBe(1)
    expect(result.skipped).toBe(1)
    expect(dbMock.db.insert).toHaveBeenCalled()
  })

  it('filters items without url before insert', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 't1', name: 'X', sourceType: 'serpapi_news', sourceConfig: {}, keywords: ['k1'],
      isActive: true, color: null, description: null, sortOrder: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }])
    setupAdapterMock([
      { title: 'OK', url: 'https://example.com/a' },
      { title: 'NoURL', url: '' },
    ])
    dbMock.mockInsert.mockResolvedValueOnce([{ id: 'i1' }])

    const { NewsService } = await import('@/lib/services/news.service')
    await NewsService.runResearchForTopic('t1')

    expect(dbMock.db.insert).toHaveBeenCalledTimes(1)
  })
})
