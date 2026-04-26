import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-4000-8000-0000000000c1'
const MOD_ID = '00000000-0000-4000-8000-0000000000d1'

describe('Course modules API', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-module.service', () => ({
      CourseModuleService: {
        create: vi
          .fn()
          .mockResolvedValue({ id: MOD_ID, courseId: COURSE_ID, position: 1, title: 'M1' }),
        update: vi
          .fn()
          .mockResolvedValue({ id: MOD_ID, courseId: COURSE_ID, position: 1, title: 'M1neu' }),
        delete: vi.fn().mockResolvedValue(undefined),
        reorder: vi.fn().mockResolvedValue(undefined),
      },
      CourseModuleError: class extends Error {
        code = 'NOT_FOUND'
      },
    }))
  })

  it('POST creates module and returns 201', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/modules/route')
    const res = await POST(
      createTestRequest('POST', '/x', { title: 'M1' }),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(201)
  })

  it('PATCH updates module', async () => {
    const { PATCH } = await import('@/app/api/v1/courses/[id]/modules/[moduleId]/route')
    const res = await PATCH(
      createTestRequest('PATCH', '/x', { title: 'M1neu' }),
      { params: createTestParams({ id: COURSE_ID, moduleId: MOD_ID }) },
    )
    expect(res.status).toBe(200)
  })

  it('DELETE removes module', async () => {
    const { DELETE } = await import('@/app/api/v1/courses/[id]/modules/[moduleId]/route')
    const res = await DELETE(
      createTestRequest('DELETE', '/x'),
      { params: createTestParams({ id: COURSE_ID, moduleId: MOD_ID }) },
    )
    expect(res.status).toBe(200)
  })

  it('POST reorder returns 200', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/modules/reorder/route')
    const res = await POST(
      createTestRequest('POST', '/x', [{ id: MOD_ID, position: 1 }]),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
  })
})
