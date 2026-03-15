import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
  apiValidationError,
} from '@/lib/utils/api-response'
import { ApiKeyService } from '@/lib/services/api-key.service'
import { withPermission } from '@/lib/auth/require-permission'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'api_keys', 'read', async (auth) => {
    const apiKeys = await ApiKeyService.list(auth.tenantId)

    // Never return the key hash
    const safeApiKeys = apiKeys.map(({ keyHash, ...rest }) => rest)

    return apiSuccess(safeApiKeys)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'api_keys', 'create', async (auth) => {
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
        auth.tenantId,
        {
          name: validation.data.name,
          permissions: validation.data.permissions,
          expiresAt: validation.data.expiresAt
            ? new Date(validation.data.expiresAt)
            : null,
        },
        auth.userId!
      )

      // Return the raw key only once - it cannot be retrieved later
      const { keyHash, ...safeApiKey } = apiKey

      return apiSuccess(safeApiKey, undefined, 201)
    } catch (error) {
      logger.error('Create API key error', error, { module: 'ApiKeysAPI' })
      return apiError('CREATE_FAILED', 'Failed to create API key', 500)
    }
  })
}
