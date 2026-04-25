/**
 * Workflow Service — Sync zwischen workflows.schedule und cron_jobs.
 */
import { db } from '@/lib/db'
import { workflows, cronJobs } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

interface ScheduleConfig {
  interval: '5min' | '15min' | '30min' | '60min' | 'daily'
  dailyAt?: string
}

export const WorkflowService = {
  /**
   * Bringt cron_jobs in Sync mit dem Schedule des Workflows.
   * - Workflow weg → korrespondierende cron_jobs entfernen.
   * - Workflow aktiv + scheduled → cron_jobs anlegen oder aktualisieren.
   * - Workflow inaktiv oder nicht scheduled → cron_jobs deaktivieren (History bleibt).
   *
   * Best-effort: Fehler werden geloggt, nicht geworfen — HTTP-Save soll
   * trotz Sync-Fehler erfolgreich sein.
   */
  async syncSchedule(workflowId: string): Promise<void> {
    try {
      const [wf] = await db.select().from(workflows).where(eq(workflows.id, workflowId))

      const { CronService } = await import('./cron.service')

      // workflowId-Filter für cron_jobs — verwende JSONB-Operator
      const existingRows = await db.select().from(cronJobs).where(
        and(
          eq(cronJobs.actionType, 'workflow'),
          sql`${cronJobs.actionConfig}->>'workflowId' = ${workflowId}`,
          sql`${cronJobs.actionConfig}->>'direct' = 'true'`,
        ),
      )
      const existing = existingRows[0]

      if (!wf) {
        // Workflow gelöscht — cron_jobs hard-delete
        if (existing) {
          await db.delete(cronJobs).where(eq(cronJobs.id, existing.id))
          logger.info(`Deleted cron_job for removed workflow ${workflowId}`, { module: 'WorkflowService' })
        }
        return
      }

      const schedule = wf.schedule as ScheduleConfig | null
      const isScheduled = wf.trigger === '__scheduled__' && schedule != null && wf.isActive

      if (!isScheduled) {
        if (existing && existing.isActive) {
          await db.update(cronJobs).set({ isActive: false, updatedAt: new Date() })
            .where(eq(cronJobs.id, existing.id))
          logger.info(`Deactivated cron_job for workflow ${workflowId}`, { module: 'WorkflowService' })
        }
        return
      }

      // Schedule-Validierung — defensiv (UI sollte das schon abfangen)
      const validIntervals = ['5min', '15min', '30min', '60min', 'daily']
      if (!validIntervals.includes(schedule.interval)) {
        logger.warn(`Invalid schedule interval "${schedule.interval}" for workflow ${workflowId}`, { module: 'WorkflowService' })
        return
      }
      if (schedule.interval === 'daily' && schedule.dailyAt && !/^\d{2}:\d{2}$/.test(schedule.dailyAt)) {
        logger.warn(`Invalid dailyAt "${schedule.dailyAt}" for workflow ${workflowId}`, { module: 'WorkflowService' })
        return
      }

      const fields = {
        name: `Workflow: ${wf.name}`,
        description: `Auto-managed schedule für Workflow ${wf.id}`,
        interval: schedule.interval,
        dailyAt: schedule.dailyAt ?? null,
        actionType: 'workflow',
        actionConfig: { workflowId, direct: true },
        isActive: true,
      }

      if (existing) {
        // CronService.update kümmert sich um nextRunAt-Recompute
        await CronService.update(existing.id, fields as any)
      } else {
        await CronService.create(fields as any)
      }
    } catch (err) {
      logger.error(`Failed to sync schedule for workflow ${workflowId}`, err, { module: 'WorkflowService' })
    }
  },
}
