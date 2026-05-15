import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { VoiceAgentService, VoiceAgentNotConfiguredError } from '@/lib/services/voice-agent.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    try {
      const data = await VoiceAgentService.getStatus()
      return apiSuccess(data)
    } catch (error) {
      if (error instanceof VoiceAgentNotConfiguredError) {
        return apiError('NOT_CONFIGURED', error.message, 412)
      }
      logger.error('Voice status failed', error, { module: 'VoiceAgentAPI' })
      return apiServerError(error instanceof Error ? error.message : undefined)
    }
  })
}
