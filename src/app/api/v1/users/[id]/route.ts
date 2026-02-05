import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from '@/lib/utils/api-response'
import {
  updateUserSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { UserService } from '@/lib/services/user.service'
import { getSession } from '@/lib/auth/session'

type Params = Promise<{ id: string }>

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const session = await getSession()
  if (!session) {
    return apiUnauthorized()
  }

  const { id } = await params
  const user = await UserService.getById(session.user.tenantId, id)

  if (!user) {
    return apiNotFound('User not found')
  }

  // Remove password hash from response
  const { passwordHash: _, ...userWithoutPassword } = user

  return apiSuccess(userWithoutPassword)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const session = await getSession()
  if (!session) {
    return apiUnauthorized()
  }

  const { id } = await params

  // Only admin/owner can update other users, users can update themselves
  const isSelf = session.user.id === id
  const isAdmin = ['owner', 'admin'].includes(session.user.role)

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
        session.user.tenantId,
        validation.data.email,
        id
      )
      if (emailExists) {
        return apiError('EMAIL_EXISTS', 'Email already in use', 400)
      }
    }

    const user = await UserService.update(
      session.user.tenantId,
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
    console.error('Update user error:', error)
    return apiError('UPDATE_FAILED', 'Failed to update user', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const session = await getSession()
  if (!session) {
    return apiUnauthorized()
  }

  const { id } = await params

  // Only admin and owner can delete users
  if (!['owner', 'admin'].includes(session.user.role)) {
    return apiForbidden('Insufficient permissions')
  }

  // Cannot delete yourself
  if (session.user.id === id) {
    return apiError('CANNOT_DELETE_SELF', 'Cannot delete your own account', 400)
  }

  const deleted = await UserService.delete(session.user.tenantId, id)

  if (!deleted) {
    return apiNotFound('User not found')
  }

  return apiSuccess({ message: 'User deleted successfully' })
}
