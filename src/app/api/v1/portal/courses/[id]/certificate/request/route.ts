import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized, apiServerError, apiError } from '@/lib/utils/api-response'
import { CourseCertificateService, CourseCertificateError } from '@/lib/services/course-certificate.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    if (!auth.userId) return apiUnauthorized()
    try {
      const { id: courseId } = await ctx.params
      const cert = await CourseCertificateService.requestCertificate(auth.userId, courseId)
      return apiSuccess(cert)
    } catch (err) {
      if (err instanceof CourseCertificateError && err.code === 'NOT_COMPLETE') {
        return apiError('NOT_COMPLETE', err.message, 422)
      }
      logger.error('Certificate request failed', err, { module: 'CertificateAPI' })
      return apiServerError()
    }
  })
}
