import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// POST /api/v1/task-queue/execute - Execute tasks
export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async (auth) => {
    try {
      const body = await request.json()

      // Execute specific IDs or all pending
      if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
        const result = await TaskQueueService.executeBatch(auth.tenantId, body.ids)
        logger.info(`Task batch executed: ${result.completed} completed, ${result.failed} failed`, { module: 'TaskQueueAPI' })
        return apiSuccess(result)
      }

      if (body.all === true) {
        const result = await TaskQueueService.executeAllPending(auth.tenantId)
        logger.info(`All pending tasks executed: ${result.completed} completed, ${result.failed} failed`, { module: 'TaskQueueAPI' })
        return apiSuccess(result)
      }

      // Execute single
      if (body.id) {
        const item = await TaskQueueService.execute(auth.tenantId, body.id)
        if (!item) return apiError('NOT_FOUND', 'Task nicht gefunden oder bereits ausgefuehrt', 404)
        return apiSuccess(item)
      }

      return apiError('BAD_REQUEST', 'ids[], id oder all=true erwartet', 400)
    } catch (error) {
      logger.error('Task execution error', error, { module: 'TaskQueueAPI' })
      return apiServerError()
    }
  })
}
