import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  addUserGroupMemberSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { UserGroupService } from '@/lib/services/user-group.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'users', 'read', async () => {
    try {
      const { id } = await ctx.params
      const members = await UserGroupService.listMembers(id)
      return apiSuccess(members)
    } catch (err) {
      logger.error('User group members list failed', err, { module: 'UserGroupAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'users', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(addUserGroupMemberSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      await UserGroupService.addMember(id, v.data.userId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ added: true })
    } catch (err) {
      logger.error('User group member add failed', err, { module: 'UserGroupAPI' })
      return apiServerError()
    }
  })
}
