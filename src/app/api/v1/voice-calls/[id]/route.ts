import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { VoiceCallService } from '@/lib/services/voice-call.service'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'settings', 'read', async () => {
    try {
      const { id } = await params
      const result = await VoiceCallService.getById(id)
      if (!result) return apiNotFound('Call nicht gefunden')
      return apiSuccess(result)
    } catch (error) {
      logger.error('Voice call get failed', error, { module: 'VoiceCallsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'settings', 'delete', async () => {
    const { id } = await params
    const deleted = await VoiceCallService.delete(id)
    if (!deleted) return apiNotFound('Call nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
