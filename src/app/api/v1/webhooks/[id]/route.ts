import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateWebhookSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { WebhookService } from '@/lib/services/webhook.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'webhooks', 'read', async (auth) => {
    const { id } = await params
    const webhook = await WebhookService.getById(TENANT_ID, id)
    if (!webhook) return apiNotFound('Webhook nicht gefunden')

    return apiSuccess(webhook)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'webhooks', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateWebhookSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const webhook = await WebhookService.update(TENANT_ID, id, validation.data)
      if (!webhook) return apiNotFound('Webhook nicht gefunden')

      return apiSuccess(webhook)
    } catch (error) {
      logger.error('Error updating webhook', error, { module: 'WebhooksAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'webhooks', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await WebhookService.delete(TENANT_ID, id)
    if (!deleted) return apiNotFound('Webhook nicht gefunden')

    return apiSuccess({ deleted: true })
  })
}
