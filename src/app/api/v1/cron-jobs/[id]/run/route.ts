import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { CronService } from '@/lib/services/cron.service'
import { logger } from '@/lib/utils/logger'

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'update', async () => {
    try {
      const { id } = await params
      const job = await CronService.getById(id)
      if (!job) return apiError('NOT_FOUND', 'Cron-Job nicht gefunden', 404)

      const result = await CronService.executeJob(job)
      return apiSuccess(result)
    } catch (error) {
      logger.error('Failed to run cron job', error, { module: 'CronJobsAPI' })
      return apiError('RUN_FAILED', 'Cron-Job konnte nicht ausgeführt werden', 500)
    }
  })
}
