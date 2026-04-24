import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { PortalChatService } from '@/lib/services/portal-chat.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'read', async () => {
    const { id: companyId } = await params
    try {
      const updated = await PortalChatService.markReadByAdmin(companyId)
      return apiSuccess({ marked: updated })
    } catch (error) {
      logger.error('Failed to mark admin chat read', error, { module: 'AdminChatAPI' })
      return apiError('MARK_READ_FAILED', 'Fehler beim Markieren', 500)
    }
  })
}
