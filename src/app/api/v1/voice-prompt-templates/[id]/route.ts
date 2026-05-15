import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { z } from 'zod'
import {
  VoicePromptTemplateService,
  isValidVoiceTemplateSlug,
} from '@/lib/services/voice-prompt-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

const updateSchema = z.object({
  agentKey: z.string().min(1).max(50).optional(),
  slug: z.string().min(1).max(120).refine(isValidVoiceTemplateSlug, {
    message: 'Slug darf nur a-z, 0-9 und Bindestriche enthalten.',
  }).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  systemPrompt: z.string().min(1).max(50000).optional(),
  greeting: z.string().min(1).max(50000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'settings', 'read', async () => {
    const { id } = await params
    const tpl = await VoicePromptTemplateService.getById(id)
    if (!tpl) return apiNotFound('Voice-Vorlage nicht gefunden')
    return apiSuccess(tpl)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'settings', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const tpl = await VoicePromptTemplateService.update(id, validation.data)
      if (!tpl) return apiNotFound('Voice-Vorlage nicht gefunden')
      return apiSuccess(tpl)
    } catch (error) {
      logger.error('Voice template update failed', error, { module: 'VoiceTemplatesAPI' })
      const message = error instanceof Error ? error.message : 'Speichern fehlgeschlagen'
      return apiServerError(message)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'settings', 'delete', async () => {
    const { id } = await params
    const deleted = await VoicePromptTemplateService.delete(id)
    if (!deleted) return apiNotFound('Voice-Vorlage nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
