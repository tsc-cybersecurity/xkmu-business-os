import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { VoiceAgentService, VoiceAgentNotConfiguredError } from '@/lib/services/voice-agent.service'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

// E.164: + gefolgt von 8-15 Ziffern. Strenge Validierung damit nicht aus
// Versehen Telefonkosten fuer ungueltige Nummern entstehen.
const E164 = /^\+[1-9]\d{7,14}$/

const dispatchSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().regex(E164, 'Telefonnummer muss im E.164-Format sein (z.B. +491701234567).'),
  context: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async () => {
    try {
      const body = await request.json()
      const validation = validateAndParse(dispatchSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const data = await VoiceAgentService.dispatchCall(validation.data)
      return apiSuccess(data)
    } catch (error) {
      if (error instanceof VoiceAgentNotConfiguredError) {
        return apiError('NOT_CONFIGURED', error.message, 412)
      }
      logger.error('Voice dispatch-call failed', error, { module: 'VoiceAgentAPI' })
      return apiServerError(error instanceof Error ? error.message : undefined)
    }
  })
}
