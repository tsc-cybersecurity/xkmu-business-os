import { db } from '@/lib/db'
import { courseLessonProgress, courseLessons } from '@/lib/db/schema'
import type { CourseLessonProgress } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'

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
