import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { z } from 'zod'
import {
  VoicePromptTemplateService,
  isValidVoiceTemplateSlug,
} from '@/lib/services/voice-prompt-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

const createSchema = z.object({
  agentKey: z.string().min(1).max(50),
  slug: z.string().min(1).max(120).refine(isValidVoiceTemplateSlug, {
    message: 'Slug darf nur a-z, 0-9 und Bindestriche enthalten.',
  }),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  systemPrompt: z.string().min(1).max(50000),
  greeting: z.string().min(1).max(50000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'settings', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const agentKey = searchParams.get('agentKey') ?? undefined
      const onlyActive = searchParams.get('onlyActive') === 'true'
      const templates = await VoicePromptTemplateService.list({ agentKey, onlyActive })
      return apiSuccess(templates)
    } catch (error) {
      logger.error('Voice templates list failed', error, { module: 'VoiceTemplatesAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async () => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const tpl = await VoicePromptTemplateService.create(validation.data)
      return apiSuccess(tpl, undefined, 201)
    } catch (error) {
      logger.error('Voice template create failed', error, { module: 'VoiceTemplatesAPI' })
      const message = error instanceof Error ? error.message : 'Speichern fehlgeschlagen'
      return apiServerError(message)
    }
  })
}
