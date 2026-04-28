import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture, TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const CERT_ID   = '00000000-0000-0000-0000-0000000000a1'

const certFixture = (overrides: Record<string, unknown> = {}) => ({
  id: CERT_ID, userId: TEST_USER_ID, courseId: COURSE_ID,
  status: 'requested', identifier: 'ident-1',
  requestedAt: new Date(), issuedAt: null, reviewedBy: null,
  reviewedAt: null, reviewComment: null,
  createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
})

class CertErr extends Error { constructor(public code: string, m: string) { super(m) } }

describe('POST /api/v1/portal/courses/[id]/certificate/request', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 200 with new certificate', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: {
        requestCertificate: vi.fn().mockResolvedValue(certFixture()),
      },
      CourseCertificateError: CertErr,
    }))
    const { POST } = await import('@/app/api/v1/portal/courses/[id]/certificate/request/route')
    const res = await POST(
      createTestRequest('POST', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('requested')
  })

  it('returns 422 with NOT_COMPLETE code when course not 100%', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: {
        requestCertificate: vi.fn().mockRejectedValue(new CertErr('NOT_COMPLETE', 'noch nicht 100%')),
      },
      CourseCertificateError: CertErr,
    }))
    const { POST } = await import('@/app/api/v1/portal/courses/[id]/certificate/request/route')
    const res = await POST(
      createTestRequest('POST', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(422)
  })
})

describe('GET /api/v1/portal/courses/[id]/certificate', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns the certificate when present', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: {
        getForUserCourse: vi.fn().mockResolvedValue(certFixture({ status: 'issued' })),
      },
      CourseCertificateError: CertErr,
    }))
    const { GET } = await import('@/app/api/v1/portal/courses/[id]/certificate/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('issued')
  })

  it('returns 200 with data=null when none exists', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: {
        getForUserCourse: vi.fn().mockResolvedValue(null),
      },
      CourseCertificateError: CertErr,
    }))
    const { GET } = await import('@/app/api/v1/portal/courses/[id]/certificate/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeNull()
  })
})

describe('GET /api/v1/portal/certificate-requests (admin)', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('defaults to status=requested when no query param', async () => {
    const listByStatus = vi.fn().mockResolvedValue([certFixture()])
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: { listByStatus },
      CourseCertificateError: CertErr,
    }))
    const { GET } = await import('@/app/api/v1/portal/certificate-requests/route')
    const res = await GET(createTestRequest('GET', '/x'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(listByStatus).toHaveBeenCalledWith('requested')
  })

  it('filters by status=issued', async () => {
    const listByStatus = vi.fn().mockResolvedValue([certFixture({ status: 'issued' })])
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: { listByStatus },
      CourseCertificateError: CertErr,
    }))
    const { GET } = await import('@/app/api/v1/portal/certificate-requests/route')
    const res = await GET(createTestRequest('GET', '/x?status=issued'))
    expect(res.status).toBe(200)
    expect(listByStatus).toHaveBeenCalledWith('issued')
  })

  it('returns empty array on invalid status param', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: { listByStatus: vi.fn() },
      CourseCertificateError: CertErr,
    }))
    const { GET } = await import('@/app/api/v1/portal/certificate-requests/route')
    const res = await GET(createTestRequest('GET', '/x?status=banana'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
  })
})

describe('POST /api/v1/portal/certificate-requests/[id]/revoke', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('revokes issued certificate', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: {
        revoke: vi.fn().mockResolvedValue(certFixture({ status: 'revoked', reviewComment: 'fraud' })),
      },
      CourseCertificateError: CertErr,
    }))
    const { POST } = await import('@/app/api/v1/portal/certificate-requests/[id]/revoke/route')
    const res = await POST(
      createTestRequest('POST', '/x', { reviewComment: 'fraud' }),
      { params: createTestParams({ id: CERT_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('revoked')
  })

  it('returns 409 when not in issued state (BAD_STATE)', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: {
        revoke: vi.fn().mockRejectedValue(new CertErr('BAD_STATE', 'nicht issued')),
      },
      CourseCertificateError: CertErr,
    }))
    const { POST } = await import('@/app/api/v1/portal/certificate-requests/[id]/revoke/route')
    const res = await POST(
      createTestRequest('POST', '/x', {}),
      { params: createTestParams({ id: CERT_ID }) },
    )
    expect(res.status).toBe(409)
  })
})

describe('POST /api/v1/portal/certificate-requests/[id]/approve', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('approves and returns issued certificate', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: {
        approve: vi.fn().mockResolvedValue(certFixture({ status: 'issued', issuedAt: new Date() })),
      },
      CourseCertificateError: CertErr,
    }))
    const { POST } = await import('@/app/api/v1/portal/certificate-requests/[id]/approve/route')
    const res = await POST(
      createTestRequest('POST', '/x', { reviewComment: 'GZ' }),
      { params: createTestParams({ id: CERT_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('issued')
  })

  it('returns 404 when not found', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: {
        approve: vi.fn().mockRejectedValue(new CertErr('NOT_FOUND', 'nope')),
      },
      CourseCertificateError: CertErr,
    }))
    const { POST } = await import('@/app/api/v1/portal/certificate-requests/[id]/approve/route')
    const res = await POST(
      createTestRequest('POST', '/x', {}),
      { params: createTestParams({ id: CERT_ID }) },
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/v1/portal/certificate-requests/[id]/reject', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('rejects with reason', async () => {
    vi.doMock('@/lib/services/course-certificate.service', () => ({
      CourseCertificateService: {
        reject: vi.fn().mockResolvedValue(certFixture({ status: 'rejected', reviewComment: 'incomplete' })),
      },
      CourseCertificateError: CertErr,
    }))
    const { POST } = await import('@/app/api/v1/portal/certificate-requests/[id]/reject/route')
    const res = await POST(
      createTestRequest('POST', '/x', { reviewComment: 'incomplete' }),
      { params: createTestParams({ id: CERT_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('rejected')
  })
})
