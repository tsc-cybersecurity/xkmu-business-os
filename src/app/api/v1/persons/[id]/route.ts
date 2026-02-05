import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updatePersonSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { PersonService } from '@/lib/services/person.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

type Params = Promise<{ id: string }>

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
    }
  }

  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return {
        tenantId: payload.tenantId,
        userId: null,
      }
    }
  }

  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { id } = await params
  const person = await PersonService.getById(auth.tenantId, id)

  if (!person) {
    return apiNotFound('Person not found')
  }

  return apiSuccess(person)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { id } = await params

  try {
    const body = await request.json()

    const validation = validateAndParse(updatePersonSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const person = await PersonService.update(auth.tenantId, id, validation.data)

    if (!person) {
      return apiNotFound('Person not found')
    }

    return apiSuccess(person)
  } catch (error) {
    console.error('Update person error:', error)
    return apiError('UPDATE_FAILED', 'Failed to update person', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { id } = await params
  const deleted = await PersonService.delete(auth.tenantId, id)

  if (!deleted) {
    return apiNotFound('Person not found')
  }

  return apiSuccess({ message: 'Person deleted successfully' })
}
