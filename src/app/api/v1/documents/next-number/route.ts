import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { DocumentService } from '@/lib/services/document.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
// GET /api/v1/documents/next-number?type=invoice
export async function GET(request: NextRequest) {
  return withPermission(request, 'documents', 'read', async (auth) => {
    try {
      const type = request.nextUrl.searchParams.get('type') || 'invoice'
      if (type !== 'invoice' && type !== 'offer') {
        return apiError('VALIDATION_ERROR', 'Type muss "invoice" oder "offer" sein', 400)
      }

      const number = await DocumentService.getNextNumber(type)
      return apiSuccess({ number })
    } catch (error) {
      logger.error('Failed to get next number', error, { module: 'DocumentsNextNumberAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Ermitteln der nächsten Nummer', 500)
    }
  })
}
