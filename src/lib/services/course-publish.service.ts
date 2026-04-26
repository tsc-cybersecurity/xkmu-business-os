import { db } from '@/lib/db'
import { courses, courseLessons, courseModules, courseAssets } from '@/lib/db/schema'
import type { Course } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import type { Actor } from './course.service'

export interface PublishProblem {
  lessonId?: string
  code: string
  message: string
}

export class PublishValidationError extends Error {
  code = 'PUBLISH_VALIDATION'
  constructor(public details: PublishProblem[]) {
    super(`Kurs nicht publish-fähig (${details.length} Problem(e))`)
  }
}

export const CoursePublishService = {
  async publish(courseId: string, actor: Actor): Promise<Course> {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1)
    if (!course) throw new PublishValidationError([{ code: 'NOT_FOUND', message: `Kurs ${courseId} nicht gefunden` }])

    const lessons = await db.select().from(courseLessons).where(eq(courseLessons.courseId, courseId))
    const modules = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId))
    const assets  = await db.select().from(courseAssets).where(eq(courseAssets.courseId, courseId))
    const lessonAssetCount = new Map<string, number>()
    for (const a of assets) if (a.lessonId) lessonAssetCount.set(a.lessonId, (lessonAssetCount.get(a.lessonId) ?? 0) + 1)

    const problems: PublishProblem[] = []

    if (!course.slug) problems.push({ code: 'COURSE_SLUG_MISSING', message: 'Kurs hat keinen Slug' })
    if (course.visibility === 'public' && !course.description) {
      problems.push({ code: 'DESCRIPTION_REQUIRED', message: 'Public-Kurse brauchen eine Beschreibung' })
    }
    if (lessons.length === 0) {
      problems.push({ code: 'NO_LESSONS', message: 'Kurs hat keine Lektionen' })
    }
    if (course.useModules && modules.length === 0) {
      problems.push({ code: 'NO_MODULES', message: 'useModules=true aber keine Module vorhanden' })
    }

    for (const l of lessons) {
      if (!l.title) problems.push({ lessonId: l.id, code: 'LESSON_TITLE_MISSING', message: 'Lektion ohne Titel' })
      if (!l.slug) problems.push({ lessonId: l.id, code: 'LESSON_SLUG_MISSING', message: 'Lektion ohne Slug' })
      const hasContent = !!(l.contentMarkdown || l.videoAssetId || l.videoExternalUrl || (lessonAssetCount.get(l.id) ?? 0) > 0)
      if (!hasContent) {
        problems.push({ lessonId: l.id, code: 'LESSON_EMPTY', message: `Lektion '${l.title}' hat keinen Inhalt` })
      }
      if (course.useModules && !l.moduleId) {
        problems.push({ lessonId: l.id, code: 'LESSON_NO_MODULE', message: `Lektion '${l.title}' keinem Modul zugeordnet` })
      }
    }

    if (problems.length > 0) throw new PublishValidationError(problems)

    const [row] = await db.update(courses)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(courses.id, courseId)).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.published', entityType: 'course', entityId: courseId,
      payload: { lessonCount: lessons.length, moduleCount: modules.length },
    })
    return row
  },
}
