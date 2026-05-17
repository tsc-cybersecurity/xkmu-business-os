import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  return withPermission(request, 'news', 'update', async (auth) => {
    try {
      const summary = await NewsService.runResearchForAllActiveTopics()
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'news.research.all',
        entityType: 'news',
        entityId: null,
        payload: { summary } as unknown as Record<string, unknown>,
        request,
      })
      return apiSuccess({ summary })
    } catch (err) {
      logger.error('news global research failed', err, { module: 'NewsResearchAPI' })
      return apiServerError(err instanceof Error ? err.message : undefined)
    }
  })
}
