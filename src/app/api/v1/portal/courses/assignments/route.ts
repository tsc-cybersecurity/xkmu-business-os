import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/utils/api-response'
import { CourseAssignmentService } from '@/lib/services/course-assignment.service'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'

export async function GET(_request: NextRequest) {
  const session = await getSession()
  if (!session?.user.id) return apiUnauthorized()
  try {
    const list = await CourseAssignmentService.listForUser(session.user.id)
    return apiSuccess(list)
  } catch (err) {
    logger.error('Portal assignment list failed', err, { module: 'CourseAssignmentAPI' })
    return apiServerError()
  }
}
