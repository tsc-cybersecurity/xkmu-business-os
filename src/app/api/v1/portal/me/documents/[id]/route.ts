import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { rateLimit } from '@/lib/utils/rate-limit'
import { PortalDocumentService } from '@/lib/services/portal-document.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const limited = await rateLimit(request, 'portal-docs-delete', 30, 3600_000)
  if (limited) return limited

  return withPortalAuth(request, async (auth) => {
    const { id } = await params
    try {
      const doc = await PortalDocumentService.getById(id)
      if (!doc || doc.companyId !== auth.companyId || doc.deletedAt) {
        return apiNotFound('Dokument nicht gefunden')
      }
      const deleted = await PortalDocumentService.softDelete({
        documentId: id, actorUserId: auth.userId, actorRole: 'portal_user',
      })
      await AuditLogService.log({
        userId: auth.userId,
        userRole: 'portal_user',
        action: 'portal_document.deleted',
        entityType: 'portal_document',
        entityId: id,
        payload: { fileName: deleted.fileName, direction: deleted.direction },
        request,
      })
      return apiSuccess({ deleted: true })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fehler'
      if (/eigene|berechtigt/i.test(msg)) return apiError('FORBIDDEN', msg, 403)
      logger.error('delete portal document failed', error, { module: 'PortalDocumentsAPI' })
      return apiError('DELETE_FAILED', msg, 400)
    }
  })
}
