import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { CompanyChangeRequestService } from '@/lib/services/company-change-request.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'update', async (auth) => {
    const { id } = await params
    if (!auth.userId) {
      return apiError('FORBIDDEN', 'API-Key darf keine Anträge genehmigen', 403)
    }
    try {
      // Load first so we can capture proposedChanges + companyId BEFORE mutation for audit
      const existing = await CompanyChangeRequestService.getById(id)
      if (!existing) return apiNotFound('Antrag nicht gefunden')

      const updated = await CompanyChangeRequestService.approve(id, auth.userId)

      // Audit (fail-safe)
      try {
        await AuditLogService.log({
          userId: auth.userId,
          userRole: auth.role,
          action: 'admin.company_change_request.approved',
          entityType: 'company_change_request',
          entityId: id,
          payload: { companyId: existing.companyId, appliedDiff: existing.proposedChanges },
          request,
        })
      } catch (err) {
        logger.error('Audit write failed for change_request.approved', err, { module: 'AdminChangeRequestAPI' })
      }

      return apiSuccess({ id: updated.id, status: updated.status, reviewedAt: updated.reviewedAt })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') return apiNotFound('Antrag nicht gefunden')
        if (error.message === 'NOT_PENDING') return apiError('NOT_PENDING', 'Antrag ist nicht mehr offen', 409)
      }
      logger.error('Failed to approve change request', error, { module: 'AdminChangeRequestAPI' })
      return apiError('APPROVE_FAILED', 'Antrag konnte nicht genehmigt werden', 500)
    }
  })
}
