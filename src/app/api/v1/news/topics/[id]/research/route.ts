import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'update', async (auth) => {
    try {
      const { id } = await params
      const topic = await NewsService.getTopic(id)
      if (!topic) return apiNotFound('Topic nicht gefunden')

      const result = await NewsService.runResearchForTopic(id)
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'news.topic.research',
        entityType: 'news_topic',
        entityId: id,
        payload: result as unknown as Record<string, unknown>,
        request,
      })
      return apiSuccess(result)
    } catch (err) {
      logger.error('news topic research failed', err, { module: 'NewsResearchAPI' })
      return apiServerError()
    }
  })
}
