import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { createNewsTopicSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'news', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const items = await NewsService.listTopics({ activeOnly })
    return apiSuccess(items)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'news', 'create', async () => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createNewsTopicSchema, body)
      if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))
      const topic = await NewsService.createTopic(validation.data)
      return apiSuccess(topic, undefined, 201)
    } catch (err) {
      logger.error('Error creating news topic', err, { module: 'NewsTopicsAPI' })
      return apiServerError()
    }
  })
}
