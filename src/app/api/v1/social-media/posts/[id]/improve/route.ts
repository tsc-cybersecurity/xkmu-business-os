import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  improveSocialPostSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { SocialMediaPostService } from '@/lib/services/social-media-post.service'
import { SocialMediaAIService } from '@/lib/services/ai/social-media-ai.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    try {
      const { id } = await params
      const post = await SocialMediaPostService.getById(auth.tenantId, id)
      if (!post) return apiNotFound('Beitrag nicht gefunden')

      const body = await request.json()
      const validation = validateAndParse(improveSocialPostSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const result = await SocialMediaAIService.improvePost(
        {
          currentContent: post.content,
          platform: post.platform,
          instructions: validation.data.instructions,
        },
        {
          tenantId: auth.tenantId,
          userId: auth.userId,
          feature: 'social_media',
          entityType: 'social_media_post',
          entityId: id,
        }
      )

      return apiSuccess(result)
    } catch (error) {
      logger.error('Error improving social media post', error, { module: 'SocialMediaPostsImproveAPI' })
      if (error instanceof Error) {
        return apiError('IMPROVEMENT_FAILED', error.message, 500)
      }
      return apiServerError()
    }
  })
}
