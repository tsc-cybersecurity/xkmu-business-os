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

  describe('getPublicLesson', () => {
    const lessonId1 = '00000000-0000-0000-0000-0000000000e1'
    const lessonId2 = '00000000-0000-0000-0000-0000000000e2'
    const lessonId3 = '00000000-0000-0000-0000-0000000000e3'

    function lesson(id: string, slug: string, position: number, moduleId: string | null = null) {
      return {
        id, courseId: COURSE_ID, moduleId, position, slug,
        title: slug, contentMarkdown: null, videoAssetId: null,
        videoExternalUrl: null, durationMinutes: null,
        createdAt: new Date(), updatedAt: new Date(),
      }
    }

    it('returns prev=null and next set for first lesson', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([
        lesson(lessonId1, 'a', 1),
        lesson(lessonId2, 'b', 2),
      ])
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const ctx = await svc.getPublicLesson('kurs-1', 'a')
      expect(ctx?.prev).toBeNull()
      expect(ctx?.next).toEqual({ courseSlug: 'kurs-1', lessonSlug: 'b' })
    })

    it('returns prev set and next=null for last lesson', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([
        lesson(lessonId1, 'a', 1),
        lesson(lessonId2, 'b', 2),
      ])
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const ctx = await svc.getPublicLesson('kurs-1', 'b')
      expect(ctx?.prev).toEqual({ courseSlug: 'kurs-1', lessonSlug: 'a' })
      expect(ctx?.next).toBeNull()
    })

    it('returns null when lesson slug missing', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([lesson(lessonId1, 'a', 1)])
      const svc = await getSvc()
      const ctx = await svc.getPublicLesson('kurs-1', 'nope')
      expect(ctx).toBeNull()
    })

    it('sorts across modules then within module', async () => {
      const modA = '00000000-0000-0000-0000-0000000000d1'
      const modB = '00000000-0000-0000-0000-0000000000d2'
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ useModules: true })])
      dbMock.mockSelect.mockResolvedValueOnce([
        { id: modA, courseId: COURSE_ID, position: 1, title: 'A', description: null, createdAt: new Date(), updatedAt: new Date() },
        { id: modB, courseId: COURSE_ID, position: 2, title: 'B', description: null, createdAt: new Date(), updatedAt: new Date() },
      ])
      dbMock.mockSelect.mockResolvedValueOnce([
        lesson(lessonId2, 'b1', 1, modB),
        lesson(lessonId1, 'a1', 1, modA),
        lesson(lessonId3, 'a2', 2, modA),
      ])
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const ctx = await svc.getPublicLesson('kurs-1', 'a2')
      expect(ctx?.prev?.lessonSlug).toBe('a1')
      expect(ctx?.next?.lessonSlug).toBe('b1')
    })

    it('includes blocks sorted by position with visibility filter', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])  // course
      dbMock.mockSelect.mockResolvedValueOnce([])                 // modules
      dbMock.mockSelect.mockResolvedValueOnce([                   // lessons
        { id: lessonId1, courseId: COURSE_ID, moduleId: null, position: 1, slug: 'a',
          title: 'a', contentMarkdown: null, videoAssetId: null, videoExternalUrl: null,
          durationMinutes: null, createdAt: new Date(), updatedAt: new Date() },
      ])
      dbMock.mockSelect.mockResolvedValueOnce([])                 // assets
      dbMock.mockSelect.mockResolvedValueOnce([                   // blocks
        { id: 'b1', lessonId: lessonId1, position: 1, kind: 'markdown', markdownBody: '# Hi',
          blockType: null, content: {}, settings: {}, isVisible: true,
          createdAt: new Date(), updatedAt: new Date() },
      ])
      const svc = await getSvc()
      const ctx = await svc.getPublicLesson('kurs-1', 'a')
      expect(ctx?.blocks).toHaveLength(1)
      expect(ctx?.blocks?.[0].kind).toBe('markdown')
    })

    it('getPortalLesson with userId returns progress for that user', async () => {
      const userId = '00000000-0000-0000-0000-0000000000a1'
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ visibility: 'portal' })])  // course
      dbMock.mockSelect.mockResolvedValueOnce([])                                          // access grants (none → open)
      dbMock.mockSelect.mockResolvedValueOnce([])                                          // modules
      dbMock.mockSelect.mockResolvedValueOnce([                                            // lessons
        { id: lessonId1, courseId: COURSE_ID, moduleId: null, position: 1, slug: 'a',
          title: 'a', contentMarkdown: null, videoAssetId: null, videoExternalUrl: null,
          durationMinutes: null, createdAt: new Date(), updatedAt: new Date() },
        { id: lessonId2, courseId: COURSE_ID, moduleId: null, position: 2, slug: 'b',
          title: 'b', contentMarkdown: null, videoAssetId: null, videoExternalUrl: null,
          durationMinutes: null, createdAt: new Date(), updatedAt: new Date() },
      ])
      dbMock.mockSelect.mockResolvedValueOnce([])                                          // assets
      dbMock.mockSelect.mockResolvedValueOnce([])                                          // blocks
      dbMock.mockSelect.mockResolvedValueOnce([{ lessonId: lessonId1 }])                   // progress rows
      const svc = await getSvc()
      const ctx = await svc.getPortalLesson('kurs-1', 'a', userId)
      expect(ctx?.progress).toEqual({
        completedLessonIds: [lessonId1],
        completed: 1,
        total: 2,
        percentage: 50,
      })
    })

    it('getPortalLesson without userId leaves progress undefined', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ visibility: 'portal' })])  // course
      dbMock.mockSelect.mockResolvedValueOnce([])                                          // modules
      dbMock.mockSelect.mockResolvedValueOnce([                                            // lessons
        { id: lessonId1, courseId: COURSE_ID, moduleId: null, position: 1, slug: 'a',
          title: 'a', contentMarkdown: null, videoAssetId: null, videoExternalUrl: null,
          durationMinutes: null, createdAt: new Date(), updatedAt: new Date() },
      ])
      dbMock.mockSelect.mockResolvedValueOnce([])                                          // assets
      dbMock.mockSelect.mockResolvedValueOnce([])                                          // blocks
      const svc = await getSvc()
      const ctx = await svc.getPortalLesson('kurs-1', 'a')
      expect(ctx?.progress).toBeUndefined()
    })
  })
})
