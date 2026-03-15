import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
} from '@/lib/utils/api-response'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/ai-logs/stats - Aggregierte Statistiken
export async function GET(request: NextRequest) {
  return withPermission(request, 'ai_logs', 'read', async (auth) => {
    try {
      const stats = await AiProviderService.getLogStats(auth.tenantId)
      return apiSuccess(stats)
    } catch (error) {
      logger.error('Failed to get AI log stats', error, { module: 'AiLogsStatsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Statistiken', 500)
    }
  })
}
