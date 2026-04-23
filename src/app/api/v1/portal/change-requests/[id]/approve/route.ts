import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { CompanyChangeRequestService } from '@/lib/services/company-change-request.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { CompanyService } from '@/lib/services/company.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
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

      // Decision email to requester (fail-safe)
      if (existing.requestedBy) {
        try {
          const [requester] = await db
            .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, existing.requestedBy))
            .limit(1)
          if (requester?.email) {
            const [org, company] = await Promise.all([
              OrganizationService.getById(),
              CompanyService.getById(existing.companyId),
            ])
            const baseUrl = await CmsDesignService.getAppUrl()
            await TaskQueueService.create({
              type: 'email',
              priority: 2,
              payload: {
                templateSlug: 'portal_change_request_decision',
                to: requester.email,
                placeholders: {
                  name: `${requester.firstName ?? ''} ${requester.lastName ?? ''}`.trim() || requester.email,
                  firma: company?.name ?? 'Ihre Firma',
                  datum: new Date(existing.requestedAt).toLocaleDateString('de-DE'),
                  entscheidung: 'genehmigt',
                  kommentarBlock: '',
                  portalUrl: `${baseUrl}/portal`,
                  absender: org?.name ?? 'Ihr Team',
                },
              },
              referenceType: 'company_change_request',
              referenceId: id,
            })
          }
        } catch (err) {
          logger.error('Decision email (approve) queue failed', err, { module: 'AdminChangeRequestAPI' })
        }
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
