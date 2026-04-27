import { NextRequest } from 'next/server'
import {
  apiSuccess, apiValidationError, apiServerError, apiNotFound,
} from '@/lib/utils/api-response'
import { updateLessonBlockSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonBlockService, CourseLessonBlockError } from '@/lib/services/course-lesson-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string; blockId: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { blockId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(updateLessonBlockSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const block = await CourseLessonBlockService.update(blockId, v.data,
        { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(block)
    } catch (err) {
      if (err instanceof CourseLessonBlockError && err.code === 'NOT_FOUND') {
        return apiNotFound(err.message)
      }
      logger.error('Block update failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { blockId } = await ctx.params
      await CourseLessonBlockService.delete(blockId,
        { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ deleted: true })
    } catch (err) {
      if (err instanceof CourseLessonBlockError && err.code === 'NOT_FOUND') {
        return apiNotFound(err.message)
      }
      logger.error('Block delete failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}
