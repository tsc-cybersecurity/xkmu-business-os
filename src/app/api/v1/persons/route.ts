import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createPersonSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { PersonService } from '@/lib/services/person.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

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

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  const { searchParams } = new URL(request.url)
  const pagination = parsePaginationParams(searchParams)
  const companyId = searchParams.get('companyId') || undefined
  const status = searchParams.get('status') || undefined
  const search = searchParams.get('search') || undefined
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined

  const result = await PersonService.list(auth.tenantId, {
    ...pagination,
    companyId,
    status,
    search,
    tags,
  })

  return apiSuccess(result.items, result.meta)
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  try {
    const body = await request.json()

    const validation = validateAndParse(createPersonSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const person = await PersonService.create(
      auth.tenantId,
      validation.data,
      auth.userId || undefined
    )

    return apiSuccess(person, undefined, 201)
  } catch (error) {
    console.error('Create person error:', error)
    return apiError('CREATE_FAILED', 'Failed to create person', 500)
  }
}
