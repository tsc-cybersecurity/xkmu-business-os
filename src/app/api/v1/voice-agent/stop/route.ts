import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import {
  VoiceAgentService,
  VoiceAgentNotConfiguredError,
  type VoiceAgentKey,
} from '@/lib/services/voice-agent.service'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const stopSchema = z.object({
  name: z.enum([
    'simple-latency',
    'appointment-booking',
    'outbound-telephony',
    'inbound-receptionist',
  ] as const),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async () => {
    try {
      const body = await request.json()
      const validation = validateAndParse(stopSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const data = await VoiceAgentService.stopAgent(validation.data.name as VoiceAgentKey)
      return apiSuccess(data)
    } catch (error) {
      if (error instanceof VoiceAgentNotConfiguredError) {
        return apiError('NOT_CONFIGURED', error.message, 412)
      }
      logger.error('Voice stop failed', error, { module: 'VoiceAgentAPI' })
      return apiServerError(error instanceof Error ? error.message : undefined)
    }
  })
}
