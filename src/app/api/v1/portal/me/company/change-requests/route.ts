import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { CompanyChangeRequestService } from '@/lib/services/company-change-request.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const rows = await CompanyChangeRequestService.list({
        companyId: auth.companyId,
        requestedBy: auth.userId,
        limit: 50,
      })
      return apiSuccess(rows)
    } catch (error) {
      logger.error('Failed to list own change requests', error, { module: 'PortalChangeRequestAPI' })
      return apiError('LIST_FAILED', 'Anträge konnten nicht geladen werden', 500)
    }
  })
}
