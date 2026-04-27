import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/utils/api-response'
import { CourseCertificateService } from '@/lib/services/course-certificate.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async (auth) => {
    if (!auth.userId) return apiUnauthorized()
    try {
      const { id: courseId } = await ctx.params
      const cert = await CourseCertificateService.getForUserCourse(auth.userId, courseId)
      return apiSuccess(cert)
    } catch (err) {
      logger.error('Certificate status failed', err, { module: 'CertificateAPI' })
      return apiServerError()
    }
  })
}
