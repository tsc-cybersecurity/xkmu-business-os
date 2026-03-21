import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, parsePaginationParams } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { ImageGenerationService } from '@/lib/services/ai/image-generation.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'media', 'read', async (auth) => {
    try {
      const { searchParams } = new URL(request.url)
      const pagination = parsePaginationParams(searchParams)
      const category = searchParams.get('category') || undefined
      const search = searchParams.get('search') || undefined

      const result = await ImageGenerationService.list(auth.tenantId, {
        ...pagination,
        category,
        search,
      })

      return apiSuccess(result.items, result.meta)
    } catch (error) {
      logger.error('Failed to list generated images', error, { module: 'ImagesAPI' })
      return apiServerError()
    }
  })
}
