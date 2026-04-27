import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { createLessonBlockSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonBlockService } from '@/lib/services/course-lesson-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    try {
      const { lessonId } = await ctx.params
      const blocks = await CourseLessonBlockService.listByLesson(lessonId, { includeHidden: true })
      return apiSuccess(blocks)
    } catch (err) {
      logger.error('Block list failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(createLessonBlockSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const block = await CourseLessonBlockService.create(lessonId, v.data,
        { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(block, undefined, 201)
    } catch (err) {
      logger.error('Block create failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}
