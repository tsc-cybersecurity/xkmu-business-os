import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
} from '@/lib/utils/api-response'
import { createRoleSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { RoleService } from '@/lib/services/role.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function GET(request: NextRequest) {
  return withPermission(request, 'roles', 'read', async (auth) => {
    const roles = await RoleService.list()
    const userCounts = await RoleService.countUsersPerRole()

    const rolesWithCounts = roles.map((role) => ({
      ...role,
      userCount: userCounts[role.id] ?? 0,
    }))

    return apiSuccess(rolesWithCounts)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'roles', 'create', async (auth) => {
    try {
      const body = await request.json()

      const validation = validateAndParse(createRoleSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      // Pruefen ob Name bereits existiert
      const existing = await RoleService.getByName(validation.data.name
      )
      if (existing) {
        return apiError(
          'DUPLICATE_ROLE',
          `Rolle "${validation.data.name}" existiert bereits`,
          409
        )
      }

      const role = await RoleService.create(validation.data)

      return apiSuccess(role, undefined, 201)
    } catch (error) {
      logger.error('Create role error', error, { module: 'RolesAPI' })
      return apiError('CREATE_FAILED', 'Rolle konnte nicht erstellt werden', 500)
    }
  })
}
