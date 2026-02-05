import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
} from '@/lib/utils/api-response'
import { ApiKeyService } from '@/lib/services/api-key.service'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export async function GET() {
  const session = await getSession()
  if (!session) {
    return apiUnauthorized()
  }

  // Only admin and owner can view API keys
  if (!['owner', 'admin'].includes(session.user.role)) {
    return apiForbidden('Insufficient permissions')
  }

  const apiKeys = await ApiKeyService.list(session.user.tenantId)

  // Never return the key hash
  const safeApiKeys = apiKeys.map(({ keyHash, ...rest }) => rest)

  return apiSuccess(safeApiKeys)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return apiUnauthorized()
  }

  // Only admin and owner can create API keys
  if (!['owner', 'admin'].includes(session.user.role)) {
    return apiForbidden('Insufficient permissions')
  }

  try {
    const body = await request.json()
    const validation = createApiKeySchema.safeParse(body)

    if (!validation.success) {
      return apiValidationError(
        validation.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const apiKey = await ApiKeyService.create(
      session.user.tenantId,
      {
        name: validation.data.name,
        permissions: validation.data.permissions,
        expiresAt: validation.data.expiresAt
          ? new Date(validation.data.expiresAt)
          : null,
      },
      session.user.id
    )

    // Return the raw key only once - it cannot be retrieved later
    const { keyHash, ...safeApiKey } = apiKey

    return apiSuccess(safeApiKey, undefined, 201)
  } catch (error) {
    console.error('Create API key error:', error)
    return apiError('CREATE_FAILED', 'Failed to create API key', 500)
  }
}
