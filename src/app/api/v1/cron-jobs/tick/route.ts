import { CronService } from '@/lib/services/cron.service'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const result = await CronService.tick()
    return apiSuccess(result)
  } catch (error) {
    logger.error('Cron tick failed', error, { module: 'CronTick' })
    return apiError('TICK_FAILED', 'Cron-Tick fehlgeschlagen', 500)
  }
}
