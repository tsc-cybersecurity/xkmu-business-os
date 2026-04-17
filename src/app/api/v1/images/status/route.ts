import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { ImageGenerationService } from '@/lib/services/ai/image-generation.service'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

const statusSchema = z.object({
  taskId: z.string().min(1),
  prompt: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'media', 'read', async (auth) => {
    try {
      const body = await request.json()
      const { taskId, prompt, model, category } = statusSchema.parse(body)

      const result = await ImageGenerationService.checkTaskStatus(
        TENANT_ID,
        taskId,
        { prompt, model, category }
      )
      return apiSuccess(result)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      logger.error('Image status check failed', error, { module: 'ImagesAPI' })
      return apiError('STATUS_ERROR', msg, 500)
    }
  })
}
