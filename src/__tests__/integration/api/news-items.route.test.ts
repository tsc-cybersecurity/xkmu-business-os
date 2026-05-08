import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

vi.mock('@/lib/services/audit-log.service', () => ({
  AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
}))

const ITEM_ID = '00000000-0000-0000-0000-000000000d01'

function newsItemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    topicId: '00000000-0000-0000-0000-000000000a01',
    title: 'Test',
    url: 'https://example.com/a',
    snippet: null,
    source: 'example.com',
    imageUrl: null,
    publishedAt: null,
    urlHash: 'h',
    pipelineStatus: 'idle',
    pipelineError: null,
    pipelineTaskId: null,
    researchData: null,
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('POST /api/v1/news/items/[id]/pipeline', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  async function getHandler() {
    const mod = await import('@/app/api/v1/news/items/[id]/pipeline/route')
    return mod.POST
  }

  it('returns 404 when item missing', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: { getItem: vi.fn().mockResolvedValue(null) },
    }))
    const handler = await getHandler()
    const req = createTestRequest('POST', '/api/v1/news/items/missing/pipeline')
    const res = await handler(req, createTestParams('missing'))
    expect(res.status).toBe(404)
  })

  it('returns 409 when pipeline already running', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: {
        getItem: vi.fn().mockResolvedValue(newsItemFixture({ pipelineStatus: 'researching' })),
      },
    }))
    const handler = await getHandler()
    const req = createTestRequest('POST', `/api/v1/news/items/${ITEM_ID}/pipeline`)
    const res = await handler(req, createTestParams(ITEM_ID))
    expect(res.status).toBe(409)
  })

  it('enqueues task and returns 202 on success', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: {
        getItem: vi.fn().mockResolvedValue(newsItemFixture({ pipelineStatus: 'idle' })),
      },
    }))
    dbMock.mockInsert.mockResolvedValueOnce([{ id: 'task-1' }])
    dbMock.mockUpdate.mockResolvedValueOnce([{ id: ITEM_ID }])

    const handler = await getHandler()
    const req = createTestRequest('POST', `/api/v1/news/items/${ITEM_ID}/pipeline`)
    const res = await handler(req, createTestParams(ITEM_ID))
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.taskId).toBe('task-1')
    expect(body.data.status).toBe('queued')
  })
})
