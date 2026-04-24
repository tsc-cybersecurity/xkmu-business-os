import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { PortalDocumentCategoryService } from '@/lib/services/portal-document-category.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id } = await params
    try {
      const body = await request.json()
      const v = validateAndParse(patchSchema, body)
      if (!v.success) return apiError('VALIDATION_ERROR', 'Ungültige Eingabe', 400)

      const updated = await PortalDocumentCategoryService.update(id, v.data)
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'portal_document_category.updated',
        entityType: 'portal_document_category',
        entityId: id,
        payload: { changes: v.data },
        request,
      })
      return apiSuccess(updated)
    } catch (error) {
      logger.error('update portal doc category failed', error, { module: 'PortalDocCategoriesAPI' })
      const msg = error instanceof Error ? error.message : 'Fehler'
      const code = /system/i.test(msg) ? 403 : 400
      return apiError(code === 403 ? 'FORBIDDEN' : 'UPDATE_FAILED', msg, code)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'delete', async (auth) => {
    const { id } = await params
    try {
      await PortalDocumentCategoryService.softDelete(id)
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'portal_document_category.deleted',
        entityType: 'portal_document_category',
        entityId: id,
        request,
      })
      return apiSuccess({ deleted: true })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fehler'
      if (/nicht gefunden/i.test(msg)) return apiNotFound(msg)
      if (/system/i.test(msg)) return apiError('FORBIDDEN', msg, 403)
      if (/aktive|referenz/i.test(msg)) return apiError('CONFLICT', msg, 409)
      logger.error('delete portal doc category failed', error, { module: 'PortalDocCategoriesAPI' })
      return apiError('DELETE_FAILED', msg, 400)
    }
  })
}
