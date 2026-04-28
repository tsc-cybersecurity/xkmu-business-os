import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiNotFound,
} from '@/lib/utils/api-response'
import {
  createCourseAccessGrantSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CourseAccessService, CourseAccessError } from '@/lib/services/course-access.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    try {
      const { id } = await ctx.params
      const grants = await CourseAccessService.listForCourse(id)
      return apiSuccess(grants)
    } catch (err) {
      logger.error('Course access list failed', err, { module: 'CourseAccessAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(createCourseAccessGrantSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const row = await CourseAccessService.add(id, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(row, undefined, 201)
    } catch (err) {
      if (err instanceof CourseAccessError && err.code === 'SUBJECT_NOT_FOUND') {
        return apiNotFound(err.message)
      }
      logger.error('Course access add failed', err, { module: 'CourseAccessAPI' })
      return apiServerError()
    }
  })
}
