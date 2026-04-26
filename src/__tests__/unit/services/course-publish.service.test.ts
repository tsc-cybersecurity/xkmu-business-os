import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

function courseFixture(o: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID, slug: 'kurs-1', title: 'Kurs 1', subtitle: null, description: 'Kurzbeschreibung',
    coverImageId: null, visibility: 'portal', status: 'draft',
    useModules: false, enforceSequential: false, estimatedMinutes: null,
    createdBy: TEST_USER_ID, publishedAt: null,
    createdAt: new Date(), updatedAt: new Date(), ...o,
  }
}

function lesson(o: Record<string, unknown> = {}) {
  return {
    id: 'l1', courseId: COURSE_ID, moduleId: null, position: 1,
    slug: 'l1', title: 'L1', contentMarkdown: 'Hi',
    videoAssetId: null, videoExternalUrl: null, durationMinutes: null,
    createdAt: new Date(), updatedAt: new Date(), ...o,
  }
}

describe('CoursePublishService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function svc() {
    return (await import('@/lib/services/course-publish.service')).CoursePublishService
  }

  it('rejects publish when course has no lessons', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])      // course
    dbMock.mockSelect.mockResolvedValueOnce([])                      // lessons
    dbMock.mockSelect.mockResolvedValueOnce([])                      // modules
    dbMock.mockSelect.mockResolvedValueOnce([])                      // assets
    const s = await svc()
    await expect(s.publish(COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'PUBLISH_VALIDATION' })
  })

  it('rejects when public visibility but no description', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ visibility: 'public', description: null })])
    dbMock.mockSelect.mockResolvedValueOnce([lesson()])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockSelect.mockResolvedValueOnce([])
    const s = await svc()
    await expect(s.publish(COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'PUBLISH_VALIDATION' })
  })

  it('publishes valid course and sets publishedAt', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    dbMock.mockSelect.mockResolvedValueOnce([lesson()])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockUpdate.mockResolvedValue([courseFixture({ status: 'published', publishedAt: new Date() })])
    const s = await svc()
    const r = await s.publish(COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' })
    expect(r.status).toBe('published')
    expect(r.publishedAt).not.toBeNull()
  })
})
