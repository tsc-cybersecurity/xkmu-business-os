import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { VoiceAgentService, VoiceAgentNotConfiguredError } from '@/lib/services/voice-agent.service'
import { logger } from '@/lib/utils/logger'
import { normalizeToE164 } from '@/lib/utils/phone'
import { z } from 'zod'

// Phone-Feld nimmt jede plausible Schreibweise an — Normalisierung
// passiert serverseitig zu E.164 (defense-in-depth: das Frontend
// normalisiert auch, aber falls ein anderer Client ruft, wollen wir
// keine Twilio-Kosten fuer kaputte Inputs.)
const dispatchSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(4).max(30),
  context: z.string().max(2000).optional(),
  // Pro-Call Prompt-Overrides — wenn leer/fehlend, faellt der Agent auf
  // den global gepflegten Prompt aus /api/admin/prompts zurueck.
  system_prompt_override: z.string().max(50000).optional(),
  greeting_override: z.string().max(50000).optional(),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async () => {
    try {
      const body = await request.json()
      const validation = validateAndParse(dispatchSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const normalizedPhone = normalizeToE164(validation.data.phone)
      if (!normalizedPhone) {
        return apiError(
          'VALIDATION_ERROR',
          'Telefonnummer ungueltig — bitte als 0172... oder +49172... eingeben.',
          400
        )
      }
      const data = await VoiceAgentService.dispatchCall({
        name: validation.data.name,
        phone: normalizedPhone,
        context: validation.data.context,
        system_prompt_override: validation.data.system_prompt_override?.trim() || undefined,
        greeting_override: validation.data.greeting_override?.trim() || undefined,
      })
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
