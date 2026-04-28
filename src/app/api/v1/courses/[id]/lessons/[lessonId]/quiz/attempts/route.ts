import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiUnauthorized,
  apiError,
} from '@/lib/utils/api-response'
import {
  submitQuizAttemptSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CourseQuizService, CourseQuizError } from '@/lib/services/course-quiz.service'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  const session = await getSession()
  if (!session?.user.id) return apiUnauthorized()
  try {
    const { lessonId } = await ctx.params
    const body = await request.json()
    const v = validateAndParse(submitQuizAttemptSchema, body)
    if (!v.success) return apiValidationError(formatZodErrors(v.errors))
    const result = await CourseQuizService.submitAttempt(lessonId, session.user.id, v.data.answers)
    return apiSuccess({
      score: result.attempt.score,
      passed: result.attempt.passed,
      perQuestion: result.perQuestion,
      attemptId: result.attempt.id,
    })
  } catch (err) {
    if (err instanceof CourseQuizError && (err.code === 'NO_RETAKE' || err.code === 'EMPTY_QUIZ' || err.code === 'NO_QUIZ' || err.code === 'LESSON_NOT_FOUND')) {
      return apiError(err.code, err.message, 409)
    }
    logger.error('Quiz attempt submit failed', err, { module: 'CourseQuizAPI' })
    return apiServerError()
  }
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const session = await getSession()
  if (!session?.user.id) return apiUnauthorized()
  try {
    const { lessonId } = await ctx.params
    const quiz = await CourseQuizService.getByLessonId(lessonId)
    if (!quiz) return apiSuccess([])
    const attempts = await CourseQuizService.listAttemptsForUser(quiz.id, session.user.id)
    return apiSuccess(attempts)
  } catch (err) {
    logger.error('Quiz attempts list failed', err, { module: 'CourseQuizAPI' })
    return apiServerError()
  }
}
