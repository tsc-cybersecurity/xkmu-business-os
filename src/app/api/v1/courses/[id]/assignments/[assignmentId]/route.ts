import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CourseAssignmentService } from '@/lib/services/course-assignment.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; assignmentId: string }> }

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id, assignmentId } = await ctx.params
      await CourseAssignmentService.unassign(id, assignmentId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ removed: true })
    } catch (err) {
      logger.error('Course assignment remove failed', err, { module: 'CourseAssignmentAPI' })
      return apiServerError()
    }
  })
}
