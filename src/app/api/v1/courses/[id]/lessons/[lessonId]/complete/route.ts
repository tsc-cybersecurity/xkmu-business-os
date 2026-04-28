import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/utils/api-response'
import { CourseLessonProgressService } from '@/lib/services/course-lesson-progress.service'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function POST(_request: NextRequest, ctx: Ctx) {
  const session = await getSession()
  if (!session?.user.id) return apiUnauthorized()
  try {
    const { id: courseId, lessonId } = await ctx.params
    const row = await CourseLessonProgressService.markCompleted(session.user.id, courseId, lessonId)
    return apiSuccess(row)
  } catch (err) {
    logger.error('Lesson complete failed', err, { module: 'CourseLessonProgressAPI' })
    return apiServerError()
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await getSession()
  if (!session?.user.id) return apiUnauthorized()
  try {
    const { lessonId } = await ctx.params
    await CourseLessonProgressService.markUncompleted(session.user.id, lessonId)
    return apiSuccess({ uncompleted: true })
  } catch (err) {
    logger.error('Lesson uncomplete failed', err, { module: 'CourseLessonProgressAPI' })
    return apiServerError()
  }
}
