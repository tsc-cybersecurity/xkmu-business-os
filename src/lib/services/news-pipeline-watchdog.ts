import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

/**
 * Repariert news_items, deren Worker-Task im task_queue bereits failed ist,
 * deren pipeline_status aber noch auf einem nicht-terminalen Wert hängt.
 */
export async function runWatchdog(): Promise<{ reaped: number }> {
  try {
    const result = await db.execute(sql`
      UPDATE news_items
      SET pipeline_status = 'failed',
          pipeline_error = COALESCE(pipeline_error, 'worker terminated'),
          updated_at = NOW()
      WHERE pipeline_status IN ('queued','researching','generating')
        AND pipeline_task_id IN (
          SELECT id FROM task_queue WHERE status = 'failed'
        )
    `)
    const reaped = (result as { rowCount?: number }).rowCount ?? 0
    if (reaped > 0) {
      logger.info(`news pipeline watchdog reaped ${reaped} stuck items`, {
        module: 'NewsPipelineWatchdog',
      })
    }
    return { reaped }
  } catch (err) {
    logger.error('news pipeline watchdog failed', err, { module: 'NewsPipelineWatchdog' })
    return { reaped: 0 }
  }
}
