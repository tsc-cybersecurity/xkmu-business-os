import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  updateUserGroupSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { UserGroupService, UserGroupError } from '@/lib/services/user-group.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'users', 'read', async () => {
    try {
      const { id } = await ctx.params
      const group = await UserGroupService.getById(id)
      if (!group) return apiNotFound(`Gruppe ${id} nicht gefunden`)
      const members = await UserGroupService.listMembers(id)
      return apiSuccess({ ...group, members })
    } catch (err) {
      logger.error('User group get failed', err, { module: 'UserGroupAPI' })
      return apiServerError()
    }
  })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'users', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(updateUserGroupSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const group = await UserGroupService.update(id, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(group)
    } catch (err) {
      if (err instanceof UserGroupError && err.code === 'NOT_FOUND') return apiNotFound(err.message)
      logger.error('User group update failed', err, { module: 'UserGroupAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'users', 'delete', async (auth) => {
    try {
      const { id } = await ctx.params
      await UserGroupService.delete(id, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('User group delete failed', err, { module: 'UserGroupAPI' })
      return apiServerError()
    }
  })
}
