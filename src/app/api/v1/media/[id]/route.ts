import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound } from '@/lib/utils/api-response'
import { MediaUploadService } from '@/lib/services/media-upload.service'
import { withPermission } from '@/lib/auth/require-permission'
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'blog', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await MediaUploadService.delete(id)
    if (!deleted) return apiNotFound('Datei nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
