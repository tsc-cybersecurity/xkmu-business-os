import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { CmsBlockService } from '@/lib/services/cms-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

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
      logger.error('Error duplicating CMS block', error, { module: 'CmsBlocksDuplicateAPI' })
      return apiServerError()
    }
  })
}
