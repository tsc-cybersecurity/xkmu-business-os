import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateCourseLessonSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CourseLessonService, CourseLessonError } from '@/lib/services/course-lesson.service'
import { CourseAssetService } from '@/lib/services/course-asset.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    const { lessonId } = await ctx.params
    const lesson = await CourseLessonService.get(lessonId)
    if (!lesson) return apiNotFound(`Lektion ${lessonId} nicht gefunden`)
    const assets = await CourseAssetService.listByLesson(lessonId)
    return apiSuccess({ ...lesson, assets })
  })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(updateCourseLessonSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const lesson = await CourseLessonService.update(lessonId, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(lesson)
    } catch (err) {
      if (err instanceof CourseLessonError) {
        if (err.code === 'NOT_FOUND') return apiNotFound(err.message)
        if (err.code === 'SLUG_CONFLICT') return apiError('SLUG_CONFLICT', err.message, 409)
      }
      logger.error('Lesson update failed', err, { module: 'CourseLessonsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      await CourseLessonService.delete(lessonId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('Lesson delete failed', err, { module: 'CourseLessonsAPI' })
      return apiServerError()
    }
  })
}
