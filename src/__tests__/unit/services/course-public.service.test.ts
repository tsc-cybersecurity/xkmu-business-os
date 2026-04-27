import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

function courseFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID,
    slug: 'kurs-1',
    title: 'Kurs 1',
    subtitle: null,
    description: null,
    coverImageId: null,
    visibility: 'public',
    status: 'published',
    useModules: false,
    enforceSequential: false,
    estimatedMinutes: null,
    createdBy: null,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('CoursePublicService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getSvc() {
    const mod = await import('@/lib/services/course-public.service')
    return mod.CoursePublicService
  }

  describe('listPublic', () => {
    it('returns paged list', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])
      const svc = await getSvc()
      const result = await svc.listPublic({ page: 1, limit: 10 })
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('listPortal', () => {
    it('returns paged list', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ visibility: 'portal' })])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])
      const svc = await getSvc()
      const result = await svc.listPortal({ page: 1, limit: 10 })
      expect(result.items).toHaveLength(1)
    })
  })

  describe('getPublicBySlug', () => {
    it('returns course with modules + lessons', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const result = await svc.getPublicBySlug('kurs-1')
      expect(result?.course.id).toBe(COURSE_ID)
    })

    it('returns null when course not public', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const result = await svc.getPublicBySlug('private')
      expect(result).toBeNull()
    })
  })

  describe('getPortalBySlug', () => {
    it('returns course when visibility=portal', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ visibility: 'portal' })])
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const result = await svc.getPortalBySlug('kurs-1')
      expect(result?.course.visibility).toBe('portal')
    })
  })
})
