import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'
const BLOCK_ID  = '00000000-0000-4000-8000-0000000000b1'

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

describe('PATCH /api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        update: vi.fn().mockResolvedValue({
          id: BLOCK_ID, lessonId: LESSON_ID, position: 1, kind: 'markdown',
          markdownBody: '# Updated',
        }),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns updated block', async () => {
    const { PATCH } = await import(
      '@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]/route')
    const res = await PATCH(
      createTestRequest('PATCH', '/x', { markdownBody: '# Updated' }),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID, blockId: BLOCK_ID }) })
    expect(res.status).toBe(200)
  })

  it('returns 404 when block not found', async () => {
    class CErr extends Error { constructor(public code: string, m: string) { super(m) } }
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        update: vi.fn().mockRejectedValue(new CErr('NOT_FOUND', 'nicht gefunden')),
      },
      CourseLessonBlockError: CErr,
    }))
    const { PATCH } = await import(
      '@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]/route')
    const res = await PATCH(
      createTestRequest('PATCH', '/x', { markdownBody: 'x' }),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID, blockId: BLOCK_ID }) })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns deleted=true', async () => {
    const { DELETE } = await import(
      '@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]/route')
    const res = await DELETE(createTestRequest('DELETE', '/x'),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID, blockId: BLOCK_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.deleted).toBe(true)
  })
})

describe('POST /api/v1/courses/[id]/lessons/[lessonId]/blocks/reorder', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        reorder: vi.fn().mockResolvedValue(undefined),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns reordered count', async () => {
    const { POST } = await import(
      '@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/reorder/route')
    const res = await POST(
      createTestRequest('POST', '/x', [{ id: BLOCK_ID, position: 2 }]),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.reordered).toBe(1)
  })
})
