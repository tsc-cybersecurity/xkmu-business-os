import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
} from '@/lib/utils/api-response'
import { createDocumentItemSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { DocumentService } from '@/lib/services/document.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
type Params = Promise<{ id: string }>

// GET /api/v1/documents/[id]/items
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const { id } = await params

    try {
      const items = await DocumentService.getItems(id)
      return apiSuccess(items)
    } catch (error) {
      logger.error('Failed to get document items', error, { module: 'DocumentsItemsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Positionen', 500)
    }
  })
}

// POST /api/v1/documents/[id]/items
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()
      const validation = validateAndParse(createDocumentItemSchema, body)

      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const item = await DocumentService.addItem(id, validation.data)
      return apiSuccess(item, undefined, 201)
    } catch (error) {
      logger.error('Failed to add document item', error, { module: 'DocumentsItemsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Hinzufügen der Position', 500)
    }
  })
}
