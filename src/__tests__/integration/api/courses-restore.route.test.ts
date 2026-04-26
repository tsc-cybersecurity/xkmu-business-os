import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

describe('POST /api/v1/courses/[id]/restore', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 200 on successful restore', async () => {
    vi.doMock('@/lib/services/course.service', () => ({
      CourseService: {
        restore: vi.fn().mockResolvedValue({ id: COURSE_ID, status: 'draft', publishedAt: null }),
      },
      CourseError: class extends Error { code = '' },
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/restore/route')
    const res = await POST(createTestRequest('POST', '/x', {}),
      { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('draft')
  })

  it('returns 400 with validation error when course not archived', async () => {
    class CErr extends Error { constructor(public code: string, m: string) { super(m) } }
    vi.doMock('@/lib/services/course.service', () => ({
      CourseService: {
        restore: vi.fn().mockRejectedValue(new CErr('INVALID_STATE', 'Kurs ist nicht archived')),
      },
      CourseError: CErr,
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/restore/route')
    const res = await POST(createTestRequest('POST', '/x', {}),
      { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when course not found', async () => {
    class CErr extends Error { constructor(public code: string, m: string) { super(m) } }
    vi.doMock('@/lib/services/course.service', () => ({
      CourseService: {
        restore: vi.fn().mockRejectedValue(new CErr('NOT_FOUND', 'Kurs nicht gefunden')),
      },
      CourseError: CErr,
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/restore/route')
    const res = await POST(createTestRequest('POST', '/x', {}),
      { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(404)
  })
})
