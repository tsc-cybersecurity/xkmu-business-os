import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createActivitySchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { ActivityService } from '@/lib/services/activity.service'
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
  const leadId = searchParams.get('leadId') || undefined
  const companyId = searchParams.get('companyId') || undefined
  const personId = searchParams.get('personId') || undefined
  const type = searchParams.get('type') || undefined

  const result = await ActivityService.list(auth.tenantId, {
    ...pagination,
    leadId,
    companyId,
    personId,
    type,
  })

  return apiSuccess(result.items, result.meta)
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const body = await request.json()
    const validation = validateAndParse(createActivitySchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const activity = await ActivityService.create(auth.tenantId, validation.data, auth.userId)
    return apiSuccess(activity, undefined, 201)
  } catch (error) {
    console.error('Error creating activity:', error)
    return apiServerError()
  }
}
