import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { CompanyChangeRequestService } from '@/lib/services/company-change-request.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { CompanyService } from '@/lib/services/company.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { logger } from '@/lib/utils/logger'

const changeableFields = z
  .object({
    legalForm: z.string().max(100).nullable().optional(),
    street: z.string().max(255).nullable().optional(),
    houseNumber: z.string().max(20).nullable().optional(),
    postalCode: z.string().max(20).nullable().optional(),
    city: z.string().max(255).nullable().optional(),
    country: z.string().max(10).nullable().optional(),
    phone: z.string().max(100).nullable().optional(),
    email: z.union([z.string().email().max(255), z.literal('')]).nullable().optional(),
    website: z.union([z.string().url().max(500), z.literal('')]).nullable().optional(),
    industry: z.string().max(100).nullable().optional(),
    vatId: z.string().max(50).nullable().optional(),
  })
  .strict()

const createSchema = z.object({
  proposedChanges: changeableFields.refine(
    (obj) => Object.keys(obj).length > 0,
    { message: 'Mindestens ein Feld muss geändert werden' },
  ),
})

export async function POST(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const created = await CompanyChangeRequestService.create({
        companyId: auth.companyId,
        requestedBy: auth.userId,
        proposedChanges: validation.data.proposedChanges,
      })

      // Audit (fail-safe)
      try {
        await AuditLogService.log({
          userId: auth.userId,
          userRole: 'portal_user',
          action: 'portal.company_change_requested',
          entityType: 'company_change_request',
          entityId: created.id,
          payload: { companyId: auth.companyId, proposedChanges: validation.data.proposedChanges },
          request,
        })
      } catch (err) {
        logger.error('Audit write failed for company_change_requested', err, { module: 'PortalChangeRequestAPI' })
      }

      // Admin notification email (fail-safe)
      try {
        const [org, company] = await Promise.all([
          OrganizationService.getById(),
          CompanyService.getById(auth.companyId),
        ])
        if (org?.email) {
          const baseUrl = await CmsDesignService.getAppUrl()
          const aenderungenText = Object.entries(validation.data.proposedChanges)
            .map(([k, v]) => `- ${k}: ${v === null ? '(geleert)' : v}`)
            .join('\n')
          await TaskQueueService.create({
            type: 'email',
            priority: 2,
            payload: {
              templateSlug: 'portal_change_request_admin',
              to: org.email,
              placeholders: {
                kunde: auth.email,
                firma: company?.name ?? 'Unbekannte Firma',
                datum: new Date().toLocaleDateString('de-DE'),
                aenderungen: aenderungenText,
                pruefUrl: `${baseUrl}/intern/portal/change-requests`,
              },
            },
            referenceType: 'company_change_request',
            referenceId: created.id,
          })
        } else {
          logger.warn('Admin notification skipped: no org email configured', { module: 'PortalChangeRequestAPI' })
        }
      } catch (err) {
        logger.error('Admin notification email queue failed', err, { module: 'PortalChangeRequestAPI' })
      }

      return apiSuccess(
        {
          id: created.id,
          status: created.status,
          requestedAt: created.requestedAt,
          proposedChanges: created.proposedChanges,
        },
        undefined,
        201,
      )
    } catch (error) {
      if (error instanceof Error && error.message === 'PENDING_REQUEST_EXISTS') {
        return apiError('PENDING_EXISTS', 'Es gibt bereits einen offenen Antrag für diese Firma', 409)
      }
      logger.error('Failed to create change request', error, { module: 'PortalChangeRequestAPI' })
      return apiError('CREATE_FAILED', 'Antrag konnte nicht erstellt werden', 500)
    }
  })
}
