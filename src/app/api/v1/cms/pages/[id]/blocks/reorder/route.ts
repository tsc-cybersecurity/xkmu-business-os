import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import { reorderCmsBlocksSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CmsBlockService } from '@/lib/services/cms-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(reorderCmsBlocksSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      await CmsBlockService.reorder(id, validation.data.blockIds)
      return apiSuccess({ reordered: true })
    } catch (error) {
      logger.error('Error reordering CMS blocks', error, { module: 'CmsPagesBlocksReorderAPI' })
      return apiServerError()
    }
  })
}
