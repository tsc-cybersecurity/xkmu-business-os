import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { MediaUploadService } from '@/lib/services/media-upload.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function POST(request: NextRequest) {
  return withPermission(request, 'blog', 'create', async (auth) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return apiError('VALIDATION_ERROR', 'Keine Datei hochgeladen', 400)
      }

      const upload = await MediaUploadService.upload(file, auth.userId ?? undefined)
      return apiSuccess(upload, undefined, 201)
    } catch (error) {
      if (error instanceof Error) {
        return apiError('UPLOAD_ERROR', error.message, 400)
      }
      logger.error('Error uploading file', error, { module: 'MediaUploadAPI' })
      return apiServerError()
    }
  })
}
