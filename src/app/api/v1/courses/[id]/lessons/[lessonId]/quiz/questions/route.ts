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

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(upsertQuizQuestionSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const quiz = await CourseQuizService.getByLessonId(lessonId)
      if (!quiz) return apiNotFound('Quiz für diese Lektion existiert noch nicht')
      const row = await CourseQuizService.addQuestion(quiz.id, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(row, undefined, 201)
    } catch (err) {
      if (err instanceof CourseQuizError && err.code === 'VALIDATION') {
        return apiError(err.code, err.message, 400)
      }
      logger.error('Quiz question add failed', err, { module: 'CourseQuizAPI' })
      return apiServerError()
    }
  })
}
