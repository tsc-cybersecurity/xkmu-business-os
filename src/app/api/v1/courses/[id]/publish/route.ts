import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CoursePublishService, PublishValidationError } from '@/lib/services/course-publish.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const updated = await CoursePublishService.publish(id, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(updated)
    } catch (err) {
      if (err instanceof PublishValidationError) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'PUBLISH_VALIDATION', message: err.message, details: err.details },
          },
          { status: 422 },
        )
      }
      logger.error('Course publish failed', err, { module: 'CoursesPublishAPI' })
      return apiServerError()
    }
  })
}
