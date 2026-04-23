import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'settings', 'update', async () => {
    const { id } = await params
    try {
      const item = await TaskQueueService.retry(id)
      if (!item) {
        return apiNotFound('Task nicht gefunden oder nicht im Fehler-Status')
      }
      logger.info(`Task ${id} reset to pending for retry`, { module: 'TaskQueueAPI' })
      return apiSuccess({ id: item.id, status: item.status })
    } catch (error) {
      logger.error('Task-Queue retry failed', error, { module: 'TaskQueueAPI' })
      return apiError('RETRY_FAILED', 'Retry fehlgeschlagen', 500)
    }
  })
}
