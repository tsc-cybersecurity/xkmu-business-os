import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiNotFound,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateIdeaSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { IdeaService } from '@/lib/services/idea.service'
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
  const idea = await IdeaService.getById(auth.tenantId, id)
  if (!idea) return apiNotFound('Idee nicht gefunden')

  return apiSuccess(idea)
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const { id } = await params
    const body = await request.json()
    const validation = validateAndParse(updateIdeaSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const idea = await IdeaService.update(auth.tenantId, id, validation.data)
    if (!idea) return apiNotFound('Idee nicht gefunden')

    return apiSuccess(idea)
  } catch (error) {
    console.error('Error updating idea:', error)
    return apiServerError()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { id } = await params
  const deleted = await IdeaService.delete(auth.tenantId, id)
  if (!deleted) return apiNotFound('Idee nicht gefunden')

  return apiSuccess({ deleted: true })
}
