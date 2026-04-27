import { db } from '@/lib/db'
import { courseLessonBlocks } from '@/lib/db/schema'
import type { CourseLessonBlock } from '@/lib/db/schema'
import { eq, asc, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'

export interface Actor { userId: string | null; userRole: string | null }

export type CreateBlockInput =
  | { kind: 'markdown'; markdownBody: string; position?: number }
  | {
      kind: 'cms_block'
      blockType: string
      content?: Record<string, unknown>
      settings?: Record<string, unknown>
      position?: number
    }

export interface UpdateBlockInput {
  markdownBody?: string | null
  content?: Record<string, unknown>
  settings?: Record<string, unknown>
  isVisible?: boolean
}

export class CourseLessonBlockError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

export const CourseLessonBlockService = {
  async listByLesson(
    lessonId: string,
    opts: { includeHidden?: boolean } = {},
  ): Promise<CourseLessonBlock[]> {
    const rows = await db
      .select()
      .from(courseLessonBlocks)
      .where(eq(courseLessonBlocks.lessonId, lessonId))
      .orderBy(asc(courseLessonBlocks.position))
    return opts.includeHidden ? rows : rows.filter((b) => b.isVisible)
  },

  async create(
    lessonId: string,
    input: CreateBlockInput,
    actor: Actor,
  ): Promise<CourseLessonBlock> {
    let position = input.position
    if (position === undefined) {
      const [maxRow] = await db
        .select({ max: sql<number>`coalesce(max(position), 0)::int` })
        .from(courseLessonBlocks)
        .where(eq(courseLessonBlocks.lessonId, lessonId))
      position = (maxRow?.max ?? 0) + 1
    }

    const values = input.kind === 'markdown'
      ? {
          lessonId,
          position,
          kind: 'markdown' as const,
          markdownBody: input.markdownBody,
          blockType: null,
          content: {},
          settings: {},
        }
      : {
          lessonId,
          position,
          kind: 'cms_block' as const,
          markdownBody: null,
          blockType: input.blockType,
          content: input.content ?? {},
          settings: input.settings ?? {},
        }

    const [row] = await db.insert(courseLessonBlocks).values(values).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'lesson.block.created', entityType: 'course_lesson_block', entityId: row.id,
      payload: { lessonId, kind: row.kind, blockType: row.blockType ?? null },
    })
    return row
  },

  async update(
    blockId: string,
    patch: UpdateBlockInput,
    actor: Actor,
  ): Promise<CourseLessonBlock> {
    const [existing] = await db
      .select().from(courseLessonBlocks).where(eq(courseLessonBlocks.id, blockId)).limit(1)
    if (!existing) throw new CourseLessonBlockError('NOT_FOUND', `Block ${blockId} nicht gefunden`)

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if ('markdownBody' in patch) update.markdownBody = patch.markdownBody
    if ('content' in patch)      update.content      = patch.content
    if ('settings' in patch)     update.settings     = patch.settings
    if ('isVisible' in patch)    update.isVisible    = patch.isVisible

    const [row] = await db.update(courseLessonBlocks).set(update)
      .where(eq(courseLessonBlocks.id, blockId)).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'lesson.block.updated', entityType: 'course_lesson_block', entityId: blockId,
      payload: { changes: Object.keys(update).filter((k) => k !== 'updatedAt') },
    })
    return row
  },

  async delete(blockId: string, actor: Actor): Promise<void> {
    const [existing] = await db
      .select().from(courseLessonBlocks).where(eq(courseLessonBlocks.id, blockId)).limit(1)
    if (!existing) throw new CourseLessonBlockError('NOT_FOUND', `Block ${blockId} nicht gefunden`)

    await db.delete(courseLessonBlocks).where(eq(courseLessonBlocks.id, blockId))
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'lesson.block.deleted', entityType: 'course_lesson_block', entityId: blockId,
      payload: { lessonId: existing.lessonId, kind: existing.kind },
    })
  },

  async reorder(
    lessonId: string,
    items: Array<{ id: string; position: number }>,
    actor: Actor,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(courseLessonBlocks)
          .set({ position: item.position, updatedAt: new Date() })
          .where(eq(courseLessonBlocks.id, item.id))
      }
    })
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'lesson.block.reordered', entityType: 'course_lesson', entityId: lessonId,
      payload: { count: items.length },
    })
  },
}
