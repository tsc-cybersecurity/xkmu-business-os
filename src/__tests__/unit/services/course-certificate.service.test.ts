import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const CERT_ID   = '00000000-0000-0000-0000-0000000000a1'
const ADMIN_ID  = '00000000-0000-0000-0000-0000000000ad'

function certFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: CERT_ID,
    userId: TEST_USER_ID,
    courseId: COURSE_ID,
    status: 'requested',
    identifier: '00000000-0000-0000-0000-0000000000ff',
    requestedAt: new Date(),
    issuedAt: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewComment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('CourseCertificateService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  function mockProgress(percentage: number) {
    vi.doMock('@/lib/services/course-lesson-progress.service', () => ({
      CourseLessonProgressService: {
        getCourseProgress: vi.fn().mockResolvedValue({ completed: 1, total: 1, percentage }),
      },
    }))
  }

  async function getSvc() {
    const mod = await import('@/lib/services/course-certificate.service')
    return mod.CourseCertificateService
  }

  describe('requestCertificate', () => {
    it('throws NOT_COMPLETE when progress < 100%', async () => {
      mockProgress(50)
      const svc = await getSvc()
      await expect(svc.requestCertificate(TEST_USER_ID, COURSE_ID))
        .rejects.toMatchObject({ code: 'NOT_COMPLETE' })
    })

    it('inserts new pending request when none exists and 100% complete', async () => {
      mockProgress(100)
      dbMock.mockSelect.mockResolvedValueOnce([])  // no existing
      dbMock.mockInsert.mockResolvedValue([certFixture()])
      const svc = await getSvc()
      const result = await svc.requestCertificate(TEST_USER_ID, COURSE_ID)
      expect(result.status).toBe('requested')
    })

    it('returns existing pending request idempotently', async () => {
      mockProgress(100)
      dbMock.mockSelect.mockResolvedValueOnce([certFixture()])
      const svc = await getSvc()
      const result = await svc.requestCertificate(TEST_USER_ID, COURSE_ID)
      expect(result.id).toBe(CERT_ID)
      expect(dbMock.db.insert).not.toHaveBeenCalled()
    })

    it('returns existing issued certificate (does not re-request)', async () => {
      mockProgress(100)
      dbMock.mockSelect.mockResolvedValueOnce([certFixture({ status: 'issued', issuedAt: new Date() })])
      const svc = await getSvc()
      const result = await svc.requestCertificate(TEST_USER_ID, COURSE_ID)
      expect(result.status).toBe('issued')
    })

    it('re-requests after rejection (creates new request)', async () => {
      mockProgress(100)
      dbMock.mockSelect.mockResolvedValueOnce([certFixture({ status: 'rejected', reviewComment: 'nope' })])
      dbMock.mockUpdate.mockResolvedValue([certFixture({ status: 'requested', reviewedBy: null, reviewedAt: null, reviewComment: null })])
      const svc = await getSvc()
      const result = await svc.requestCertificate(TEST_USER_ID, COURSE_ID)
      expect(result.status).toBe('requested')
      expect(dbMock.db.update).toHaveBeenCalled()
    })
  })

  describe('getForUserCourse', () => {
    it('returns null when no row', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const result = await svc.getForUserCourse(TEST_USER_ID, COURSE_ID)
      expect(result).toBeNull()
    })

    it('returns certificate when present', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([certFixture()])
      const svc = await getSvc()
      const result = await svc.getForUserCourse(TEST_USER_ID, COURSE_ID)
      expect(result?.id).toBe(CERT_ID)
    })
  })

  describe('listPending', () => {
    it('returns pending requests ordered by requestedAt', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([certFixture(), certFixture({ id: 'c2' })])
      const svc = await getSvc()
      const result = await svc.listPending()
      expect(result).toHaveLength(2)
    })
  })

  describe('approve', () => {
    it('sets status=issued + issuedAt + reviewedBy', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([certFixture()])
      dbMock.mockUpdate.mockResolvedValue([certFixture({ status: 'issued', issuedAt: new Date(), reviewedBy: ADMIN_ID })])
      const svc = await getSvc()
      const result = await svc.approve(CERT_ID, ADMIN_ID, 'Glückwunsch')
      expect(result.status).toBe('issued')
      expect(result.reviewedBy).toBe(ADMIN_ID)
    })

    it('throws NOT_FOUND when missing', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      await expect(svc.approve(CERT_ID, ADMIN_ID))
        .rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('throws BAD_STATE when not in requested state', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([certFixture({ status: 'issued' })])
      const svc = await getSvc()
      await expect(svc.approve(CERT_ID, ADMIN_ID))
        .rejects.toMatchObject({ code: 'BAD_STATE' })
    })
  })

  describe('reject', () => {
    it('sets status=rejected + reviewedBy + comment', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([certFixture()])
      dbMock.mockUpdate.mockResolvedValue([certFixture({ status: 'rejected', reviewedBy: ADMIN_ID, reviewComment: 'incomplete' })])
      const svc = await getSvc()
      const result = await svc.reject(CERT_ID, ADMIN_ID, 'incomplete')
      expect(result.status).toBe('rejected')
      expect(result.reviewComment).toBe('incomplete')
    })
  })
})
