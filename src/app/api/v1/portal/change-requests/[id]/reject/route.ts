import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiNotFound, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { CompanyChangeRequestService } from '@/lib/services/company-change-request.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

const rejectSchema = z.object({
  reviewComment: z.string().min(1, 'Kommentar erforderlich').max(1000),
})

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'update', async (auth) => {
    const { id } = await params
    if (!auth.userId) {
      return apiError('FORBIDDEN', 'API-Key darf keine Anträge ablehnen', 403)
    }
    try {
      const body = await request.json()
      const validation = validateAndParse(rejectSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const existing = await CompanyChangeRequestService.getById(id)
      if (!existing) return apiNotFound('Antrag nicht gefunden')

      const updated = await CompanyChangeRequestService.reject(id, auth.userId, validation.data.reviewComment)

      try {
        await AuditLogService.log({
          userId: auth.userId,
          userRole: auth.role,
          action: 'admin.company_change_request.rejected',
          entityType: 'company_change_request',
          entityId: id,
          payload: { companyId: existing.companyId, reviewComment: validation.data.reviewComment },
          request,
        })
      } catch (err) {
        logger.error('Audit write failed for change_request.rejected', err, { module: 'AdminChangeRequestAPI' })
      }

      return apiSuccess({
        id: updated.id,
        status: updated.status,
        reviewComment: updated.reviewComment,
        reviewedAt: updated.reviewedAt,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') return apiNotFound('Antrag nicht gefunden')
        if (error.message === 'NOT_PENDING') return apiError('NOT_PENDING', 'Antrag ist nicht mehr offen', 409)
      }
      logger.error('Failed to reject change request', error, { module: 'AdminChangeRequestAPI' })
      return apiError('REJECT_FAILED', 'Antrag konnte nicht abgelehnt werden', 500)
    }
  })
}
