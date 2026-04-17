import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  generateContentPlanSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { SocialMediaAIService } from '@/lib/services/ai/social-media-ai.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function POST(request: NextRequest) {
  return withPermission(request, 'social_media', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(generateContentPlanSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const result = await SocialMediaAIService.generateContentPlan(
        validation.data,
        {
          userId: auth.userId,
          feature: 'social_media',
          entityType: 'social_media_post',
        }
      )

      return apiSuccess(result)
    } catch (error) {
      logger.error('Error generating content plan', error, { module: 'SocialMediaPostsGeneratePlanAPI' })
      if (error instanceof Error) {
        return apiError('GENERATION_FAILED', error.message, 500)
      }
      return apiServerError()
    }
  })
}
