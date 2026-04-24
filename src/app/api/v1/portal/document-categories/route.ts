import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { PortalDocumentCategoryService } from '@/lib/services/portal-document-category.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async () => {
    try {
      const url = new URL(request.url)
      const dirParam = url.searchParams.get('direction')
      if (dirParam && dirParam !== 'portal_to_admin') {
        return apiError('FORBIDDEN', 'Portal-User dürfen nur portal_to_admin-Kategorien listen', 403)
      }
      const rows = await PortalDocumentCategoryService.listForRoom('portal_to_admin')
      return apiSuccess(rows.map(r => ({
        id: r.id, name: r.name, direction: r.direction, sortOrder: r.sortOrder,
      })))
    } catch (error) {
      logger.error('portal document-categories failed', error, { module: 'PortalAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler', 500)
    }
  })
}
