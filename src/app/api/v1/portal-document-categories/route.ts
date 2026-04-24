import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { PortalDocumentCategoryService } from '@/lib/services/portal-document-category.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  direction: z.enum(['admin_to_portal', 'portal_to_admin', 'both']),
  sortOrder: z.number().int().optional(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'documents', 'read', async () => {
    try {
      const rows = await PortalDocumentCategoryService.listActive('any')
      return apiSuccess(rows)
    } catch (error) {
      logger.error('list portal doc categories failed', error, { module: 'PortalDocCategoriesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden', 500)
    }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    try {
      const body = await request.json()
      const v = validateAndParse(createSchema, body)
      if (!v.success) return apiError('VALIDATION_ERROR', 'Ungültige Eingabe', 400)

      const created = await PortalDocumentCategoryService.create(v.data)
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'portal_document_category.created',
        entityType: 'portal_document_category',
        entityId: created.id,
        payload: { name: created.name, direction: created.direction },
        request,
      })
      return apiSuccess(created, undefined, 201)
    } catch (error) {
      logger.error('create portal doc category failed', error, { module: 'PortalDocCategoriesAPI' })
      const msg = error instanceof Error ? error.message : 'Fehler'
      return apiError('CREATE_FAILED', msg, 400)
    }
  })
}
