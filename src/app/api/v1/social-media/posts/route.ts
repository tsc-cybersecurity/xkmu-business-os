import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createSocialMediaPostSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { SocialMediaPostService } from '@/lib/services/social-media-post.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const platform = searchParams.get('platform') || undefined
    const status = searchParams.get('status') || undefined
    const topicId = searchParams.get('topicId') || undefined

    const result = await SocialMediaPostService.list(auth.tenantId, {
      ...pagination,
      platform,
      status,
      topicId,
    })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'social_media', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createSocialMediaPostSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const post = await SocialMediaPostService.create(auth.tenantId, validation.data, auth.userId ?? undefined)
      return apiSuccess(post, undefined, 201)
    } catch (error) {
      logger.error('Error creating social media post', error, { module: 'SocialMediaPostsAPI' })
      return apiServerError()
    }
  })
}
