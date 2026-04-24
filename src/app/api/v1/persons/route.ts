import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess,
  apiValidationError,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { createPersonSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { PersonService } from '@/lib/services/person.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { db } from '@/lib/db'
import { users, persons } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AuditLogService } from '@/lib/services/audit-log.service'

export async function GET(request: NextRequest) {
  return withPermission(request, 'persons', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const companyId = searchParams.get('companyId') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined

    const result = await PersonService.list({
      ...pagination,
      companyId,
      status,
      search,
      tags,
    })

    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'persons', 'create', async (auth) => {
    try {
      const body = await request.json()

      const createPersonWithOptionalPortalLinkSchema = createPersonSchema.extend({
        portalUserId: z.string().uuid().optional(),
      })

      const validation = validateAndParse(createPersonWithOptionalPortalLinkSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      // If portalUserId provided: validate the user exists, is portal_user, matches companyId, and is not already linked
      if (validation.data.portalUserId) {
        const [linkUser] = await db.select().from(users)
          .where(eq(users.id, validation.data.portalUserId))
          .limit(1)
        if (!linkUser) {
          return apiError('VALIDATION_ERROR', 'Portal-User nicht gefunden', 400)
        }
        if (linkUser.role !== 'portal_user') {
          return apiError('VALIDATION_ERROR', 'User ist kein Portal-User', 400)
        }
        if (linkUser.companyId !== validation.data.companyId) {
          return apiError('VALIDATION_ERROR', 'Portal-User gehört nicht zu dieser Firma', 400)
        }
        const [existingLink] = await db.select({ id: persons.id }).from(persons)
          .where(eq(persons.portalUserId, validation.data.portalUserId))
          .limit(1)
        if (existingLink) {
          return apiError('VALIDATION_ERROR', 'Portal-User ist bereits mit einer Person verknüpft', 400)
        }
      }

      const person = await PersonService.create(validation.data,
        auth.userId || undefined
      )

      if (validation.data.portalUserId) {
        const [updated] = await db.update(persons)
          .set({ portalUserId: validation.data.portalUserId, updatedAt: new Date() })
          .where(eq(persons.id, person.id))
          .returning()
        await AuditLogService.log({
          userId: auth.userId,
          userRole: auth.role,
          action: 'person.portal_access_linked',
          entityType: 'person',
          entityId: person.id,
          payload: { userId: validation.data.portalUserId },
          request,
        })
        return apiSuccess(updated, undefined, 201)
      }

      return apiSuccess(person, undefined, 201)
    } catch (error) {
      logger.error('Create person error', error, { module: 'PersonsAPI' })
      return apiError('CREATE_FAILED', 'Failed to create person', 500)
    }
  })
}
