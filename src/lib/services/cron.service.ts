/**
 * Cron Job Service
 *
 * Manages scheduled jobs: CRUD, execution, next-run calculation.
 * Jobs log to task_queue for visibility and history.
 */

import { db } from '@/lib/db'
import { cronJobs, taskQueue } from '@/lib/db/schema'
import { eq, and, lte, asc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import type { CronJob } from '@/lib/db/schema'

// ── Interval helpers ───────────────────────────────────────────────────────

const INTERVAL_MS: Record<string, number> = {
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '60min': 60 * 60 * 1000,
  'daily': 24 * 60 * 60 * 1000,
}

export const INTERVAL_OPTIONS = [
  { value: '5min', label: 'Alle 5 Minuten' },
  { value: '15min', label: 'Alle 15 Minuten' },
  { value: '30min', label: 'Alle 30 Minuten' },
  { value: '60min', label: 'Stündlich' },
  { value: 'daily', label: 'Täglich' },
]

export const ACTION_TYPE_OPTIONS = [
  { value: 'email_sync', label: 'E-Mail Sync (alle Accounts)' },
  { value: 'workflow', label: 'Workflow auslösen' },
  { value: 'api_call', label: 'API-Endpoint aufrufen' },
  { value: 'custom', label: 'Benutzerdefiniert' },
]

function calculateNextRun(interval: string, dailyAt?: string | null): Date {
  const now = new Date()

  if (interval === 'daily' && dailyAt) {
    const [hours, minutes] = dailyAt.split(':').map(Number)
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }

  const ms = INTERVAL_MS[interval] || INTERVAL_MS['60min']
  return new Date(now.getTime() + ms)
}

// ── Service ────────────────────────────────────────────────────────────────

export const CronService = {
  async list(): Promise<CronJob[]> {
    return db.select().from(cronJobs).orderBy(asc(cronJobs.createdAt))
  },

  async getById(id: string): Promise<CronJob | null> {
    const [job] = await db.select().from(cronJobs).where(eq(cronJobs.id, id)).limit(1)
    return job ?? null
  },

  async create(data: {
    name: string
    description?: string
    interval: string
    dailyAt?: string
    actionType: string
    actionConfig?: Record<string, unknown>
    isActive?: boolean
    createdBy?: string
  }): Promise<CronJob> {
    const nextRunAt = data.isActive !== false ? calculateNextRun(data.interval, data.dailyAt) : null
    const [job] = await db.insert(cronJobs).values({
      name: data.name,
      description: data.description || null,
      interval: data.interval,
      dailyAt: data.dailyAt || null,
      actionType: data.actionType,
      actionConfig: data.actionConfig || {},
      isActive: data.isActive ?? true,
      nextRunAt,
      createdBy: data.createdBy || null,
    }).returning()
    return job
  },

  async update(id: string, data: Partial<{
    name: string
    description: string
    interval: string
    dailyAt: string
    actionType: string
    actionConfig: Record<string, unknown>
    isActive: boolean
  }>): Promise<CronJob | null> {
    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) update.name = data.name
    if (data.description !== undefined) update.description = data.description
    if (data.interval !== undefined) update.interval = data.interval
    if (data.dailyAt !== undefined) update.dailyAt = data.dailyAt
    if (data.actionType !== undefined) update.actionType = data.actionType
    if (data.actionConfig !== undefined) update.actionConfig = data.actionConfig
    if (data.isActive !== undefined) {
      update.isActive = data.isActive
      if (data.isActive) {
        update.nextRunAt = calculateNextRun(data.interval || '60min', data.dailyAt)
      } else {
        update.nextRunAt = null
      }
    }
    // Recalculate next run if interval changed
    if (data.interval !== undefined && data.isActive !== false) {
      update.nextRunAt = calculateNextRun(data.interval, data.dailyAt)
    }

    const [job] = await db.update(cronJobs).set(update).where(eq(cronJobs.id, id)).returning()
    return job ?? null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(cronJobs).where(eq(cronJobs.id, id)).returning({ id: cronJobs.id })
    return result.length > 0
  },

  /**
   * Execute a single cron job and log to task_queue
   */
  async executeJob(job: CronJob): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now()

    // Mark as running
    await db.update(cronJobs).set({
      lastRunStatus: 'running',
      lastRunAt: new Date(),
    }).where(eq(cronJobs.id, job.id))

    try {
      let result: string = 'OK'

      switch (job.actionType) {
        case 'email_sync': {
          const { EmailImapService } = await import('./email-imap.service')
          const syncResult = await EmailImapService.syncAll()
          result = `Synced ${syncResult.length} accounts`
          break
        }
        case 'workflow': {
          const config = (job.actionConfig || {}) as Record<string, unknown>
          const trigger = (config.trigger as string) || 'cron.triggered'
          const { WorkflowEngine } = await import('./workflow')
          // Find tenant for workflow (use first active)
          const { tenants } = await import('@/lib/db/schema')
          const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.status, 'active')).limit(1)
          if (tenant) {
            await WorkflowEngine.fire(trigger, tenant.id, { cronJobId: job.id, cronJobName: job.name })
            result = `Workflow trigger "${trigger}" fired`
          } else {
            result = 'No active tenant found'
          }
          break
        }
        case 'api_call': {
          const config = (job.actionConfig || {}) as Record<string, unknown>
          const url = config.url as string
          const method = (config.method as string) || 'GET'
          if (!url) throw new Error('No URL configured')
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
          const res = await fetch(fullUrl, { method, headers: config.headers as Record<string, string> || {} })
          result = `${method} ${url} → ${res.status}`
          break
        }
        default:
          result = `Unknown action type: ${job.actionType}`
      }

      const durationMs = Date.now() - startTime

      // Log to task_queue
      const { tenants } = await import('@/lib/db/schema')
      const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.status, 'active')).limit(1)
      if (tenant) {
        await db.insert(taskQueue).values({
          tenantId: tenant.id,
          type: 'cron',
          status: 'completed',
          priority: 3,
          payload: { cronJobId: job.id, cronJobName: job.name, actionType: job.actionType, result },
          result: { success: true, durationMs, result },
          executedAt: new Date(),
          referenceType: 'cron_job',
          referenceId: job.id,
        })
      }

      // Update job status + next run
      await db.update(cronJobs).set({
        lastRunStatus: 'success',
        lastRunError: null,
        nextRunAt: calculateNextRun(job.interval, job.dailyAt),
        runCount: (job.runCount || 0) + 1,
        updatedAt: new Date(),
      }).where(eq(cronJobs.id, job.id))

      logger.info(`Cron "${job.name}" completed in ${durationMs}ms: ${result}`, { module: 'CronService' })
      return { success: true }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const durationMs = Date.now() - startTime

      // Log failure to task_queue
      const { tenants } = await import('@/lib/db/schema')
      const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.status, 'active')).limit(1)
      if (tenant) {
        await db.insert(taskQueue).values({
          tenantId: tenant.id,
          type: 'cron',
          status: 'failed',
          priority: 3,
          payload: { cronJobId: job.id, cronJobName: job.name, actionType: job.actionType },
          error: errorMsg,
          executedAt: new Date(),
          referenceType: 'cron_job',
          referenceId: job.id,
        })
      }

      await db.update(cronJobs).set({
        lastRunStatus: 'failed',
        lastRunError: errorMsg,
        nextRunAt: calculateNextRun(job.interval, job.dailyAt),
        runCount: (job.runCount || 0) + 1,
        updatedAt: new Date(),
      }).where(eq(cronJobs.id, job.id))

      logger.error(`Cron "${job.name}" failed after ${durationMs}ms: ${errorMsg}`, error, { module: 'CronService' })
      return { success: false, error: errorMsg }
    }
  },

  /**
   * Check and run all due jobs (called by cron tick endpoint)
   */
  async tick(): Promise<{ executed: number; failed: number }> {
    const now = new Date()
    const dueJobs = await db
      .select()
      .from(cronJobs)
      .where(and(
        eq(cronJobs.isActive, true),
        lte(cronJobs.nextRunAt, now),
      ))
      .orderBy(asc(cronJobs.nextRunAt))

    let executed = 0
    let failed = 0

    for (const job of dueJobs) {
      const result = await this.executeJob(job)
      if (result.success) executed++
      else failed++
    }

    if (dueJobs.length > 0) {
      logger.info(`Cron tick: ${executed} OK, ${failed} failed out of ${dueJobs.length} due`, { module: 'CronService' })
    }

    return { executed, failed }
  },
}
