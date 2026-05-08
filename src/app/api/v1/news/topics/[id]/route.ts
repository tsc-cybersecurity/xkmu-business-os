import { NextRequest } from 'next/server'
import {
  apiSuccess, apiNotFound, apiValidationError, apiServerError,
} from '@/lib/utils/api-response'
import { updateNewsTopicSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'read', async () => {
    const { id } = await params
    const topic = await NewsService.getTopic(id)
    if (!topic) return apiNotFound('Topic nicht gefunden')
    return apiSuccess(topic)
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateNewsTopicSchema, body)
      if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))
      const topic = await NewsService.updateTopic(id, validation.data)
      if (!topic) return apiNotFound('Topic nicht gefunden')
      return apiSuccess(topic)
    } catch (err) {
      logger.error('Error updating news topic', err, { module: 'NewsTopicsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'delete', async () => {
    const { id } = await params
    const ok = await NewsService.deleteTopic(id)
    if (!ok) return apiNotFound('Topic nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
