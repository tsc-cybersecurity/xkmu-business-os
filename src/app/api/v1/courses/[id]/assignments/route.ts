import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiNotFound,
} from '@/lib/utils/api-response'
import {
  createCourseAssignmentSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import {
  CourseAssignmentService,
  CourseAssignmentError,
} from '@/lib/services/course-assignment.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    try {
      const { id } = await ctx.params
      const rows = await CourseAssignmentService.listForCourse(id)
      return apiSuccess(rows)
    } catch (err) {
      logger.error('Course assignments list failed', err, { module: 'CourseAssignmentAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(createCourseAssignmentSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const dueDate = v.data.dueDate ? new Date(v.data.dueDate) : null
      const row = await CourseAssignmentService.assign(
        id,
        { subjectKind: v.data.subjectKind, subjectId: v.data.subjectId, dueDate },
        { userId: auth.userId, userRole: auth.role ?? null },
      )
      return apiSuccess(row, undefined, 201)
    } catch (err) {
      if (err instanceof CourseAssignmentError && err.code === 'SUBJECT_NOT_FOUND') {
        return apiNotFound(err.message)
      }
      logger.error('Course assignment add failed', err, { module: 'CourseAssignmentAPI' })
      return apiServerError()
    }
  })
}
