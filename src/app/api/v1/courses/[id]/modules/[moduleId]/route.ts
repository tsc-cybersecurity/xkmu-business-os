import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiNotFound,
} from '@/lib/utils/api-response'
import {
  updateCourseModuleSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CourseModuleService, CourseModuleError } from '@/lib/services/course-module.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; moduleId: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { moduleId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(updateCourseModuleSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const mod = await CourseModuleService.update(moduleId, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(mod)
    } catch (err) {
      if (err instanceof CourseModuleError && err.code === 'NOT_FOUND') {
        return apiNotFound(err.message)
      }
      logger.error('Module update failed', err, { module: 'CourseModulesAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { moduleId } = await ctx.params
      await CourseModuleService.delete(moduleId, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('Module delete failed', err, { module: 'CourseModulesAPI' })
      return apiServerError()
    }
  })
}
