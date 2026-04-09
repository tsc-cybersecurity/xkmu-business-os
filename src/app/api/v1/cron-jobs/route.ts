import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { CronService } from '@/lib/services/cron.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    const items = await CronService.list()
    return apiSuccess(items)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'create', async (auth) => {
    try {
      const body = await request.json()
      const job = await CronService.create({
        name: body.name,
        description: body.description,
        interval: body.interval,
        dailyAt: body.dailyAt,
        actionType: body.actionType,
        actionConfig: body.actionConfig,
        isActive: body.isActive,
        createdBy: auth.userId ?? undefined,
      })
      return apiSuccess(job, undefined, 201)
    } catch (error) {
      logger.error('Failed to create cron job', error, { module: 'CronJobsAPI' })
      return apiError('CREATE_FAILED', 'Cron-Job konnte nicht erstellt werden', 500)
    }
  })
}
