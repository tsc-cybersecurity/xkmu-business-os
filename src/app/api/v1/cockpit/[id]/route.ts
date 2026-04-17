import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateCockpitSystemSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CockpitService } from '@/lib/services/cockpit.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'cockpit', 'read', async (auth) => {
    const { id } = await params
    const system = await CockpitService.getById(TENANT_ID, id)

    if (!system) {
      return apiNotFound('System not found')
    }

    return apiSuccess(system)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'cockpit', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()

      const validation = validateAndParse(updateCockpitSystemSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const system = await CockpitService.update(TENANT_ID, id, validation.data)

      if (!system) {
        return apiNotFound('System not found')
      }

      return apiSuccess(system)
    } catch (error) {
      logger.error('Update cockpit system error', error, { module: 'CockpitAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update cockpit system', 500)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'cockpit', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await CockpitService.delete(TENANT_ID, id)

    if (!deleted) {
      return apiNotFound('System not found')
    }

    return apiSuccess({ message: 'System deleted successfully' })
  })
}
