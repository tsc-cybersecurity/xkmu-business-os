import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiError,
} from '@/lib/utils/api-response'
import {
  createCourseLessonSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CourseLessonService, CourseLessonError } from '@/lib/services/course-lesson.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(createCourseLessonSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const lesson = await CourseLessonService.create(id, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(lesson, undefined, 201)
    } catch (err) {
      if (err instanceof CourseLessonError && err.code === 'SLUG_CONFLICT') {
        return apiError('SLUG_CONFLICT', err.message, 409)
      }
      logger.error('Lesson create failed', err, { module: 'CourseLessonsAPI' })
      return apiServerError()
    }
  })
}
