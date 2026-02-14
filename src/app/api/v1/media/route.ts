import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { MediaUploadService } from '@/lib/services/media-upload.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'blog', 'read', async (auth) => {
    const uploads = await MediaUploadService.list(auth.tenantId)
    return apiSuccess(uploads)
  })
}
