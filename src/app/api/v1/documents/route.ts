import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { createDocumentSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { DocumentService } from '@/lib/services/document.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
// GET /api/v1/documents - List documents with filters
export async function GET(request: NextRequest) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const pagination = parsePaginationParams(searchParams)
      const filters = {
        ...pagination,
        type: searchParams.get('type') || undefined,
        status: searchParams.get('status') || undefined,
        companyId: searchParams.get('companyId') || undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
        search: searchParams.get('search') || undefined,
      }

      const result = await DocumentService.list(filters)
      return apiSuccess(result.items, result.meta)
    } catch (error) {
      logger.error('Failed to list documents', error, { module: 'DocumentsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Dokumente', 500)
    }
  })
}

// POST /api/v1/documents - Create document
export async function POST(request: NextRequest) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createDocumentSchema, body)

      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const document = await DocumentService.create(validation.data,
        auth.userId || undefined
      )
      return apiSuccess(document, undefined, 201)
    } catch (error) {
      logger.error('Failed to create document', error, { module: 'DocumentsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen des Dokuments', 500)
    }
  })
}
