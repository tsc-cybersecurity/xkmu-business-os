import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { OrderCategoryService } from '@/lib/services/order-category.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async () => {
    try {
      const categories = await OrderCategoryService.list(true)
      // Portal-safe projection (no description needed, UI just wants id/name/slug/color)
      return apiSuccess(categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        color: c.color,
      })))
    } catch (error) {
      logger.error('Failed to list portal order categories', error, { module: 'PortalOrdersAPI' })
      return apiError('LIST_FAILED', 'Kategorien konnten nicht geladen werden', 500)
    }
  })
}
