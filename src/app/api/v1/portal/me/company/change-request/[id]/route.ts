import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { CompanyChangeRequestService } from '@/lib/services/company-change-request.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPortalAuth(request, async (auth) => {
    const { id } = await params
    try {
      const ok = await CompanyChangeRequestService.cancel(id, auth.userId)
      if (!ok) {
        return apiNotFound('Antrag nicht gefunden oder nicht stornierbar')
      }

      // Audit (fail-safe)
      try {
        await AuditLogService.log({
          userId: auth.userId,
          userRole: 'portal_user',
          action: 'portal.company_change_request_cancelled',
          entityType: 'company_change_request',
          entityId: id,
          payload: { companyId: auth.companyId },
          request,
        })
      } catch (err) {
        logger.error('Audit write failed for company_change_request_cancelled', err, { module: 'PortalChangeRequestAPI' })
      }

      return apiSuccess({ cancelled: true })
    } catch (error) {
      logger.error('Failed to cancel change request', error, { module: 'PortalChangeRequestAPI' })
      return apiError('CANCEL_FAILED', 'Antrag konnte nicht storniert werden', 500)
    }
  })
}
