// ============================================
// Task Queue Service (Ersetzt Cron-Jobs)
// Tasks werden in DB gequeued und per Button ausgefuehrt
// ============================================

import { db } from '@/lib/db'
import { taskQueue } from '@/lib/db/schema'
import type { TaskQueueItem, NewTaskQueueItem } from '@/lib/db/schema'
import { eq, ne, and, asc, desc, count, lte, inArray } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export interface TaskQueueFilters {
  status?: string
  type?: string
  scheduledBefore?: Date
  page?: number
  limit?: number
}

export const TaskQueueService = {
  async list(filters: TaskQueueFilters = {}) {
    const { status, type, scheduledBefore, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions: ReturnType<typeof eq>[] = []
    if (status) conditions.push(eq(taskQueue.status, status))
    if (type) conditions.push(eq(taskQueue.type, type))
    if (scheduledBefore) conditions.push(lte(taskQueue.scheduledFor, scheduledBefore))

    const whereClause = conditions.length ? and(...conditions) : undefined

    const [items, [{ total }], statsRows] = await Promise.all([
      db.select()
        .from(taskQueue)
        .where(whereClause)
        .orderBy(desc(taskQueue.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(taskQueue).where(whereClause),
      db.select({ status: taskQueue.status, count: count() })
        .from(taskQueue)
        .groupBy(taskQueue.status),
    ])

    const stats = {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }
    for (const row of statsRows) {
      const n = Number(row.count)
      stats.total += n
      if (row.status && row.status in stats) {
        ;(stats as Record<string, number>)[row.status] = n
      }
    }

    return {
      items,
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
      stats,
    }
  },

  async getById(id: string): Promise<TaskQueueItem | null> {
    const [item] = await db
      .select()
      .from(taskQueue)
      .where(eq(taskQueue.id, id))
      .limit(1)
    return item ?? null
  },

  async create(data: {
    type: string
    priority?: number
    payload?: unknown
    scheduledFor?: Date
    referenceType?: string
    referenceId?: string
  }): Promise<TaskQueueItem> {
    const [item] = await db
      .insert(taskQueue)
      .values({
        type: data.type,
        priority: data.priority ?? 2,
        payload: data.payload ?? {},
        scheduledFor: data.scheduledFor ?? new Date(),
        referenceType: data.referenceType,
        referenceId: data.referenceId,
      })
      .returning()
    return item
  },

  async cancel(id: string): Promise<boolean> {
    const [item] = await db
      .update(taskQueue)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(taskQueue.id, id), eq(taskQueue.status, 'pending')))
      .returning({ id: taskQueue.id })
    return !!item
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(taskQueue)
      .where(eq(taskQueue.id, id))
      .returning({ id: taskQueue.id })
    return result.length > 0
  },

  /**
   * Bulk-delete tasks for the given tenant.
   *
   * scope:
   *  - 'all'           → every task (use with care)
   *  - 'older-than'    → tasks whose createdAt is older than maxAgeMs
   *  - 'without-error' → tasks whose status is not 'failed' (i.e. completed,
   *                       cancelled, pending, running with no error column).
   *                       Useful for clearing successful runs while keeping
   *                       failures around for debugging.
   */
  async deleteBulk(scope: 'all' | 'older-than' | 'without-error',
    options: { maxAgeMs?: number } = {}
  ): Promise<number> {
    const conditions: ReturnType<typeof eq>[] = []

    if (scope === 'older-than') {
      const maxAgeMs = options.maxAgeMs ?? 24 * 60 * 60 * 1000
      const cutoff = new Date(Date.now() - maxAgeMs)
      conditions.push(lte(taskQueue.createdAt, cutoff))
    } else if (scope === 'without-error') {
      conditions.push(ne(taskQueue.status, 'failed'))
    }
    // scope === 'all' has no extra conditions

    const result = await db
      .delete(taskQueue)
      .where(conditions.length ? and(...conditions) : undefined)
      .returning({ id: taskQueue.id })

    logger.info(
      `Bulk deleted ${result.length} task(s) (scope=${scope})`,
      { module: 'TaskQueue' }
    )
    return result.length
  },

  async execute(id: string): Promise<TaskQueueItem | null> {
    // Mark as running
    const [item] = await db
      .update(taskQueue)
      .set({ status: 'running', updatedAt: new Date() })
      .where(and(eq(taskQueue.id, id), eq(taskQueue.status, 'pending')))
      .returning()

    if (!item) return null

    try {
      const result = await executeHandler(item)

      const [updated] = await db
        .update(taskQueue)
        .set({
          status: 'completed',
          result: result as Record<string, unknown>,
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(taskQueue.id, id))
        .returning()

      logger.info(`Task ${id} (${item.type}) completed`, { module: 'TaskQueue' })
      return updated
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const [updated] = await db
        .update(taskQueue)
        .set({
          status: 'failed',
          error: errorMsg,
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(taskQueue.id, id))
        .returning()

      logger.error(`Task ${id} (${item.type}) failed: ${errorMsg}`, undefined, { module: 'TaskQueue' })
      return updated
    }
  },

  async executeBatch(ids: string[]): Promise<{ completed: number; failed: number }> {
    let completed = 0
    let failed = 0

    for (const id of ids) {
      const result = await this.execute(id)
      if (result?.status === 'completed') completed++
      else if (result?.status === 'failed') failed++
    }

    return { completed, failed }
  },

  async executeAllPending(): Promise<{ completed: number; failed: number }> {
    const pending = await db
      .select({ id: taskQueue.id })
      .from(taskQueue)
      .where(and(
        eq(taskQueue.status, 'pending'),
        lte(taskQueue.scheduledFor, new Date())))
      .orderBy(asc(taskQueue.priority), asc(taskQueue.scheduledFor))

    return this.executeBatch(pending.map(p => p.id))
  },

  async getStats() {
    const rows = await db
      .select({ status: taskQueue.status, count: count() })
      .from(taskQueue)
      .groupBy(taskQueue.status)

    const stats: Record<string, number> = { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 }
    for (const row of rows) {
      stats[row.status] = Number(row.count)
    }
    return stats
  },
}

// ============================================
// Task Handlers
// ============================================

async function executeHandler(item: TaskQueueItem): Promise<unknown> {
  const payload = item.payload as Record<string, unknown>

  switch (item.type) {
    case 'email': {
      const { EmailService } = await import('@/lib/services/email.service')
      // Template-basierter Versand wenn templateSlug vorhanden
      if (payload.templateSlug) {
        const result = await EmailService.sendWithTemplate(
          String(payload.templateSlug),
          String(payload.to || ''),
          (payload.placeholders || {}) as Record<string, string>,
          {
            cc: payload.cc ? String(payload.cc) : undefined,
            leadId: payload.leadId ? String(payload.leadId) : undefined,
            companyId: payload.companyId ? String(payload.companyId) : undefined,
            personId: payload.personId ? String(payload.personId) : undefined,
          }
        )
        if (!result.success) throw new Error(result.error || 'E-Mail-Versand fehlgeschlagen')
        return { sent: true, to: payload.to, template: payload.templateSlug, messageId: result.messageId }
      }
      // Direkter Versand
      const result = await EmailService.send({
        to: String(payload.to || ''),
        subject: String(payload.subject || ''),
        body: String(payload.body || ''),
        html: payload.html ? String(payload.html) : undefined,
      })
      if (!result.success) throw new Error(result.error || 'E-Mail-Versand fehlgeschlagen')
      return { sent: true, to: payload.to, messageId: result.messageId }
    }

    case 'dunning': {
      const { handleDunning } = await import('@/lib/services/task-queue-handlers/dunning.handler')
      return handleDunning(payload as unknown as Parameters<typeof handleDunning>[0])
    }

    case 'follow_up':
    case 'reminder': {
      // Follow-up: Sendet E-Mail wenn Template und Empfaenger vorhanden
      if (payload.templateSlug && payload.to) {
        const { EmailService } = await import('@/lib/services/email.service')
        const result = await EmailService.sendWithTemplate(
          String(payload.templateSlug),
          String(payload.to),
          (payload.placeholders || {}) as Record<string, string>,
          { leadId: payload.leadId ? String(payload.leadId) : undefined }
        )
        if (!result.success) throw new Error(result.error || 'E-Mail-Versand fehlgeschlagen')
        return { sent: true, to: payload.to, template: payload.templateSlug }
      }
      logger.info(`Handler '${item.type}': no template/to, skipping`, { module: 'TaskQueue' })
      return { skipped: true, reason: 'Missing templateSlug or to' }
    }

    default:
      logger.warn(`Unknown task type: ${item.type}`, { module: 'TaskQueue' })
      return { skipped: true, reason: `Unknown type: ${item.type}` }
  }
}
