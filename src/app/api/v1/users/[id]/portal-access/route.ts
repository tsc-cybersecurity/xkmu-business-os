import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { UserService } from '@/lib/services/user.service'
import { CompanyService } from '@/lib/services/company.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

const patchSchema = z.object({
  action: z.enum(['deactivate', 'reactivate', 'resend_invite']),
})

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'update', async () => {
    const { id } = await params
    try {
      const body = await request.json()
      const validation = validateAndParse(patchSchema, body)
      if (!validation.success) {
        return apiError('VALIDATION_ERROR', 'Ungültige Aktion', 400)
      }

      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!user) return apiNotFound('User nicht gefunden')
      if (user.role !== 'portal_user') {
        return apiError('FORBIDDEN', 'User ist kein Portal-Nutzer', 403)
      }

      const action = validation.data.action

      if (action === 'deactivate') {
        await db.update(users)
          .set({ status: 'inactive', updatedAt: new Date() })
          .where(eq(users.id, id))
        logger.info(`Portal user deactivated: ${user.email}`, { module: 'PortalAccessAPI' })
        return apiSuccess({ status: 'inactive' })
      }

      if (action === 'reactivate') {
        await db.update(users)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(users.id, id))
        logger.info(`Portal user reactivated: ${user.email}`, { module: 'PortalAccessAPI' })
        return apiSuccess({ status: 'active' })
      }

      // resend_invite
      const updated = await UserService.regenerateInviteToken(id)
      if (!updated?.companyId || !updated.inviteToken) {
        return apiError('INVALID_STATE', 'User hat keine Firma oder kein Token', 400)
      }
      const company = await CompanyService.getById(updated.companyId)
      const org = await OrganizationService.getById()
      const baseUrl = await CmsDesignService.getAppUrl()
      const inviteUrl = `${baseUrl}/portal/accept-invite?token=${updated.inviteToken}`

      await TaskQueueService.create({
        type: 'email',
        priority: 1,
        payload: {
          templateSlug: 'portal_invite',
          to: updated.email,
          placeholders: {
            name: `${updated.firstName ?? ''} ${updated.lastName ?? ''}`.trim(),
            firma: company?.name ?? 'Ihre Firma',
            inviteUrl,
            absender: org?.name || 'Ihr Team',
          },
        },
        referenceType: 'company',
        referenceId: updated.companyId,
      })
      logger.info(`Invite resent to ${updated.email} (company=${updated.companyId})`, { module: 'PortalAccessAPI' })
      return apiSuccess({ resent: true })
    } catch (error) {
      logger.error('portal-access PATCH error', error, { module: 'PortalAccessAPI' })
      const msg = error instanceof Error ? error.message : 'Fehler'
      return apiError('INTERNAL_ERROR', msg, 500)
    }
  })
}
