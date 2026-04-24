import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { PortalChatService } from '@/lib/services/portal-chat.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'users', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const hasUnreadOnly = searchParams.get('hasUnread') === 'true'
      const rows = await PortalChatService.listCompaniesWithChat(hasUnreadOnly)
      return apiSuccess(rows)
    } catch (error) {
      logger.error('Failed to list chat companies', error, { module: 'AdminChatAPI' })
      return apiError('LIST_FAILED', 'Firmenliste konnte nicht geladen werden', 500)
    }
  })
}
