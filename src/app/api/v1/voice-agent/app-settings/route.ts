import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { z } from 'zod'
import { withPermission } from '@/lib/auth/require-permission'
import { VoiceAppSettingsService } from '@/lib/services/voice-app-settings.service'
import { logger } from '@/lib/utils/logger'

const updateSchema = z.object({
  callerName: z.string().min(1).max(80).optional(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    try {
      const settings = await VoiceAppSettingsService.get()
      return apiSuccess(settings)
    } catch (error) {
      logger.error('Voice app-settings get failed', error, { module: 'VoiceAppSettingsAPI' })
      return apiServerError()
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
      const settings = await VoiceAppSettingsService.update(validation.data)
      return apiSuccess(settings)
    } catch (error) {
      logger.error('Voice app-settings put failed', error, { module: 'VoiceAppSettingsAPI' })
      return apiServerError()
    }
  })
}
