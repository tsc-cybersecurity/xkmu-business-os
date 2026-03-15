import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiForbidden,
  apiNotFound,
} from '@/lib/utils/api-response'
import {
  updateUserSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { UserService } from '@/lib/services/user.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'users', 'read', async (auth) => {
    const { id } = await params
    const user = await UserService.getById(auth.tenantId, id)

    if (!user) {
      return apiNotFound('User not found')
    }

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user

    return apiSuccess(userWithoutPassword)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'users', 'update', async (auth) => {
    const { id } = await params

    // Users can update themselves
    const isSelf = auth.userId === id
    const isAdmin = ['owner', 'admin'].includes(auth.role)

    if (!isSelf && !isAdmin) {
      return apiForbidden('Insufficient permissions')
    }

    try {
      const body = await request.json()

      const validation = validateAndParse(updateUserSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      // Non-admins cannot change their own role
      if (!isAdmin && validation.data.role) {
        return apiForbidden('Cannot change your own role')
      }

      // Check if email already exists
      if (validation.data.email) {
        const emailExists = await UserService.emailExists(
          auth.tenantId,
          validation.data.email,
          id
        )
        if (emailExists) {
          return apiError('EMAIL_EXISTS', 'Email already in use', 400)
        }
      }

      const user = await UserService.update(
        auth.tenantId,
        id,
        validation.data
      )

      if (!user) {
        return apiNotFound('User not found')
      }

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user

      return apiSuccess(userWithoutPassword)
    } catch (error) {
      logger.error('Update user error', error, { module: 'UsersAPI' })
      return apiError('UPDATE_FAILED', 'Failed to update user', 500)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'users', 'delete', async (auth) => {
    const { id } = await params

    // Cannot delete yourself
    if (auth.userId === id) {
      return apiError('CANNOT_DELETE_SELF', 'Cannot delete your own account', 400)
    }

    const deleted = await UserService.delete(auth.tenantId, id)

    if (!deleted) {
      return apiNotFound('User not found')
    }

    return apiSuccess({ message: 'User deleted successfully' })
  })
}
