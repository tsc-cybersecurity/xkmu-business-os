import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { PortalChatService } from '@/lib/services/portal-chat.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const unread = await PortalChatService.unreadCountForPortal(auth.companyId)
      return apiSuccess({ unread })
    } catch (error) {
      logger.error('Failed to get portal unread count', error, { module: 'PortalChatAPI' })
      return apiError('COUNT_FAILED', 'Fehler beim Abrufen', 500)
    }
  })
}
