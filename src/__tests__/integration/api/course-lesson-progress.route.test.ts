import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture, TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'

describe('POST /api/v1/courses/[id]/lessons/[lessonId]/complete', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-progress.service', () => ({
      CourseLessonProgressService: {
        markCompleted: vi.fn().mockResolvedValue({
          id: 'p1', userId: TEST_USER_ID, lessonId: LESSON_ID, courseId: COURSE_ID,
          completedAt: new Date(),
        }),
      },
    }))
  })

  it('returns 200 with completion record', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/complete/route')
    const res = await POST(
      createTestRequest('POST', '/x'),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.lessonId).toBe(LESSON_ID)
  })
})

describe('DELETE /api/v1/courses/[id]/lessons/[lessonId]/complete', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-progress.service', () => ({
      CourseLessonProgressService: {
        markUncompleted: vi.fn().mockResolvedValue(undefined),
      },
    }))
  })

  it('returns 200 with uncompleted=true', async () => {
    const { DELETE } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/complete/route')
    const res = await DELETE(
      createTestRequest('DELETE', '/x'),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.uncompleted).toBe(true)
  })
})

describe('GET /api/v1/courses/[id]/progress', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-progress.service', () => ({
      CourseLessonProgressService: {
        listForCourse: vi.fn().mockResolvedValue([LESSON_ID]),
        getCourseProgress: vi.fn().mockResolvedValue({ completed: 1, total: 4, percentage: 25 }),
      },
    }))
  })

  it('returns 200 with progress summary + completed lesson IDs', async () => {
    const { GET } = await import('@/app/api/v1/courses/[id]/progress/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.summary).toEqual({ completed: 1, total: 4, percentage: 25 })
    expect(body.data.completedLessonIds).toEqual([LESSON_ID])
  })
})
