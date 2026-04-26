import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

describe('POST /api/v1/courses/[id]/publish', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 200 on successful publish', async () => {
    vi.doMock('@/lib/services/course-publish.service', () => ({
      CoursePublishService: {
        publish: vi.fn().mockResolvedValue({
          id: COURSE_ID,
          status: 'published',
          publishedAt: new Date(),
        }),
      },
      PublishValidationError: class extends Error {
        code = 'PUBLISH_VALIDATION'
        details: unknown[] = []
      },
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/publish/route')
    const res = await POST(
      createTestRequest('POST', '/x', {}),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
  })

  it('returns 422 with details on validation error', async () => {
    class VErr extends Error {
      code = 'PUBLISH_VALIDATION'
      constructor(public details: unknown[]) {
        super('x')
      }
    }
    vi.doMock('@/lib/services/course-publish.service', () => ({
      CoursePublishService: {
        publish: vi.fn().mockRejectedValue(new VErr([{ code: 'NO_LESSONS', message: 'x' }])),
      },
      PublishValidationError: VErr,
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/publish/route')
    const res = await POST(
      createTestRequest('POST', '/x', {}),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.details).toHaveLength(1)
  })
})

describe('POST /api/v1/courses/[id]/unpublish', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 200 on success', async () => {
    vi.doMock('@/lib/services/course.service', () => ({
      CourseService: {
        unpublish: vi.fn().mockResolvedValue({ id: COURSE_ID, status: 'draft' }),
      },
      CourseError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/unpublish/route')
    const res = await POST(
      createTestRequest('POST', '/x', {}),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
  })
})

describe('POST /api/v1/courses/[id]/archive', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 200 on success', async () => {
    vi.doMock('@/lib/services/course.service', () => ({
      CourseService: {
        archive: vi.fn().mockResolvedValue({ id: COURSE_ID, status: 'archived' }),
      },
      CourseError: class extends Error {
        constructor(public code: string, m: string) { super(m) }
      },
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/archive/route')
    const res = await POST(
      createTestRequest('POST', '/x', {}),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
  })
})
