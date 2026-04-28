import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { UserGroupService } from '@/lib/services/user-group.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; userId: string }> }

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'users', 'update', async (auth) => {
    try {
      const { id, userId } = await ctx.params
      await UserGroupService.removeMember(id, userId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ removed: true })
    } catch (err) {
      logger.error('User group member remove failed', err, { module: 'UserGroupAPI' })
      return apiServerError()
    }
  })
}
