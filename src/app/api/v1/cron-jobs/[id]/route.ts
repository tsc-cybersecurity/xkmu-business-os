import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { CronService } from '@/lib/services/cron.service'
import { logger } from '@/lib/utils/logger'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'read', async () => {
    const { id } = await params
    const job = await CronService.getById(id)
    if (!job) return apiError('NOT_FOUND', 'Cron-Job nicht gefunden', 404)
    return apiSuccess(job)
  })
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const job = await CronService.update(id, {
        name: body.name,
        description: body.description,
        interval: body.interval,
        dailyAt: body.dailyAt,
        actionType: body.actionType,
        actionConfig: body.actionConfig,
        isActive: body.isActive,
      })
      if (!job) return apiError('NOT_FOUND', 'Cron-Job nicht gefunden', 404)
      return apiSuccess(job)
    } catch (error) {
      logger.error('Failed to update cron job', error, { module: 'CronJobsAPI' })
      return apiError('UPDATE_FAILED', 'Cron-Job konnte nicht aktualisiert werden', 500)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'settings', 'delete', async () => {
    const { id } = await params
    const deleted = await CronService.delete(id)
    if (!deleted) return apiError('NOT_FOUND', 'Cron-Job nicht gefunden', 404)
    return apiSuccess({ deleted: true })
  })
}
