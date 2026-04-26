import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { reorderLessonsSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonService } from '@/lib/services/course-lesson.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(reorderLessonsSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      await CourseLessonService.reorder(id, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ reordered: v.data.length })
    } catch (err) {
      logger.error('Lesson reorder failed', err, { module: 'CourseLessonsAPI' })
      return apiServerError()
    }
  })
}
