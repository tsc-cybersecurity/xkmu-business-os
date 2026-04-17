import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateDocumentStatusSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { DocumentService } from '@/lib/services/document.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

// PUT /api/v1/documents/[id]/status
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()
      const validation = validateAndParse(updateDocumentStatusSchema, body)

      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const document = await DocumentService.updateStatus(TENANT_ID, id, validation.data.status)

      if (!document) {
        return apiNotFound('Dokument nicht gefunden')
      }

      return apiSuccess(document)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fehler beim Statuswechsel'
      logger.error('Failed to update document status', error, { module: 'DocumentsStatusAPI' })
      return apiError('VALIDATION_ERROR', message, 400)
    }
  })
}
