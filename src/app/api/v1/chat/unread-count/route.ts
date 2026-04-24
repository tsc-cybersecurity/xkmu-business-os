import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { PortalChatService } from '@/lib/services/portal-chat.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'users', 'read', async () => {
    try {
      const unread = await PortalChatService.unreadCountForAdmin()
      return apiSuccess({ unread })
    } catch (error) {
      logger.error('Failed to get admin unread count', error, { module: 'AdminChatAPI' })
      return apiError('COUNT_FAILED', 'Fehler beim Abrufen', 500)
    }
  })
}
