import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

class PdfErr extends Error { constructor(public code: string, m: string) { super(m) } }

describe('GET /api/v1/portal/courses/[id]/certificate/pdf', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 200 with PDF bytes when issued', async () => {
    vi.doMock('@/lib/services/certificate-pdf.service', () => ({
      CertificatePdfService: {
        renderForUserCourse: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake-pdf-bytes')),
      },
      CertificatePdfError: PdfErr,
    }))
    const { GET } = await import('@/app/api/v1/portal/courses/[id]/certificate/pdf/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('attachment')
    const buf = await res.arrayBuffer()
    expect(buf.byteLength).toBeGreaterThan(0)
  })

  it('returns 404 when no issued certificate', async () => {
    vi.doMock('@/lib/services/certificate-pdf.service', () => ({
      CertificatePdfService: {
        renderForUserCourse: vi.fn().mockRejectedValue(new PdfErr('NOT_FOUND', 'kein cert')),
      },
      CertificatePdfError: PdfErr,
    }))
    const { GET } = await import('@/app/api/v1/portal/courses/[id]/certificate/pdf/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuthContext(null)
    const { GET } = await import('@/app/api/v1/portal/courses/[id]/certificate/pdf/route')
    const res = await GET(
      createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID }) },
    )
    expect(res.status).toBe(401)
  })
})
