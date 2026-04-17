import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateSocialMediaTopicSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { SocialMediaTopicService } from '@/lib/services/social-media-topic.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'social_media', 'read', async (auth) => {
    const { id } = await params
    const topic = await SocialMediaTopicService.getById(TENANT_ID, id)
    if (!topic) return apiNotFound('Thema nicht gefunden')
    return apiSuccess(topic)
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
      const validation = validateAndParse(updateSocialMediaTopicSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const topic = await SocialMediaTopicService.update(TENANT_ID, id, validation.data)
      if (!topic) return apiNotFound('Thema nicht gefunden')
      return apiSuccess(topic)
    } catch (error) {
      logger.error('Error updating social media topic', error, { module: 'SocialMediaTopicsAPI' })
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
    const deleted = await SocialMediaTopicService.delete(TENANT_ID, id)
    if (!deleted) return apiNotFound('Thema nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
