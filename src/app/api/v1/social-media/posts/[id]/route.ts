import { NextRequest } from 'next/server'
import { apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import { updateSocialMediaPostSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { SocialMediaPostService } from '@/lib/services/social-media-post.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'social_media', 'read', async (auth) => {
    const { id } = await params
    const post = await SocialMediaPostService.getById(id)
    if (!post) return apiNotFound('Beitrag nicht gefunden')
    return apiSuccess(post)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'social_media', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateSocialMediaPostSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const post = await SocialMediaPostService.update(id, validation.data)
      if (!post) return apiNotFound('Beitrag nicht gefunden')
      return apiSuccess(post)
    } catch (error) {
      logger.error('Error updating social media post', error, { module: 'SocialMediaPostsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'social_media', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await SocialMediaPostService.delete(id)
    if (!deleted) return apiNotFound('Beitrag nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
