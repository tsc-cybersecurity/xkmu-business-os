import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/utils/api-response'
import { CourseLessonProgressService } from '@/lib/services/course-lesson-progress.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    if (!auth.userId) return apiUnauthorized()
    try {
      const { id: courseId, lessonId } = await ctx.params
      const row = await CourseLessonProgressService.markCompleted(auth.userId, courseId, lessonId)
      return apiSuccess(row)
    } catch (err) {
      logger.error('Lesson complete failed', err, { module: 'CourseLessonProgressAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    if (!auth.userId) return apiUnauthorized()
    try {
      const { lessonId } = await ctx.params
      await CourseLessonProgressService.markUncompleted(auth.userId, lessonId)
      return apiSuccess({ uncompleted: true })
    } catch (err) {
      logger.error('Lesson uncomplete failed', err, { module: 'CourseLessonProgressAPI' })
      return apiServerError()
    }
  })
}
