import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import {
  updateDocumentSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { DocumentService } from '@/lib/services/document.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

// GET /api/v1/documents/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    const { id } = await params
    const document = await DocumentService.getById(auth.tenantId, id)

    if (!document) {
      return apiNotFound('Dokument nicht gefunden')
    }

    return apiSuccess(document)
  })
}

// PUT /api/v1/documents/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()
      const validation = validateAndParse(updateDocumentSchema, body)

      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const document = await DocumentService.update(auth.tenantId, id, validation.data)

      if (!document) {
        return apiNotFound('Dokument nicht gefunden')
      }

      return apiSuccess(document)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fehler beim Aktualisieren'
      console.error('Failed to update document:', error)
      return apiError('INTERNAL_ERROR', message, error instanceof Error && error.message.includes('Entwurf') ? 400 : 500)
    }
  })
}

// DELETE /api/v1/documents/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'delete', async (auth) => {
    const { id } = await params

    try {
      const deleted = await DocumentService.delete(auth.tenantId, id)

      if (!deleted) {
        return apiNotFound('Dokument nicht gefunden')
      }

      return apiSuccess({ message: 'Dokument erfolgreich gelöscht' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fehler beim Löschen'
      console.error('Failed to delete document:', error)
      return apiError('INTERNAL_ERROR', message, error instanceof Error && error.message.includes('Entwurf') ? 400 : 500)
    }
  })
}
