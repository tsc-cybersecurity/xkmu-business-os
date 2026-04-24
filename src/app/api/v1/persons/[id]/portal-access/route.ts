import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { PersonService } from '@/lib/services/person.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { CompanyService } from '@/lib/services/company.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

const schema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('password'),
    password: z.string().min(10, 'Passwort muss mindestens 10 Zeichen lang sein'),
  }),
  z.object({
    method: z.literal('invite'),
  }),
])

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'create', async (auth) => {
    const { id } = await params
    try {
      const body = await request.json()
      const v = validateAndParse(schema, body)
      if (!v.success) return apiError('VALIDATION_ERROR', 'Ungültige Eingabe', 400)

      const result = await PersonService.createPortalAccess(id, {
        method: v.data.method,
        password: v.data.method === 'password' ? v.data.password : undefined,
      })

      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'person.portal_access_created',
        entityType: 'person',
        entityId: id,
        payload: { userId: result.user.id, method: v.data.method },
        request,
      })

      // Invite-Mail queueing (fail-safe)
      if (v.data.method === 'invite' && result.user.inviteToken) {
        try {
          const company = await CompanyService.getById(result.user.companyId!)
          const org = await OrganizationService.getById()
          const baseUrl = await CmsDesignService.getAppUrl()
          const inviteUrl = `${baseUrl}/portal/accept-invite?token=${result.user.inviteToken}`
          await TaskQueueService.create({
            type: 'email',
            priority: 1,
            payload: {
              templateSlug: 'portal_invite',
              to: result.user.email,
              placeholders: {
                name: `${result.user.firstName ?? ''} ${result.user.lastName ?? ''}`.trim() || result.user.email,
                firma: company?.name || 'Ihre Firma',
                inviteUrl,
                absender: org?.name || 'Ihr Team',
              },
            },
            referenceType: 'person',
            referenceId: id,
          })
        } catch (err) {
          logger.error('Invite email queue failed (portal-access proceeds)', err, { module: 'PersonPortalAccessAPI' })
        }
      }

      return apiSuccess({
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          status: result.user.status,
          firstLoginAt: result.user.firstLoginAt,
          hasPendingInvite: !!result.user.inviteToken,
        },
        personId: result.person.id,
      }, undefined, 201)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fehler'
      if (/nicht gefunden/i.test(msg)) return apiError('NOT_FOUND', msg, 404)
      if (/bereits/i.test(msg)) return apiError('CONFLICT', msg, 409)
      if (/ohne Firma|ohne E-Mail/i.test(msg)) return apiError('VALIDATION_ERROR', msg, 400)
      logger.error('createPortalAccess failed', error, { module: 'PersonPortalAccessAPI' })
      return apiError('INTERNAL_ERROR', msg, 500)
    }
  })
}
