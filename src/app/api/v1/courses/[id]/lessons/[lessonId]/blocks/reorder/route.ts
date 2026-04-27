import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { reorderLessonBlocksSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonBlockService } from '@/lib/services/course-lesson-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(reorderLessonBlocksSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      await CourseLessonBlockService.reorder(lessonId, v.data,
        { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ reordered: v.data.length })
    } catch (err) {
      logger.error('Block reorder failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}
