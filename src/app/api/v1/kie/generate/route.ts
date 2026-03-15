import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { KieService } from '@/lib/services/ai/kie.service'
import { logger } from '@/lib/utils/logger'

// POST /api/v1/kie/generate - Video-Generierung starten
export async function POST(request: NextRequest) {
  return withPermission(request, 'ai_providers', 'create', async (auth) => {
    try {
      const body = await request.json()

      if (!body.prompt) {
        return apiError('VALIDATION_ERROR', 'prompt ist erforderlich', 400)
      }

      const result = await KieService.createVideoTask(
        auth.tenantId,
        auth.userId || null,
        {
          prompt: body.prompt,
          model: body.model,
          aspectRatio: body.aspectRatio,
          mode: body.mode,
          sound: body.sound,
          multiShots: body.multiShots,
          imageUrls: body.imageUrls,
        }
      )

      return apiSuccess(result, undefined, 201)
    } catch (error) {
      logger.error('Failed to generate video', error, { module: 'KieGenerateAPI' })
      const message = error instanceof Error ? error.message : 'Fehler bei der Video-Generierung'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}
