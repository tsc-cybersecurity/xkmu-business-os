import { db } from '@/lib/db'
import { courses } from '@/lib/db/schema'
import type { Course } from '@/lib/db/schema'
import { eq, and, ilike, desc, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import { logger } from '@/lib/utils/logger'
import { invalidateAssetAccessByCourse } from '@/lib/utils/course-asset-acl'

export interface Actor { userId: string | null; userRole: string | null }

export interface CourseCreateInput {
  title: string
  slug?: string
  subtitle?: string | null
  description?: string | null
  visibility?: 'public' | 'portal' | 'both'
  useModules?: boolean
  enforceSequential?: boolean
  estimatedMinutes?: number | null
  coverImageId?: string | null
}

export interface CourseUpdateInput extends Partial<CourseCreateInput> {}

export interface CourseListFilter {
  status?: string
  visibility?: string
  q?: string
  page?: number
  limit?: number
}

export class CourseError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160) || 'kurs'
}

export const CourseService = {
  async list(filter: CourseListFilter = {}): Promise<{ items: Course[]; total: number }> {
    const page = filter.page ?? 1
    const limit = filter.limit ?? 50
    const offset = (page - 1) * limit
    const conds = []
    if (filter.status) conds.push(eq(courses.status, filter.status))
    if (filter.visibility) conds.push(eq(courses.visibility, filter.visibility as 'public' | 'portal' | 'both'))
    if (filter.q) conds.push(ilike(courses.title, `%${filter.q}%`))
    const where = conds.length > 0 ? and(...conds) : undefined

    const [items, totalRows] = await Promise.all([
      db.select().from(courses).where(where).orderBy(desc(courses.updatedAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(courses).where(where),
    ])
    return { items, total: totalRows[0]?.count ?? 0 }
  },

  async get(id: string): Promise<Course | null> {
    const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1)
    return row ?? null
  },

  async getBySlug(slug: string): Promise<Course | null> {
    const [row] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1)
    return row ?? null
  },

  async create(input: CourseCreateInput, actor: Actor): Promise<Course> {
    const slug = (input.slug ?? slugify(input.title)).trim()
    const existing = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1)
    if (existing.length > 0) throw new CourseError('SLUG_CONFLICT', `Slug bereits vergeben: ${slug}`)

    const [row] = await db.insert(courses).values({
      slug,
      title: input.title,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      coverImageId: input.coverImageId ?? null,
      visibility: input.visibility ?? 'portal',
      useModules: input.useModules ?? false,
      enforceSequential: input.enforceSequential ?? false,
      estimatedMinutes: input.estimatedMinutes ?? null,
      createdBy: actor.userId,
    }).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.created', entityType: 'course', entityId: row.id,
      payload: { slug, title: input.title },
    })
    return row
  },

  async update(id: string, patch: CourseUpdateInput, actor: Actor): Promise<Course> {
    const existing = await this.get(id)
    if (!existing) throw new CourseError('NOT_FOUND', `Kurs ${id} nicht gefunden`)

    if (patch.slug && patch.slug !== existing.slug) {
      const conflict = await db.select().from(courses).where(eq(courses.slug, patch.slug)).limit(1)
      if (conflict.length > 0) throw new CourseError('SLUG_CONFLICT', `Slug bereits vergeben: ${patch.slug}`)
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }
    for (const k of ['slug','title','subtitle','description','coverImageId','visibility','useModules','enforceSequential','estimatedMinutes'] as const) {
      if (k in patch) update[k] = (patch as Record<string, unknown>)[k]
    }

    const [row] = await db.update(courses).set(update).where(eq(courses.id, id)).returning()
    if (Object.prototype.hasOwnProperty.call(update, 'visibility')) {
      invalidateAssetAccessByCourse(id)
    }
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.updated', entityType: 'course', entityId: id,
      payload: { changes: Object.keys(update).filter(k => k !== 'updatedAt') },
    })
    return row
  },

  async archive(id: string, actor: Actor): Promise<Course> {
    const existing = await this.get(id)
    if (!existing) throw new CourseError('NOT_FOUND', `Kurs ${id} nicht gefunden`)
    const [row] = await db.update(courses)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(courses.id, id)).returning()
    invalidateAssetAccessByCourse(id)
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.archived', entityType: 'course', entityId: id, payload: {},
    })
    return row
  },

  async restore(id: string, actor: Actor): Promise<Course> {
    const existing = await this.get(id)
    if (!existing) throw new CourseError('NOT_FOUND', `Kurs ${id} nicht gefunden`)
    if (existing.status !== 'archived') throw new CourseError('INVALID_STATE', `Kurs ist nicht archived (status=${existing.status})`)
    const [row] = await db.update(courses)
      .set({ status: 'draft', publishedAt: null, updatedAt: new Date() })
      .where(eq(courses.id, id)).returning()
    invalidateAssetAccessByCourse(id)
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.restored', entityType: 'course', entityId: id, payload: {},
    })
    return row
  },

  async unpublish(id: string, actor: Actor): Promise<Course> {
    const existing = await this.get(id)
    if (!existing) throw new CourseError('NOT_FOUND', `Kurs ${id} nicht gefunden`)
    if (existing.status !== 'published') throw new CourseError('INVALID_STATE', `Kurs ist nicht published (status=${existing.status})`)
    const [row] = await db.update(courses)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(courses.id, id)).returning()
    invalidateAssetAccessByCourse(id)
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.unpublished', entityType: 'course', entityId: id, payload: {},
    })
    return row
  },

  async delete(id: string, actor: Actor): Promise<void> {
    const existing = await this.get(id)
    if (!existing) throw new CourseError('NOT_FOUND', `Kurs ${id} nicht gefunden`)
    invalidateAssetAccessByCourse(id)
    await db.delete(courses).where(eq(courses.id, id))
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.deleted', entityType: 'course', entityId: id,
      payload: { slug: existing.slug, title: existing.title },
    })
    logger.info('Course deleted', { module: 'CourseService', id })
  },
}
