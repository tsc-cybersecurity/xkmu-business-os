import { NextRequest } from 'next/server'
import { apiSuccess,
  apiError,
} from '@/lib/utils/api-response'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
// GET /api/v1/ai-logs - Logs mit Filtern auflisten
export async function GET(request: NextRequest) {
  return withPermission(request, 'ai_logs', 'read', async (auth) => {
    try {
      const { searchParams } = new URL(request.url)

      const result = await AiProviderService.listLogs({
        providerType: searchParams.get('providerType') || undefined,
        status: searchParams.get('status') || undefined,
        feature: searchParams.get('feature') || undefined,
        search: searchParams.get('search') || undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
        page: parseInt(searchParams.get('page') || '1', 10),
        limit: Math.min(parseInt(searchParams.get('limit') || '50', 10), 100),
      })

      return apiSuccess(result.items, result.meta)
    } catch (error) {
      logger.error('Failed to list AI logs', error, { module: 'AiLogsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der KI-Logs', 500)
    }
  })
}
