import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createWebhookSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { WebhookService } from '@/lib/services/webhook.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'webhooks', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const result = await WebhookService.list(auth.tenantId, pagination)
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'webhooks', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createWebhookSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const webhook = await WebhookService.create(auth.tenantId, validation.data)
      return apiSuccess(webhook, undefined, 201)
    } catch (error) {
      console.error('Error creating webhook:', error)
      return apiServerError()
    }
  })
}
