import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { createWebhookSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { WebhookService } from '@/lib/services/webhook.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function GET(request: NextRequest) {
  return withPermission(request, 'webhooks', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const result = await WebhookService.list(pagination)
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'webhooks', 'create', async (auth) => {
    try {
      const body = await request.json()
      logger.info('Webhook create request', { module: 'WebhooksAPI' })
      const validation = validateAndParse(createWebhookSchema, body)
      if (!validation.success) {
        logger.error('Webhook validation errors', JSON.stringify(validation.errors), { module: 'WebhooksAPI' })
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const webhook = await WebhookService.create(validation.data)
      return apiSuccess(webhook, undefined, 201)
    } catch (error) {
      logger.error('Error creating webhook', error, { module: 'WebhooksAPI' })
      return apiServerError()
    }
  })
}
