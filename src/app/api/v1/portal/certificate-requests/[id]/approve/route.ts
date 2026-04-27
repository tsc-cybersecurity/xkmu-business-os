import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized, apiNotFound, apiServerError, apiValidationError, apiError } from '@/lib/utils/api-response'
import { CourseCertificateService, CourseCertificateError } from '@/lib/services/course-certificate.service'
import { reviewCertificateSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'users', 'update', async (auth) => {
    if (!auth.userId) return apiUnauthorized()
    try {
      const { id: certificateId } = await ctx.params
      const body = await request.json().catch(() => ({}))
      const v = validateAndParse(reviewCertificateSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const cert = await CourseCertificateService.approve(certificateId, auth.userId, v.data.reviewComment)
      return apiSuccess(cert)
    } catch (err) {
      if (err instanceof CourseCertificateError) {
        if (err.code === 'NOT_FOUND') return apiNotFound(err.message)
        if (err.code === 'BAD_STATE') return apiError('BAD_STATE', err.message, 409)
      }
      logger.error('Certificate approve failed', err, { module: 'CertificateAdminAPI' })
      return apiServerError()
    }
  })
}
