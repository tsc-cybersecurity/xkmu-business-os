import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { CmsBlockService } from '@/lib/services/cms-block.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'create', async (auth) => {
    try {
      const { id } = await params
      const block = await CmsBlockService.duplicate(auth.tenantId, id)
      if (!block) return apiNotFound('Block nicht gefunden')
      return apiSuccess(block, undefined, 201)
    } catch (error) {
      console.error('Error duplicating CMS block:', error)
      return apiServerError()
    }
  })
}
