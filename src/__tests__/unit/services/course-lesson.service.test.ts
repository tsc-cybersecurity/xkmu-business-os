import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'

function lessonFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: LESSON_ID, courseId: COURSE_ID, moduleId: null, position: 1,
    slug: 'lektion-1', title: 'Lektion 1', contentMarkdown: null,
    videoAssetId: null, videoExternalUrl: null, durationMinutes: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

describe('CourseLessonService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getService() {
    return (await import('@/lib/services/course-lesson.service')).CourseLessonService
  }

  it('creates lesson with auto slug + position', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])              // slug uniqueness
    dbMock.mockSelect.mockResolvedValueOnce([{ max: 0 }])    // max position
    dbMock.mockInsert.mockResolvedValue([lessonFixture()])
    const svc = await getService()
    const r = await svc.create(COURSE_ID, { title: 'Lektion 1' }, { userId: TEST_USER_ID, userRole: 'admin' })
    expect(r.slug).toBe('lektion-1')
    expect(r.position).toBe(1)
  })

  it('rejects duplicate slug per course', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([lessonFixture()])
    const svc = await getService()
    await expect(svc.create(COURSE_ID, { title: 'Lektion 1', slug: 'lektion-1' },
      { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'SLUG_CONFLICT' })
  })

  it('reorder updates position + moduleId in transaction', async () => {
    dbMock.mockTransaction.mockImplementation(async (cb: any) => cb(dbMock.db))
    dbMock.mockUpdate.mockResolvedValue(undefined)
    const svc = await getService()
    await svc.reorder(COURSE_ID, [
      { id: LESSON_ID, position: 1, moduleId: 'm1' },
      { id: 'x', position: 2, moduleId: 'm1' },
    ], { userId: TEST_USER_ID, userRole: 'admin' })
    expect(dbMock.db.update).toHaveBeenCalledTimes(2)
  })
})
