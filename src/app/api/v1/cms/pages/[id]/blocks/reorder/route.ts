import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  reorderCmsBlocksSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { CmsBlockService } from '@/lib/services/cms-block.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'cms', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(reorderCmsBlocksSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      await CmsBlockService.reorder(auth.tenantId, id, validation.data.blockIds)
      return apiSuccess({ reordered: true })
    } catch (error) {
      console.error('Error reordering CMS blocks:', error)
      return apiServerError()
    }
  })
}
