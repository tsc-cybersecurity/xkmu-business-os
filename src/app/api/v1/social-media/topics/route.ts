import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  createSocialMediaTopicSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { SocialMediaTopicService } from '@/lib/services/social-media-topic.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'social_media', 'read', async (auth) => {
    const topics = await SocialMediaTopicService.list(auth.tenantId)
    return apiSuccess(topics)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'social_media', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createSocialMediaTopicSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const topic = await SocialMediaTopicService.create(auth.tenantId, validation.data)
      return apiSuccess(topic, undefined, 201)
    } catch (error) {
      console.error('Error creating social media topic:', error)
      return apiServerError()
    }
  })
}
