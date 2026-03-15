import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { KieService } from '@/lib/services/ai/kie.service'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/kie/status/[taskId] - Video-Generierung Status abfragen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return withPermission(request, 'ai_providers', 'read', async (auth) => {
    try {
      const { taskId } = await params

      if (!taskId) {
        return apiError('VALIDATION_ERROR', 'taskId ist erforderlich', 400)
      }

      const result = await KieService.getTaskStatus(auth.tenantId, taskId)

      return apiSuccess(result)
    } catch (error) {
      logger.error('Failed to get task status', error, { module: 'KieStatusAPI' })
      const message = error instanceof Error ? error.message : 'Fehler beim Abrufen des Status'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}
