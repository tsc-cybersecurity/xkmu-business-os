import { NextRequest } from 'next/server'
import { apiSuccess,
  apiNotFound,
  apiServerError,
} from '@/lib/utils/api-response'
import { BusinessDocumentService } from '@/lib/services/business-document.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'business_intelligence', 'read', async (auth) => {
    const { id } = await params
    const doc = await BusinessDocumentService.getById(id)
    if (!doc) return apiNotFound('Dokument nicht gefunden')
    return apiSuccess(doc)
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'business_intelligence', 'delete', async (auth) => {
    try {
      const { id } = await params
      const deleted = await BusinessDocumentService.delete(id)
      if (!deleted) return apiNotFound('Dokument nicht gefunden')
      return apiSuccess({ deleted: true })
    } catch (error) {
      logger.error('Error deleting business document', error, { module: 'BusinessIntelligenceDocumentsAPI' })
      return apiServerError()
    }
  })
}
