import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { DocumentService } from '@/lib/services/document.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

// POST /api/v1/documents/[id]/convert - Convert document (offer→invoice, contract→offer/invoice)
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'documents', 'create', async (auth) => {
    const { id } = await params

    try {
      // Fetch the source document to determine its type
      const document = await DocumentService.getById(auth.tenantId, id)
      if (!document) {
        return apiNotFound('Dokument nicht gefunden')
      }

      if (document.type === 'contract') {
        // Contract conversion: requires targetType in request body
        const body = await request.json()
        const { targetType } = body

        if (!targetType || !['offer', 'invoice'].includes(targetType)) {
          return apiError('VALIDATION_ERROR', 'targetType muss offer oder invoice sein', 400)
        }

        const result = await DocumentService.convertContractToDocument(
          auth.tenantId,
          id,
          targetType as 'offer' | 'invoice',
          auth.userId || undefined
        )

        if (!result) {
          return apiNotFound('Vertrag nicht gefunden')
        }

        return apiSuccess(result, undefined, 201)
      } else if (document.type === 'offer') {
        // Existing offer-to-invoice conversion
        const invoice = await DocumentService.convertOfferToInvoice(
          auth.tenantId,
          id,
          auth.userId || undefined
        )

        if (!invoice) {
          return apiNotFound('Angebot nicht gefunden')
        }

        return apiSuccess(invoice, undefined, 201)
      } else {
        return apiError('VALIDATION_ERROR', `Dokumenttyp '${document.type}' kann nicht umgewandelt werden`, 400)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fehler bei der Umwandlung'
      logger.error('Failed to convert document', error, { module: 'DocumentsConvertAPI' })
      return apiError('VALIDATION_ERROR', message, 400)
    }
  })
}
