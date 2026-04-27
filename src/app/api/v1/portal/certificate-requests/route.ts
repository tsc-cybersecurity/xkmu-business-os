import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CourseCertificateService } from '@/lib/services/course-certificate.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'users', 'update', async () => {
    try {
      const rows = await CourseCertificateService.listPending()
      return apiSuccess(rows)
    } catch (err) {
      logger.error('Pending cert requests failed', err, { module: 'CertificateAdminAPI' })
      return apiServerError()
    }
  })
}
