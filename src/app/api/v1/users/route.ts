import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
  apiValidationError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createUserSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { UserService } from '@/lib/services/user.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'users', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const role = searchParams.get('role') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const result = await UserService.list(auth.tenantId, {
      ...pagination,
      role,
      status,
      search,
    })

    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'users', 'create', async (auth) => {
    try {
      const body = await request.json()

      const validation = validateAndParse(createUserSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      // Check if email already exists
      const emailExists = await UserService.emailExists(
        auth.tenantId,
        validation.data.email
      )
      if (emailExists) {
        return apiError('EMAIL_EXISTS', 'Email already in use', 400)
      }

      const user = await UserService.create(auth.tenantId, validation.data)

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user

      return apiSuccess(userWithoutPassword, undefined, 201)
    } catch (error) {
      console.error('Create user error:', error)
      return apiError('CREATE_FAILED', 'Failed to create user', 500)
    }
  })
}
