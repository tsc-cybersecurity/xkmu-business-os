import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createWebhookSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { WebhookService } from '@/lib/services/webhook.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

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

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const pagination = parsePaginationParams(searchParams)
  const result = await WebhookService.list(auth.tenantId, pagination)
  return apiSuccess(result.items, result.meta)
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

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
}
