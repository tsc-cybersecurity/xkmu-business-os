import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture, TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

const courseFixture = (o: Record<string, unknown> = {}) => ({
  id: COURSE_ID,
  slug: 'kurs-1',
  title: 'Kurs 1',
  subtitle: null,
  description: null,
  coverImageId: null,
  visibility: 'portal',
  status: 'draft',
  useModules: false,
  enforceSequential: false,
  estimatedMinutes: null,
  createdBy: TEST_USER_ID,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...o,
})

describe('POST /api/v1/courses', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  it('returns 201 with valid data', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockInsert.mockResolvedValue([courseFixture()])
    const { POST } = await import('@/app/api/v1/courses/route')
    const req = createTestRequest('POST', '/api/v1/courses', { title: 'Kurs 1' })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 400 on missing title', async () => {
    const { POST } = await import('@/app/api/v1/courses/route')
    const req = createTestRequest('POST', '/api/v1/courses', {})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 on slug conflict', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    const { POST } = await import('@/app/api/v1/courses/route')
    const req = createTestRequest('POST', '/api/v1/courses', { title: 'Kurs 1', slug: 'kurs-1' })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

describe('GET /api/v1/courses', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns paged list', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])
    const { GET } = await import('@/app/api/v1/courses/route')
    const res = await GET(createTestRequest('GET', '/api/v1/courses'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })
})

describe('GET /api/v1/courses/[id]', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 404 when not found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    const { GET } = await import('@/app/api/v1/courses/[id]/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(404)
  })

  it('returns course with modules + lessons', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockSelect.mockResolvedValueOnce([])
    const { GET } = await import('@/app/api/v1/courses/[id]/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
  })
})
