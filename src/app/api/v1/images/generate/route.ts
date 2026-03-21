import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { ImageGenerationService } from '@/lib/services/ai/image-generation.service'
import { logger } from '@/lib/utils/logger'

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt ist erforderlich').max(4000),
  provider: z.enum(['openai', 'kie']).default('kie'),
  model: z.string().max(100).optional(),
  size: z.string().max(30).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
  category: z.enum(['social_media', 'website', 'blog', 'marketing', 'general']).default('general'),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'media', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(generateSchema, body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', 'Validierungsfehler', 400, formatZodErrors(validation.errors))
      }

      const result = await ImageGenerationService.generate(
        auth.tenantId,
        auth.userId,
        validation.data
      )

      return apiSuccess(result, undefined, 201)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
      logger.error('Image generation failed', error, { module: 'ImagesAPI' })

      if (message.includes('API-Key') || message.includes('konfiguriert')) {
        return apiError('PROVIDER_NOT_CONFIGURED', message, 422)
      }
      if (message.includes('fehlgeschlagen') || message.includes('Timeout')) {
        return apiError('GENERATION_FAILED', message, 502)
      }

      return apiError('GENERATION_ERROR', message, 500)
    }
  })
}
