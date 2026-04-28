import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  upsertQuizQuestionSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CourseQuizService, CourseQuizError } from '@/lib/services/course-quiz.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx {
  params: Promise<{ id: string; lessonId: string; questionId: string }>
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { questionId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(upsertQuizQuestionSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const row = await CourseQuizService.updateQuestion(questionId, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(row)
    } catch (err) {
      if (err instanceof CourseQuizError && err.code === 'VALIDATION') {
        return apiError(err.code, err.message, 400)
      }
      if (err instanceof CourseQuizError && err.code === 'NOT_FOUND') return apiNotFound(err.message)
      logger.error('Quiz question update failed', err, { module: 'CourseQuizAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { questionId } = await ctx.params
      await CourseQuizService.deleteQuestion(questionId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('Quiz question delete failed', err, { module: 'CourseQuizAPI' })
      return apiServerError()
    }
  })
}
