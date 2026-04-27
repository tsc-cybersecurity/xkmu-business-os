import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

describe('GET /api/v1/cms/block-types', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAuthContext(authFixture())
  })

  it('returns block types filtered by available_in_lessons=true', async () => {
    const dbMock = setupDbMock()
    dbMock.mockSelect.mockResolvedValueOnce([
      {
        id: 't1',
        slug: 'course-callout',
        name: 'Hinweis',
        category: 'course',
        availableInLessons: true,
        isActive: true,
      },
    ])
    const { GET } = await import('@/app/api/v1/cms/block-types/route')
    const res = await GET(
      createTestRequest('GET', '/api/v1/cms/block-types?available_in_lessons=true'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].slug).toBe('course-callout')
  })

  it('returns full unfiltered list when query param absent (legacy behavior)', async () => {
    setupDbMock()
    vi.doMock('@/lib/services/cms-block-type.service', () => ({
      CmsBlockTypeService: {
        list: vi.fn().mockResolvedValue([
          { id: 'a', slug: 'hero', name: 'Hero', isActive: true },
          { id: 'b', slug: 'course-callout', name: 'Hinweis', isActive: true },
        ]),
        seedDefaults: vi.fn().mockResolvedValue(0),
      },
    }))
    const { GET } = await import('@/app/api/v1/cms/block-types/route')
    const res = await GET(createTestRequest('GET', '/api/v1/cms/block-types'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
  })
})
