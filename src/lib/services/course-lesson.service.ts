import { db } from '@/lib/db'
import { courseLessons } from '@/lib/db/schema'
import type { CourseLesson } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import type { Actor } from './course.service'

export interface CourseLessonCreateInput {
  title: string
  slug?: string
  moduleId?: string | null
  contentMarkdown?: string | null
  videoAssetId?: string | null
  videoExternalUrl?: string | null
  durationMinutes?: number | null
}
export interface CourseLessonUpdateInput extends Partial<CourseLessonCreateInput> {}
export class CourseLessonError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

function slugify(input: string): string {
  return input.toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,160) || 'lektion'
}

export const CourseLessonService = {
  async listByCourse(courseId: string): Promise<CourseLesson[]> {
    return db.select().from(courseLessons)
      .where(eq(courseLessons.courseId, courseId))
      .orderBy(courseLessons.position)
  },

  async get(id: string): Promise<CourseLesson | null> {
    const [row] = await db.select().from(courseLessons).where(eq(courseLessons.id, id)).limit(1)
    return row ?? null
  },

  async create(courseId: string, input: CourseLessonCreateInput, actor: Actor): Promise<CourseLesson> {
    const slug = (input.slug ?? slugify(input.title)).trim()
    const dup = await db.select().from(courseLessons)
      .where(and(eq(courseLessons.courseId, courseId), eq(courseLessons.slug, slug))).limit(1)
    if (dup.length > 0) throw new CourseLessonError('SLUG_CONFLICT', `Slug '${slug}' im Kurs vergeben`)

    const [{ max }] = await db.select({
      max: sql<number>`coalesce(max(${courseLessons.position}), 0)`,
    }).from(courseLessons).where(eq(courseLessons.courseId, courseId))

    const [row] = await db.insert(courseLessons).values({
      courseId, moduleId: input.moduleId ?? null, slug, title: input.title,
      contentMarkdown: input.contentMarkdown ?? null,
      videoAssetId: input.videoAssetId ?? null,
      videoExternalUrl: input.videoExternalUrl ?? null,
      durationMinutes: input.durationMinutes ?? null,
      position: (max ?? 0) + 1,
    }).returning()
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_lesson.created', entityType: 'course_lesson', entityId: row.id,
      payload: { courseId, title: input.title, slug },
    })
    return row
  },

  async update(id: string, patch: CourseLessonUpdateInput, actor: Actor): Promise<CourseLesson> {
    const existing = await this.get(id)
    if (!existing) throw new CourseLessonError('NOT_FOUND', `Lektion ${id} nicht gefunden`)

    if (patch.slug && patch.slug !== existing.slug) {
      const dup = await db.select().from(courseLessons)
        .where(and(eq(courseLessons.courseId, existing.courseId), eq(courseLessons.slug, patch.slug)))
        .limit(1)
      if (dup.length > 0) throw new CourseLessonError('SLUG_CONFLICT', `Slug '${patch.slug}' bereits vergeben`)
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }
    for (const k of ['slug','title','moduleId','contentMarkdown','videoAssetId','videoExternalUrl','durationMinutes'] as const) {
      if (k in patch) update[k] = (patch as Record<string, unknown>)[k]
    }
    const [row] = await db.update(courseLessons).set(update).where(eq(courseLessons.id, id)).returning()
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_lesson.updated', entityType: 'course_lesson', entityId: id,
      payload: { changes: Object.keys(update).filter(k => k !== 'updatedAt') },
    })
    return row
  },

  async delete(id: string, actor: Actor): Promise<void> {
    await db.delete(courseLessons).where(eq(courseLessons.id, id))
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_lesson.deleted', entityType: 'course_lesson', entityId: id, payload: {},
    })
  },

  async reorder(courseId: string,
    items: { id: string; position: number; moduleId?: string | null }[],
    actor: Actor): Promise<void> {
    await db.transaction(async (tx) => {
      for (const it of items) {
        const set: Record<string, unknown> = { position: it.position, updatedAt: new Date() }
        if ('moduleId' in it) set.moduleId = it.moduleId ?? null
        await tx.update(courseLessons).set(set)
          .where(and(eq(courseLessons.id, it.id), eq(courseLessons.courseId, courseId)))
      }
    })
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_lesson.reordered', entityType: 'course', entityId: courseId,
      payload: { items },
    })
  },
}
