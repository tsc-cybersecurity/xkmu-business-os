import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  createUserGroupSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { UserGroupService } from '@/lib/services/user-group.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'users', 'read', async () => {
    try {
      const groups = await UserGroupService.list()
      return apiSuccess(groups)
    } catch (err) {
      logger.error('User group list failed', err, { module: 'UserGroupAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'users', 'create', async (auth) => {
    try {
      const body = await request.json()
      const v = validateAndParse(createUserGroupSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const group = await UserGroupService.create(v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(group, undefined, 201)
    } catch (err) {
      logger.error('User group create failed', err, { module: 'UserGroupAPI' })
      return apiServerError()
    }
  })
}
