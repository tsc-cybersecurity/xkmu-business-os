import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'
const PROG_ID   = '00000000-0000-0000-0000-0000000000f1'

function progFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: PROG_ID, userId: TEST_USER_ID, lessonId: LESSON_ID, courseId: COURSE_ID,
    completedAt: new Date(), ...overrides,
  }
}

describe('CourseLessonProgressService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getSvc() {
    const mod = await import('@/lib/services/course-lesson-progress.service')
    return mod.CourseLessonProgressService
  }

  describe('markCompleted', () => {
    it('inserts new row when none exists', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])  // no existing
      dbMock.mockInsert.mockResolvedValue([progFixture()])
      const svc = await getSvc()
      const result = await svc.markCompleted(TEST_USER_ID, COURSE_ID, LESSON_ID)
      expect(result.lessonId).toBe(LESSON_ID)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('returns existing row when already completed (idempotent)', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([progFixture()])
      const svc = await getSvc()
      const result = await svc.markCompleted(TEST_USER_ID, COURSE_ID, LESSON_ID)
      expect(result.id).toBe(PROG_ID)
      expect(dbMock.db.insert).not.toHaveBeenCalled()
    })
  })

  describe('markUncompleted', () => {
    it('deletes the row', async () => {
      dbMock.mockDelete.mockResolvedValue(undefined)
      const svc = await getSvc()
      await svc.markUncompleted(TEST_USER_ID, LESSON_ID)
      expect(dbMock.db.delete).toHaveBeenCalled()
    })
  })

  describe('listForCourse', () => {
    it('returns array of completed lesson IDs', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([
        { lessonId: LESSON_ID },
        { lessonId: '00000000-0000-0000-0000-0000000000e2' },
      ])
      const svc = await getSvc()
      const result = await svc.listForCourse(TEST_USER_ID, COURSE_ID)
      expect(result).toEqual([LESSON_ID, '00000000-0000-0000-0000-0000000000e2'])
    })

    it('returns empty array when no progress', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const result = await svc.listForCourse(TEST_USER_ID, COURSE_ID)
      expect(result).toEqual([])
    })
  })

  describe('getCourseProgress', () => {
    it('returns counts and percentage', async () => {
      // total lessons in course
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 4 }])
      // completed lessons
      dbMock.mockSelect.mockResolvedValueOnce([{ completed: 1 }])
      const svc = await getSvc()
      const result = await svc.getCourseProgress(TEST_USER_ID, COURSE_ID)
      expect(result).toEqual({ completed: 1, total: 4, percentage: 25 })
    })

    it('returns 0% on empty course', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])
      dbMock.mockSelect.mockResolvedValueOnce([{ completed: 0 }])
      const svc = await getSvc()
      const result = await svc.getCourseProgress(TEST_USER_ID, COURSE_ID)
      expect(result).toEqual({ completed: 0, total: 0, percentage: 0 })
    })

    it('rounds percentage to integer', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 3 }])
      dbMock.mockSelect.mockResolvedValueOnce([{ completed: 1 }])
      const svc = await getSvc()
      const result = await svc.getCourseProgress(TEST_USER_ID, COURSE_ID)
      expect(result.percentage).toBe(33)  // 33.333... → 33
    })
  })
})
