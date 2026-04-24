import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { PortalDocumentService } from '@/lib/services/portal-document.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string; docId: string }>

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'documents', 'delete', async (auth) => {
    const { id: companyId, docId } = await params
    try {
      const doc = await PortalDocumentService.getById(docId)
      if (!doc || doc.companyId !== companyId || doc.deletedAt) {
        return apiNotFound('Dokument nicht gefunden')
      }
      const deleted = await PortalDocumentService.softDelete({
        documentId: docId, actorUserId: auth.userId!, actorRole: 'admin',
      })
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'portal_document.deleted',
        entityType: 'portal_document',
        entityId: docId,
        payload: { fileName: deleted.fileName, direction: deleted.direction, deletedByRole: 'admin' },
        request,
      })
      return apiSuccess({ deleted: true })
    } catch (error) {
      logger.error('admin delete portal document failed', error, { module: 'AdminPortalDocsAPI' })
      return apiError('DELETE_FAILED', error instanceof Error ? error.message : 'Fehler', 400)
    }
  })
}
