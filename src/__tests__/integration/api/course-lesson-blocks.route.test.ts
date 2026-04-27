import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'
const BLOCK_ID  = '00000000-0000-0000-0000-0000000000b1'

describe('GET /api/v1/courses/[id]/lessons/[lessonId]/blocks', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        listByLesson: vi.fn().mockResolvedValue([
          { id: BLOCK_ID, lessonId: LESSON_ID, position: 1, kind: 'markdown',
            markdownBody: '# Hi', isVisible: true },
        ]),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns block list', async () => {
    const { GET } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/route')
    const res = await GET(createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('POST /api/v1/courses/[id]/lessons/[lessonId]/blocks', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        create: vi.fn().mockResolvedValue({
          id: BLOCK_ID, lessonId: LESSON_ID, position: 1, kind: 'markdown',
          markdownBody: '# Hi',
        }),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns 201 on valid markdown block', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/route')
    const res = await POST(
      createTestRequest('POST', '/x', { kind: 'markdown', markdownBody: '# Hi' }),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) })
    expect(res.status).toBe(201)
  })

  it('returns 400 on invalid kind', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/route')
    const res = await POST(
      createTestRequest('POST', '/x', { kind: 'banana' }),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) })
    expect(res.status).toBe(400)
  })
})
