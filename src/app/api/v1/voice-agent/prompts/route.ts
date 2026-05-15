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

const updateSchema = z.object({
  key: z.enum([
    'simple-latency',
    'appointment-booking',
    'outbound-telephony',
    'inbound-receptionist',
  ] as const),
  system_prompt: z.string().max(50000),
  greeting: z.string().max(50000),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    try {
      const data = await VoiceAgentService.getPrompts()
      return apiSuccess(data)
    } catch (error) {
      if (error instanceof VoiceAgentNotConfiguredError) {
        return apiError('NOT_CONFIGURED', error.message, 412)
      }
      logger.error('Voice prompts get failed', error, { module: 'VoiceAgentAPI' })
      return apiServerError(error instanceof Error ? error.message : undefined)
    }
  })
}

export async function PUT(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async () => {
    try {
      const body = await request.json()
      const validation = validateAndParse(updateSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const data = await VoiceAgentService.updatePrompt(
        validation.data.key as VoiceAgentKey,
        validation.data.system_prompt,
        validation.data.greeting
      )
      return apiSuccess(data)
    } catch (error) {
      if (error instanceof VoiceAgentNotConfiguredError) {
        return apiError('NOT_CONFIGURED', error.message, 412)
      }
      logger.error('Voice prompts put failed', error, { module: 'VoiceAgentAPI' })
      return apiServerError(error instanceof Error ? error.message : undefined)
    }
  })
}
