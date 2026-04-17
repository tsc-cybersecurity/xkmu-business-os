import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { updateDocumentItemSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { DocumentService } from '@/lib/services/document.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
type Params = Promise<{ id: string; itemId: string }>

// PUT /api/v1/documents/[id]/items/[itemId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id, itemId } = await params

    try {
      const body = await request.json()
      const validation = validateAndParse(updateDocumentItemSchema, body)

      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const item = await DocumentService.updateItem(id, itemId, validation.data)

      if (!item) {
        return apiNotFound('Position nicht gefunden')
      }

      return apiSuccess(item)
    } catch (error) {
      logger.error('Failed to update document item', error, { module: 'DocumentsItemsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Aktualisieren der Position', 500)
    }
  })
}

// DELETE /api/v1/documents/[id]/items/[itemId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id, itemId } = await params

    const deleted = await DocumentService.removeItem(id, itemId)

    if (!deleted) {
      return apiNotFound('Position nicht gefunden')
    }

    return apiSuccess({ message: 'Position erfolgreich entfernt' })
  })
}
