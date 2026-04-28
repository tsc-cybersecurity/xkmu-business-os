import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiNotFound,
} from '@/lib/utils/api-response'
import {
  upsertQuizConfigSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CourseQuizService, CourseQuizError } from '@/lib/services/course-quiz.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    try {
      const { lessonId } = await ctx.params
      const result = await CourseQuizService.getWithQuestions(lessonId, 'author')
      if (!result) return apiSuccess(null)
      return apiSuccess(result)
    } catch (err) {
      logger.error('Quiz get failed', err, { module: 'CourseQuizAPI' })
      return apiServerError()
    }
  })
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(upsertQuizConfigSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const quiz = await CourseQuizService.upsertConfig(lessonId, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(quiz)
    } catch (err) {
      if (err instanceof CourseQuizError && err.code === 'LESSON_NOT_FOUND') return apiNotFound(err.message)
      logger.error('Quiz upsert failed', err, { module: 'CourseQuizAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      await CourseQuizService.deleteForLesson(lessonId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('Quiz delete failed', err, { module: 'CourseQuizAPI' })
      return apiServerError()
    }
  })
}
