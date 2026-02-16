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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'social_media', 'read', async (auth) => {
    const { id } = await params
    const topic = await SocialMediaTopicService.getById(auth.tenantId, id)
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

      const topic = await SocialMediaTopicService.update(auth.tenantId, id, validation.data)
      if (!topic) return apiNotFound('Thema nicht gefunden')
      return apiSuccess(topic)
    } catch (error) {
      console.error('Error updating social media topic:', error)
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
    const deleted = await SocialMediaTopicService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Thema nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
