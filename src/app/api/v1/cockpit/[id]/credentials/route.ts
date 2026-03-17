import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  cockpitCredentialSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CockpitService } from '@/lib/services/cockpit.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'cockpit', 'read', async (auth) => {
    const { id } = await params

    // Verify the system belongs to this tenant
    const system = await CockpitService.getById(auth.tenantId, id)
    if (!system) {
      return apiNotFound('System not found')
    }

    const credentials = await CockpitService.getCredentials(id)
    return apiSuccess(credentials)
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'cockpit', 'create', async (auth) => {
    const { id } = await params

    try {
      // Verify the system belongs to this tenant
      const system = await CockpitService.getById(auth.tenantId, id)
      if (!system) {
        return apiNotFound('System not found')
      }

      const body = await request.json()

      const validation = validateAndParse(cockpitCredentialSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const credential = await CockpitService.addCredential(id, validation.data)
      return apiSuccess(credential, undefined, 201)
    } catch (error) {
      logger.error('Create cockpit credential error', error, { module: 'CockpitAPI' })
      return apiError('CREATE_FAILED', 'Failed to create credential', 500)
    }
  })
}
