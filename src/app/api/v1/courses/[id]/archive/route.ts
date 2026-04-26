import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiNotFound } from '@/lib/utils/api-response'
import { CourseService, CourseError } from '@/lib/services/course.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const updated = await CourseService.archive(id, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(updated)
    } catch (err) {
      if (err instanceof CourseError && err.code === 'NOT_FOUND') return apiNotFound(err.message)
      logger.error('Course archive failed', err, { module: 'CoursesAPI' })
      return apiServerError()
    }
  })
}
