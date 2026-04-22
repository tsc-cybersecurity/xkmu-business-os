import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { UserService } from '@/lib/services/user.service'
import { CompanyService } from '@/lib/services/company.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

const createSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('password'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(10, 'Passwort muss mindestens 10 Zeichen lang sein'),
  }),
  z.object({
    method: z.literal('invite'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
  }),
])

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'create', async () => {
    const { id: companyId } = await params
    try {
      const company = await CompanyService.getById(companyId)
      if (!company) return apiNotFound('Firma nicht gefunden')

      const body = await request.json()
      const validation = validateAndParse(createSchema, body)
      if (!validation.success) {
        return apiError('VALIDATION_ERROR', 'Ungültige Eingabe', 400)
      }
      const data = validation.data

      const user = await UserService.createPortalUser({
        companyId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        method: data.method,
        password: data.method === 'password' ? data.password : undefined,
      })

      // Queue invite email only for invite flow
      if (data.method === 'invite' && user.inviteToken) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const inviteUrl = `${baseUrl}/portal/accept-invite?token=${user.inviteToken}`
        const org = await OrganizationService.getById()
        await TaskQueueService.create({
          type: 'email',
          priority: 1,
          payload: {
            templateSlug: 'portal_invite',
            to: user.email,
            placeholders: {
              name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
              firma: company.name,
              inviteUrl,
              absender: org?.name || 'Ihr Team',
            },
          },
          referenceType: 'company',
          referenceId: companyId,
        })
        logger.info(`Invite queued for ${user.email} (company=${companyId})`, { module: 'PortalUsersAPI' })
      }

      logger.info(`Portal user created via API: ${user.email} (company=${companyId}, method=${data.method})`, { module: 'PortalUsersAPI' })

      return apiSuccess({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        companyId: user.companyId,
        firstLoginAt: user.firstLoginAt,
        hasPendingInvite: !!user.inviteToken,
      }, undefined, 201)
    } catch (error) {
      logger.error('Failed to create portal user', error, { module: 'PortalUsersAPI' })
      const msg = error instanceof Error ? error.message : 'Anlegen fehlgeschlagen'
      return apiError('CREATE_FAILED', msg, 400)
    }
  })
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'read', async () => {
    const { id: companyId } = await params
    try {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          status: users.status,
          firstLoginAt: users.firstLoginAt,
          inviteTokenExpiresAt: users.inviteTokenExpiresAt,
          inviteToken: users.inviteToken,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(eq(users.companyId, companyId), eq(users.role, 'portal_user')))
      return apiSuccess(rows.map(({ inviteToken, ...rest }) => ({
        ...rest,
        hasPendingInvite: !!inviteToken,
      })))
    } catch (error) {
      logger.error('Failed to list portal users', error, { module: 'PortalUsersAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden', 500)
    }
  })
}
