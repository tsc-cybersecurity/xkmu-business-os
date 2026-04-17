import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateRoleSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { RoleService } from '@/lib/services/role.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'roles', 'read', async (auth) => {
    const { id } = await params
    const role = await RoleService.getWithPermissions(TENANT_ID, id)

    if (!role) {
      return apiNotFound('Rolle nicht gefunden')
    }

    return apiSuccess(role)
  })
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'roles', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()

      const validation = validateAndParse(updateRoleSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const role = await RoleService.update(TENANT_ID, id, validation.data)

      if (!role) {
        return apiNotFound('Rolle nicht gefunden')
      }

      return apiSuccess(role)
    } catch (error) {
      logger.error('Update role error', error, { module: 'RolesAPI' })
      return apiError('UPDATE_FAILED', 'Rolle konnte nicht aktualisiert werden', 500)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withPermission(request, 'roles', 'delete', async (auth) => {
    const { id } = await params
    const role = await RoleService.getById(TENANT_ID, id)

    if (!role) {
      return apiNotFound('Rolle nicht gefunden')
    }

    if (role.isSystem) {
      return apiError(
        'SYSTEM_ROLE',
        'System-Rollen können nicht gelöscht werden',
        400
      )
    }

    const deleted = await RoleService.delete(TENANT_ID, id)

    if (!deleted) {
      return apiError('DELETE_FAILED', 'Rolle konnte nicht gelöscht werden', 500)
    }

    return apiSuccess({ deleted: true })
  })
}
