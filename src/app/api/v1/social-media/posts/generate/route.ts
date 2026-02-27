import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  generateSocialPostSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { SocialMediaAIService } from '@/lib/services/ai/social-media-ai.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(request: NextRequest) {
  return withPermission(request, 'social_media', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(generateSocialPostSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const result = await SocialMediaAIService.generatePost(
        validation.data,
        {
          tenantId: auth.tenantId,
          userId: auth.userId,
          feature: 'social_media',
          entityType: 'social_media_post',
        }
      )

      return apiSuccess(result)
    } catch (error) {
      console.error('Error generating social media post:', error)
      if (error instanceof Error) {
        return apiError('GENERATION_FAILED', error.message, 500)
      }
      return apiServerError()
    }
  })
}
