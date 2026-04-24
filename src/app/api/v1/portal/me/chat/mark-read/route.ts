import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { PortalChatService } from '@/lib/services/portal-chat.service'
import { logger } from '@/lib/utils/logger'

export async function PATCH(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const updated = await PortalChatService.markReadByPortal(auth.companyId)
      return apiSuccess({ marked: updated })
    } catch (error) {
      logger.error('Failed to mark portal chat read', error, { module: 'PortalChatAPI' })
      return apiError('MARK_READ_FAILED', 'Fehler beim Markieren', 500)
    }
  })
}
