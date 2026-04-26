import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { createCourseSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseService, CourseError } from '@/lib/services/course.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'courses', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const result = await CourseService.list({
      page: pagination.page,
      limit: pagination.limit,
      status: searchParams.get('status') || undefined,
      visibility: searchParams.get('visibility') || undefined,
      q: searchParams.get('q') || undefined,
    })
    return apiSuccess(result.items, {
      total: result.total,
      page: pagination.page,
      limit: pagination.limit,
    })
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'courses', 'create', async (auth) => {
    try {
      const body = await request.json()
      const v = validateAndParse(createCourseSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const course = await CourseService.create(v.data, {
        userId: auth.userId,
        userRole: auth.role ?? null,
      })
      return apiSuccess(course, undefined, 201)
    } catch (err) {
      if (err instanceof CourseError && err.code === 'SLUG_CONFLICT') {
        return apiError('SLUG_CONFLICT', err.message, 409)
      }
      logger.error('Course create failed', err, { module: 'CoursesAPI' })
      return apiServerError()
    }
  })
}
