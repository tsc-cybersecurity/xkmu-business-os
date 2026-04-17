import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { ImageGenerationService } from '@/lib/services/ai/image-generation.service'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'media', 'read', async (auth) => {
    try {
      const { id } = await params
      const image = await ImageGenerationService.getById(TENANT_ID, id)
      if (!image) return apiNotFound('Bild nicht gefunden')
      return apiSuccess(image)
    } catch (error) {
      logger.error('Failed to get image', error, { module: 'ImagesAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'media', 'delete', async (auth) => {
    try {
      const { id } = await params
      const deleted = await ImageGenerationService.delete(TENANT_ID, id)
      if (!deleted) return apiNotFound('Bild nicht gefunden')
      return apiSuccess({ deleted: true })
    } catch (error) {
      logger.error('Failed to delete image', error, { module: 'ImagesAPI' })
      return apiServerError()
    }
  })
}
