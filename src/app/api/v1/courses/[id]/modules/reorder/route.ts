import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { reorderItemsSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseModuleService } from '@/lib/services/course-module.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(reorderItemsSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      await CourseModuleService.reorder(id, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ reordered: v.data.length })
    } catch (err) {
      logger.error('Module reorder failed', err, { module: 'CourseModulesAPI' })
      return apiServerError()
    }
  })
}
