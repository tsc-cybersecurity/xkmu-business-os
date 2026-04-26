import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const TEST_COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

function courseFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_COURSE_ID,
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
    createdAt: new Date('2026-04-26T00:00:00Z'),
    updatedAt: new Date('2026-04-26T00:00:00Z'),
    ...overrides,
  }
}

describe('CourseService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getService() {
    const mod = await import('@/lib/services/course.service')
    return mod.CourseService
  }

  describe('create', () => {
    it('creates a course with auto-generated slug', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])             // slug uniqueness probe
      dbMock.mockInsert.mockResolvedValue([courseFixture()])

      const svc = await getService()
      const result = await svc.create({ title: 'Kurs 1' }, { userId: TEST_USER_ID, userRole: 'admin' })

      expect(result.slug).toBe('kurs-1')
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('rejects duplicate slug with code SLUG_CONFLICT', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])

      const svc = await getService()
      await expect(svc.create({ title: 'Kurs 1', slug: 'kurs-1' }, { userId: TEST_USER_ID, userRole: 'admin' }))
        .rejects.toMatchObject({ code: 'SLUG_CONFLICT' })
    })
  })

  describe('getBySlug', () => {
    it('returns course when found', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      const svc = await getService()
      const result = await svc.getBySlug('kurs-1')
      expect(result?.id).toBe(TEST_COURSE_ID)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getService()
      expect(await svc.getBySlug('nope')).toBeNull()
    })
  })

  describe('update', () => {
    it('updates and returns course', async () => {
      const updated = courseFixture({ title: 'Neu' })
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()]) // existence
      dbMock.mockUpdate.mockResolvedValue([updated])
      const svc = await getService()
      const result = await svc.update(TEST_COURSE_ID, { title: 'Neu' }, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.title).toBe('Neu')
    })
  })

  describe('archive', () => {
    it('sets status=archived', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ status: 'published' })])
      dbMock.mockUpdate.mockResolvedValue([courseFixture({ status: 'archived' })])
      const svc = await getService()
      const r = await svc.archive(TEST_COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(r.status).toBe('archived')
    })
  })

  describe('unpublish', () => {
    it('sets status=draft', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ status: 'published' })])
      dbMock.mockUpdate.mockResolvedValue([courseFixture({ status: 'draft' })])
      const svc = await getService()
      const r = await svc.unpublish(TEST_COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(r.status).toBe('draft')
    })

    it('rejects unpublish on draft course', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ status: 'draft' })])
      const svc = await getService()
      await expect(svc.unpublish(TEST_COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' }))
        .rejects.toMatchObject({ code: 'INVALID_STATE' })
    })
  })

  describe('delete', () => {
    it('deletes course and logs audit', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      dbMock.mockDelete.mockResolvedValue(undefined)
      const svc = await getService()
      await svc.delete(TEST_COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(dbMock.db.delete).toHaveBeenCalled()
    })
  })
})
