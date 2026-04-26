import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-4000-8000-0000000000c1'
const LESSON_ID = '00000000-0000-4000-8000-0000000000e1'

describe('Course lessons API', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('POST creates lesson and returns 201', async () => {
    vi.doMock('@/lib/services/course-lesson.service', () => ({
      CourseLessonService: {
        create: vi
          .fn()
          .mockResolvedValue({ id: LESSON_ID, courseId: COURSE_ID, slug: 'l', position: 1, title: 'L' }),
      },
      CourseLessonError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/lessons/route')
    const res = await POST(
      createTestRequest('POST', '/x', { title: 'L' }),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(201)
  })

  it('POST returns 409 on slug conflict', async () => {
    class LErr extends Error {
      constructor(public code: string, m: string) { super(m) }
    }
    vi.doMock('@/lib/services/course-lesson.service', () => ({
      CourseLessonService: {
        create: vi.fn().mockRejectedValue(new LErr('SLUG_CONFLICT', 'duplicate')),
      },
      CourseLessonError: LErr,
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/lessons/route')
    const res = await POST(
      createTestRequest('POST', '/x', { title: 'L', slug: 'l' }),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(409)
  })

  it('GET lesson returns 200 with assets', async () => {
    vi.doMock('@/lib/services/course-lesson.service', () => ({
      CourseLessonService: {
        get: vi.fn().mockResolvedValue({
          id: LESSON_ID,
          title: 'L',
          courseId: COURSE_ID,
          slug: 'l',
          position: 1,
        }),
      },
      CourseLessonError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    vi.doMock('@/lib/services/course-asset.service', () => ({
      CourseAssetService: { listByLesson: vi.fn().mockResolvedValue([]) },
    }))
    const { GET } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) },
    )
    expect(res.status).toBe(200)
  })

  it('GET lesson returns 404 when not found', async () => {
    vi.doMock('@/lib/services/course-lesson.service', () => ({
      CourseLessonService: { get: vi.fn().mockResolvedValue(null) },
      CourseLessonError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    vi.doMock('@/lib/services/course-asset.service', () => ({
      CourseAssetService: { listByLesson: vi.fn().mockResolvedValue([]) },
    }))
    const { GET } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) },
    )
    expect(res.status).toBe(404)
  })

  it('PATCH updates lesson', async () => {
    vi.doMock('@/lib/services/course-lesson.service', () => ({
      CourseLessonService: {
        update: vi.fn().mockResolvedValue({ id: LESSON_ID, title: 'Lneu' }),
      },
      CourseLessonError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    const { PATCH } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/route')
    const res = await PATCH(
      createTestRequest('PATCH', '/x', { title: 'Lneu' }),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) },
    )
    expect(res.status).toBe(200)
  })

  it('DELETE removes lesson', async () => {
    vi.doMock('@/lib/services/course-lesson.service', () => ({
      CourseLessonService: { delete: vi.fn().mockResolvedValue(undefined) },
      CourseLessonError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    const { DELETE } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/route')
    const res = await DELETE(
      createTestRequest('DELETE', '/x'),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) },
    )
    expect(res.status).toBe(200)
  })

  it('POST reorder returns 200', async () => {
    vi.doMock('@/lib/services/course-lesson.service', () => ({
      CourseLessonService: { reorder: vi.fn().mockResolvedValue(undefined) },
      CourseLessonError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/lessons/reorder/route')
    const res = await POST(
      createTestRequest('POST', '/x', [{ id: LESSON_ID, position: 1 }]),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
  })
})
