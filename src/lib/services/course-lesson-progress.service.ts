import { db } from '@/lib/db'
import { courses, courseLessonProgress, courseLessons, courseModules } from '@/lib/db/schema'
import type { CourseLessonProgress } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import { computeLockedLessonIds, sortLessonsForOutline } from '@/lib/utils/course-sequential'

export class CourseLessonProgressError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

export interface CourseProgressSummary {
  completed: number
  total: number
  percentage: number
}

export const CourseLessonProgressService = {
  async markCompleted(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<CourseLessonProgress> {
    const [existing] = await db
      .select()
      .from(courseLessonProgress)
      .where(and(
        eq(courseLessonProgress.userId, userId),
        eq(courseLessonProgress.lessonId, lessonId),
      ))
      .limit(1)
    if (existing) return existing

    // Sequential mode: reject if any earlier lesson isn't completed yet.
    const [course] = await db
      .select({ enforceSequential: courses.enforceSequential })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1)
    if (course?.enforceSequential) {
      const [allLessons, allModules, completedRows] = await Promise.all([
        db.select().from(courseLessons).where(eq(courseLessons.courseId, courseId)),
        db.select().from(courseModules).where(eq(courseModules.courseId, courseId)),
        db
          .select({ lessonId: courseLessonProgress.lessonId })
          .from(courseLessonProgress)
          .where(and(
            eq(courseLessonProgress.userId, userId),
            eq(courseLessonProgress.courseId, courseId),
          )),
      ])
      const sorted = sortLessonsForOutline(allLessons, allModules)
      const locked = computeLockedLessonIds({
        course: { enforceSequential: true },
        sortedLessons: sorted,
        completedLessonIds: completedRows.map((r) => r.lessonId),
      })
      if (locked.has(lessonId)) {
        throw new CourseLessonProgressError(
          'LESSON_LOCKED',
          'Lektion ist gesperrt — bitte vorherige Lektionen abschließen.',
        )
      }
    }

    const [row] = await db
      .insert(courseLessonProgress)
      .values({ userId, courseId, lessonId })
      .returning()

    await AuditLogService.log({
      userId, userRole: null,
      action: 'lesson.progress.completed',
      entityType: 'course_lesson_progress', entityId: row.id,
      payload: { courseId, lessonId },
    })
    return row
  },

  async markUncompleted(userId: string, lessonId: string): Promise<void> {
    await db
      .delete(courseLessonProgress)
      .where(and(
        eq(courseLessonProgress.userId, userId),
        eq(courseLessonProgress.lessonId, lessonId),
      ))

    await AuditLogService.log({
      userId, userRole: null,
      action: 'lesson.progress.uncompleted',
      entityType: 'course_lesson_progress', entityId: lessonId,
      payload: { lessonId },
    })
  },

  async listForCourse(userId: string, courseId: string): Promise<string[]> {
    const rows = await db
      .select({ lessonId: courseLessonProgress.lessonId })
      .from(courseLessonProgress)
      .where(and(
        eq(courseLessonProgress.userId, userId),
        eq(courseLessonProgress.courseId, courseId),
      ))
    return rows.map((r) => r.lessonId)
  },

  async getCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<CourseProgressSummary> {
    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(courseLessons)
      .where(eq(courseLessons.courseId, courseId))

    const [completedRow] = await db
      .select({ completed: sql<number>`count(*)::int` })
      .from(courseLessonProgress)
      .where(and(
        eq(courseLessonProgress.userId, userId),
        eq(courseLessonProgress.courseId, courseId),
      ))

    const total = totalRow?.total ?? 0
    const completed = completedRow?.completed ?? 0
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)
    return { completed, total, percentage }
  },
}
