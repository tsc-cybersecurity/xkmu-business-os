import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CourseAccessService } from '@/lib/services/course-access.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; grantId: string }> }

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id, grantId } = await ctx.params
      await CourseAccessService.remove(id, grantId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ removed: true })
    } catch (err) {
      logger.error('Course access remove failed', err, { module: 'CourseAccessAPI' })
      return apiServerError()
    }
  })
}
