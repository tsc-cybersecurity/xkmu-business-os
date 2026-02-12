import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { DocumentService } from '@/lib/services/document.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

// POST /api/v1/documents/[id]/convert - Convert offer to invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    const { id } = await params

    try {
      const invoice = await DocumentService.convertOfferToInvoice(
        auth.tenantId,
        id,
        auth.userId || undefined
      )

      if (!invoice) {
        return apiNotFound('Angebot nicht gefunden')
      }

      return apiSuccess(invoice, undefined, 201)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fehler bei der Umwandlung'
      console.error('Failed to convert offer to invoice:', error)
      return apiError('VALIDATION_ERROR', message, 400)
    }
  })
}
