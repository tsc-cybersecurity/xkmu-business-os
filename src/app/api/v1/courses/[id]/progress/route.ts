import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/utils/api-response'
import { CourseLessonProgressService } from '@/lib/services/course-lesson-progress.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async (auth) => {
    if (!auth.userId) return apiUnauthorized()
    try {
      const { id: courseId } = await ctx.params
      const [completedLessonIds, summary] = await Promise.all([
        CourseLessonProgressService.listForCourse(auth.userId, courseId),
        CourseLessonProgressService.getCourseProgress(auth.userId, courseId),
      ])
      return apiSuccess({ completedLessonIds, summary })
    } catch (err) {
      logger.error('Course progress fetch failed', err, { module: 'CourseLessonProgressAPI' })
      return apiServerError()
    }
  })
}
