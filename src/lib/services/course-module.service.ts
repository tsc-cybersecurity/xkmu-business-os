import { db } from '@/lib/db'
import { courseModules } from '@/lib/db/schema'
import type { CourseModule } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import type { Actor } from './course.service'

export interface CourseModuleCreateInput { title: string; description?: string | null }
export interface CourseModuleUpdateInput extends Partial<CourseModuleCreateInput> {}
export class CourseModuleError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

export const CourseModuleService = {
  async listByCourse(courseId: string): Promise<CourseModule[]> {
    return db.select().from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(courseModules.position)
  },

  async create(courseId: string, input: CourseModuleCreateInput, actor: Actor): Promise<CourseModule> {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${courseModules.position}), 0)` })
      .from(courseModules).where(eq(courseModules.courseId, courseId))
    const [row] = await db.insert(courseModules).values({
      courseId, title: input.title, description: input.description ?? null, position: (max ?? 0) + 1,
    }).returning()
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_module.created', entityType: 'course_module', entityId: row.id,
      payload: { courseId, title: input.title },
    })
    return row
  },

  async update(id: string, patch: CourseModuleUpdateInput, actor: Actor): Promise<CourseModule> {
    const update: Record<string, unknown> = { updatedAt: new Date() }
    if ('title' in patch) update.title = patch.title
    if ('description' in patch) update.description = patch.description
    const [row] = await db.update(courseModules).set(update).where(eq(courseModules.id, id)).returning()
    if (!row) throw new CourseModuleError('NOT_FOUND', `Modul ${id} nicht gefunden`)
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_module.updated', entityType: 'course_module', entityId: id,
      payload: { changes: Object.keys(update).filter(k => k !== 'updatedAt') },
    })
    return row
  },

  async delete(id: string, actor: Actor): Promise<void> {
    await db.delete(courseModules).where(eq(courseModules.id, id))
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_module.deleted', entityType: 'course_module', entityId: id, payload: {},
    })
  },

  async reorder(courseId: string, items: { id: string; position: number }[], actor: Actor): Promise<void> {
    await db.transaction(async (tx) => {
      for (const it of items) {
        await tx.update(courseModules).set({ position: it.position, updatedAt: new Date() })
          .where(and(eq(courseModules.id, it.id), eq(courseModules.courseId, courseId)))
      }
    })
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_module.reordered', entityType: 'course', entityId: courseId,
      payload: { items },
    })
  },
}
