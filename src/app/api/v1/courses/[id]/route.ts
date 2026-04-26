import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { updateCourseSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseService, CourseError } from '@/lib/services/course.service'
import { CourseModuleService } from '@/lib/services/course-module.service'
import { CourseLessonService } from '@/lib/services/course-lesson.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    const { id } = await ctx.params
    const course = await CourseService.get(id)
    if (!course) return apiNotFound(`Kurs ${id} nicht gefunden`)
    const [modules, lessons] = await Promise.all([
      CourseModuleService.listByCourse(id),
      CourseLessonService.listByCourse(id),
    ])
    return apiSuccess({ ...course, modules, lessons })
  })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(updateCourseSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const updated = await CourseService.update(id, v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(updated)
    } catch (err) {
      if (err instanceof CourseError) {
        if (err.code === 'NOT_FOUND') return apiNotFound(err.message)
        if (err.code === 'SLUG_CONFLICT') return apiError('SLUG_CONFLICT', err.message, 409)
      }
      logger.error('Course update failed', err, { module: 'CoursesAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'delete', async (auth) => {
    try {
      const { id } = await ctx.params
      await CourseService.delete(id, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ deleted: true })
    } catch (err) {
      if (err instanceof CourseError && err.code === 'NOT_FOUND') return apiNotFound(err.message)
      logger.error('Course delete failed', err, { module: 'CoursesAPI' })
      return apiServerError()
    }
  })
}
