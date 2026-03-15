import { NextRequest } from 'next/server'
import { apiSuccess, parsePaginationParams } from '@/lib/utils/api-response'
import { MediaUploadService } from '@/lib/services/media-upload.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'blog', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePaginationParams(searchParams)
    const result = await MediaUploadService.list(auth.tenantId, { page, limit })
    return apiSuccess(result.items, result.meta)
  })
}
