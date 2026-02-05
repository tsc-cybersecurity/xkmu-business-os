import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiNotFound,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateWebhookSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { WebhookService } from '@/lib/services/webhook.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

type Params = Promise<{ id: string }>

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role,
    }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId, userId: null, role: 'api' as const }
    }
  }
  return null
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { id } = await params
  const webhook = await WebhookService.getById(auth.tenantId, id)
  if (!webhook) return apiNotFound('Webhook nicht gefunden')

  return apiSuccess(webhook)
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const { id } = await params
    const body = await request.json()
    const validation = validateAndParse(updateWebhookSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const webhook = await WebhookService.update(auth.tenantId, id, validation.data)
    if (!webhook) return apiNotFound('Webhook nicht gefunden')

    return apiSuccess(webhook)
  } catch (error) {
    console.error('Error updating webhook:', error)
    return apiServerError()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { id } = await params
  const deleted = await WebhookService.delete(auth.tenantId, id)
  if (!deleted) return apiNotFound('Webhook nicht gefunden')

  return apiSuccess({ deleted: true })
}
