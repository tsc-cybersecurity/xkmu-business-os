import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CourseCertificateService } from '@/lib/services/course-certificate.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

const ALLOWED_STATUS = new Set(['requested', 'issued', 'rejected', 'revoked'])

export async function GET(request: NextRequest) {
  return withPermission(request, 'users', 'update', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') ?? 'requested'
      if (!ALLOWED_STATUS.has(status)) {
        return apiSuccess([])
      }
      const rows = await CourseCertificateService.listByStatus(
        status as 'requested' | 'issued' | 'rejected' | 'revoked',
      )
      return apiSuccess(rows)
    } catch (err) {
      logger.error('Cert requests list failed', err, { module: 'CertificateAdminAPI' })
      return apiServerError()
    }
  })
}
